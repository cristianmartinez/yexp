# Expr Security Documentation

**Version:** 1.0
**Last Updated:** 2026-02-04
**Status:** Security Audit Completed

---

## Executive Summary

Expr is a sandboxed expression language designed with security as a core principle. However, like any code evaluation engine, it requires careful consideration of security implications when used in production environments.

**Current Security Status:**
- ✅ **No Arbitrary Code Execution** - Safe from `eval()` and `Function()` exploits
- ✅ **Sandboxed Context** - No access to global scope, Node.js APIs, or filesystem
- ⚠️ **Resource Exhaustion** - Vulnerable to DoS attacks via unbounded operations
- ⚠️ **Prototype Pollution** - Vulnerable to prototype pollution via object operations
- ✅ **Type Safety** - Strong runtime type checking prevents most type confusion attacks

---

## Threat Model

### What Expr Protects Against

1. **Arbitrary Code Execution** ✅
   - No `eval()`, `Function()`, or `new Function()` usage
   - All code runs through bytecode interpreter
   - Built-in functions are predefined and vetted

2. **Unauthorized System Access** ✅
   - No access to `process`, `require`, `import`, `fs`, `http`, etc.
   - No access to global scope (`window`, `global`, `globalThis`)
   - Execution context is strictly limited to `{state, data, env}`

3. **Path Traversal** ✅
   - Context paths are validated at compile time
   - No dynamic file system access
   - All data must be explicitly provided in execution context

### What Expr Does NOT Protect Against

1. **Denial of Service (DoS) Attacks** ⚠️
   - Unbounded recursion (e.g., `flatten` with deep nesting)
   - Memory exhaustion (e.g., `repeat(999999999)`)
   - CPU exhaustion via lambda bombs
   - No execution time limits
   - No instruction count limits

2. **Prototype Pollution** ⚠️
   - Object operations can modify `__proto__`, `constructor`, `prototype`
   - Affects shared runtime environment
   - Can bypass security checks in parent application

3. **Information Disclosure** ⚠️
   - Prototype chain exposure via `keys()`, `values()`, `entries()`
   - Access to internal JavaScript properties

---

## Vulnerability Catalog

### HIGH SEVERITY

#### V-001: Prototype Pollution via Object Operations

**CVSS Score:** 8.1 (High)
**Attack Vector:** Network
**Complexity:** Low

**Description:**
Attackers can pollute `Object.prototype` using object spread or `fromEntries()`, affecting all objects in the JavaScript runtime.

**Proof of Concept:**
```javascript
// Exploit 1: Via object spread
{...__proto__: {isAdmin: true}}

// Exploit 2: Via fromEntries
fromEntries([{key: "__proto__", value: {polluted: true}}])

// Result: ALL objects now have the polluted properties
const victim = {};
console.log(victim.isAdmin); // true (!)
```

**Impact:**
- Privilege escalation in multi-tenant environments
- Bypass of security checks
- Data corruption across application
- Potential for remote code execution in parent application

**Affected Functions:**
- Object spread in object literals: `{...obj}`
- `fromEntries(array)`
- `MAKE_OBJ` opcode in VM
- Object mutation via `state.x = {...malicious}`

**Mitigation:**
```typescript
// Filter dangerous keys before object operations
const DANGEROUS_KEYS = ['__proto__', 'constructor', 'prototype'];

function sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
  const safe: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    if (!DANGEROUS_KEYS.includes(key)) {
      safe[key] = obj[key];
    }
  }
  return safe;
}
```

**Test Case:** See `security.test.ts` - Exploits 1-4

---

#### V-002: Denial of Service via Unbounded Recursion

**CVSS Score:** 7.5 (High)
**Attack Vector:** Network
**Complexity:** Low

**Description:**
The `flatten()` function recursively processes nested arrays without depth limits, causing stack overflow.

**Proof of Concept:**
```javascript
// Create deeply nested array: [[[[1000 levels deep]]]]
const attack = /* 1000 nested arrays */;
data.attack |> flatten  // Stack overflow!

// Or with explicit depth
data.arr |> flatten(999999999)
```

**Impact:**
- Application crash
- Service unavailability
- Server restart required

**Affected Functions:**
- `flatten(array, depth?)` - Default depth is `Infinity`

**Mitigation:**
```typescript
const MAX_FLATTEN_DEPTH = 100;

if (d > MAX_FLATTEN_DEPTH) {
  return makeError('TYPE_ERROR',
    `flatten depth ${d} exceeds maximum of ${MAX_FLATTEN_DEPTH}`);
}
```

**Test Case:** See `security.test.ts` - Exploits 5-6

---

### MEDIUM SEVERITY

#### V-003: Memory Exhaustion via String Operations

**CVSS Score:** 6.5 (Medium)
**Attack Vector:** Network
**Complexity:** Low

**Description:**
String functions like `repeat()` and `padStart()` can allocate gigabytes of memory instantly.

**Proof of Concept:**
```javascript
// Allocate ~1GB instantly
"x" |> repeat(999999999)

// Pad string to huge size
"" |> padStart(999999999, "A")
```

**Impact:**
- Out-of-memory errors
- Application crash
- Service degradation for other users

**Affected Functions:**
- `repeat(string, count)`
- `padStart(string, length, fill)`
- `padEnd(string, length, fill)`

**Mitigation:**
```typescript
const MAX_REPEAT = 10_000;
const MAX_PAD_LENGTH = 10_000;

if (count > MAX_REPEAT) {
  return makeError('TYPE_ERROR',
    `repeat count ${count} exceeds maximum of ${MAX_REPEAT}`);
}
```

**Test Case:** See `security.test.ts` - Exploits 7-9

---

#### V-004: CPU Exhaustion via Lambda Bombs

**CVSS Score:** 6.5 (Medium)
**Attack Vector:** Network
**Complexity:** Low

**Description:**
Nested higher-order function calls can create exponential complexity, exhausting CPU resources.

**Proof of Concept:**
```javascript
// O(n²) complexity
data.items |> reduce((acc, x) =>
  data.items |> reduce((a, b) => [a, b], []),
[])

// O(n²) via nested map
data.items |> map((x) =>
  data.items |> map((y) => x + y)
) |> flatten
```

**Impact:**
- CPU exhaustion
- Request timeout
- Service degradation

**Affected Functions:**
- All higher-order functions: `map`, `filter`, `reduce`, `flatMap`, etc.
- Lambda invocation via `invokeLambda()`

**Mitigation:**
```typescript
const MAX_LAMBDA_DEPTH = 100;
const MAX_INSTRUCTIONS = 100_000;

// Track recursion depth
let lambdaDepth = 0;

function invokeLambda(lambda: LambdaValue, context: ExecutionContext, args: ExprValue[]): ExprValue {
  if (lambdaDepth++ > MAX_LAMBDA_DEPTH) {
    return makeError('EXECUTION_ERROR', 'Lambda recursion depth exceeded');
  }

  const result = evaluate(lambda.program, lambdaContext);
  lambdaDepth--;
  return result;
}
```

**Test Case:** See `security.test.ts` - Exploits 10-12

---

#### V-005: Property Injection via Introspection Functions

**CVSS Score:** 5.3 (Medium)
**Attack Vector:** Network
**Complexity:** Low

**Description:**
Functions like `keys()`, `values()`, and `entries()` expose prototype chain properties including `__proto__`, `constructor`.

**Proof of Concept:**
```javascript
// Expose internal properties
{__proto__: {secret: 1}} |> keys
// Returns: ["__proto__"]

// Access constructor
state.obj.constructor.prototype
```

**Impact:**
- Information disclosure
- Prototype chain exposure
- Preparation for further attacks

**Affected Functions:**
- `keys(object)`
- `values(object)`
- `entries(object)`
- Path resolution for special properties

**Mitigation:**
```typescript
// Filter out prototype chain properties
'keys',
(v) => {
  if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
    return Object.keys(v).filter(k =>
      !['__proto__', 'constructor', 'prototype'].includes(k)
    );
  }
  return makeError('TYPE_ERROR', 'keys requires an object');
}
```

**Test Case:** See `security.test.ts` - Exploits 13-15

---

### LOW SEVERITY

#### V-006: Array Index Edge Cases

**CVSS Score:** 3.1 (Low)
**Attack Vector:** Network
**Complexity:** High

**Description:**
Array indexing with floating point numbers, negative indices, or very large values may behave unexpectedly.

**Current Status:** Properly protected with bounds checking

**Test Case:** See `security.test.ts` - Exploits 16-18

---

## Security Best Practices

### For Developers Using Expr

#### 1. Validate Expression Sources

```typescript
// ✅ GOOD: Only allow trusted expression sources
const trustedExpression = loadFromDatabase(expressionId);
const program = compile(trustedExpression);

// ❌ BAD: Never compile user input directly without validation
const program = compile(req.body.expression); // Dangerous!
```

#### 2. Implement Execution Timeouts

```typescript
// Wrap evaluation with timeout
import { promiseWithTimeout } from './utils';

async function safeEvaluate(program, context, timeoutMs = 1000) {
  return promiseWithTimeout(
    () => evaluate(program, context),
    timeoutMs
  );
}
```

#### 3. Isolate Execution Contexts

```typescript
// ✅ GOOD: Create fresh context per evaluation
for (const user of users) {
  const context = {
    state: {},  // Fresh state
    data: { user },
    env: { timestamp: Date.now() }
  };
  evaluate(program, context);
}

// ❌ BAD: Reusing context can leak data
const sharedContext = { state: {}, data: {}, env: {} };
evaluate(program1, sharedContext); // State persists!
evaluate(program2, sharedContext); // Can access previous state
```

#### 4. Sanitize Data Before Passing to Context

```typescript
// Remove prototype pollution vectors from user data
function sanitizeData(data: unknown): unknown {
  if (typeof data !== 'object' || data === null) return data;

  if (Array.isArray(data)) {
    return data.map(sanitizeData);
  }

  const clean: Record<string, unknown> = {};
  for (const key of Object.keys(data)) {
    if (!['__proto__', 'constructor', 'prototype'].includes(key)) {
      clean[key] = sanitizeData(data[key]);
    }
  }
  return clean;
}

const context = {
  state: {},
  data: sanitizeData(userInput),  // Sanitize first!
  env: {}
};
```

#### 5. Limit Array and String Sizes

```typescript
// Validate input data sizes before evaluation
const MAX_ARRAY_SIZE = 10_000;
const MAX_STRING_LENGTH = 100_000;

function validateContext(context: ExecutionContext): void {
  // Check array sizes
  if (Array.isArray(context.data.items) &&
      context.data.items.length > MAX_ARRAY_SIZE) {
    throw new Error('Array too large');
  }

  // Check string lengths
  if (typeof context.data.text === 'string' &&
      context.data.text.length > MAX_STRING_LENGTH) {
    throw new Error('String too long');
  }
}
```

#### 6. Monitor Resource Usage

```typescript
// Track memory and CPU usage
const startMem = process.memoryUsage().heapUsed;
const startCpu = process.cpuUsage();

const result = evaluate(program, context);

const memDelta = process.memoryUsage().heapUsed - startMem;
const cpuDelta = process.cpuUsage(startCpu);

if (memDelta > 100_000_000) { // 100MB
  console.warn('Expression used excessive memory');
}
```

---

## Secure Configuration

### Recommended Limits

```typescript
// Add these as configuration options
export const SECURITY_LIMITS = {
  // Execution limits
  MAX_EXECUTION_TIME_MS: 1000,        // 1 second
  MAX_INSTRUCTIONS: 100_000,          // Bytecode instruction limit
  MAX_LAMBDA_DEPTH: 100,              // Lambda recursion depth

  // String limits
  MAX_STRING_LENGTH: 100_000,         // 100KB
  MAX_REPEAT: 10_000,                 // repeat() limit
  MAX_PAD_LENGTH: 10_000,             // padStart/padEnd limit

  // Array limits
  MAX_ARRAY_SIZE: 10_000,             // Array element count
  MAX_FLATTEN_DEPTH: 100,             // flatten() depth

  // Object limits
  MAX_OBJECT_KEYS: 1_000,             // Object key count
  MAX_OBJECT_DEPTH: 50,               // Nested object depth
};
```

---

## Security Roadmap

### Immediate (Q1 2026)

- [ ] **CRITICAL:** Fix prototype pollution in object operations
- [ ] **HIGH:** Add recursion depth limits to `flatten()`
- [ ] **HIGH:** Add count limits to `repeat()`, `padStart()`, `padEnd()`
- [ ] **MEDIUM:** Add lambda recursion depth tracking
- [ ] Add comprehensive security test suite

### Short Term (Q2 2026)

- [ ] Implement execution timeouts at VM level
- [ ] Add instruction count limits
- [ ] Add memory usage tracking and limits
- [ ] Filter dangerous keys in `keys()`, `values()`, `entries()`
- [ ] Add path validation to block `__proto__`, `constructor`, `prototype`

### Long Term (Q3-Q4 2026)

- [ ] Implement resource quotas (configurable per evaluation)
- [ ] Add execution context isolation (separate realm per eval)
- [ ] Security audit by third-party firm
- [ ] Fuzzing test suite for edge cases
- [ ] Rate limiting and throttling for expression execution
- [ ] Security-focused documentation and examples

---

## Reporting Security Vulnerabilities

If you discover a security vulnerability in Expr, please report it responsibly:

**Email:** security@jext.dev (if available)
**PGP Key:** [Include PGP key for encrypted communication]

**Please include:**
- Description of the vulnerability
- Steps to reproduce
- Proof of concept (if possible)
- Potential impact assessment
- Suggested fix (if available)

**Response Timeline:**
- Initial response: Within 24 hours
- Assessment: Within 1 week
- Fix development: Within 2 weeks (critical), 4 weeks (high), 8 weeks (medium)
- Disclosure: Coordinated disclosure 30 days after fix release

---

## Security Testing

### Running Security Tests

```bash
# Run full security test suite
bun test tests/security.test.ts

# Run specific vulnerability tests
bun test tests/security.test.ts -t "Prototype Pollution"

# Run with verbose output
bun test tests/security.test.ts --verbose
```

### Test Coverage

Current security test coverage:
- ✅ Prototype pollution vectors (4 tests)
- ✅ DoS via recursion (2 tests)
- ✅ Memory exhaustion (3 tests)
- ✅ Lambda bombs (3 tests)
- ✅ Property access vulnerabilities (3 tests)
- ✅ Type confusion attacks (3 tests)
- ✅ Injection prevention (3 tests)

**Total:** 21 security-focused tests

---

## Compliance and Standards

### OWASP Top 10 (2021)

| Risk | Status | Notes |
|------|--------|-------|
| A01: Broken Access Control | ✅ Mitigated | Sandboxed context prevents unauthorized access |
| A02: Cryptographic Failures | N/A | No cryptography in Expr |
| A03: Injection | ✅ Mitigated | No eval(), Function(), or dynamic code execution |
| A04: Insecure Design | ⚠️ Partial | Needs DoS protection |
| A05: Security Misconfiguration | ⚠️ Partial | Requires proper configuration by users |
| A06: Vulnerable Components | ✅ Mitigated | No external dependencies |
| A07: Auth/Identity Failures | N/A | No authentication in Expr |
| A08: Software/Data Integrity | ✅ Mitigated | Bytecode validation |
| A09: Security Logging Failures | ❌ Not Implemented | Add security event logging |
| A10: SSRF | ✅ Mitigated | No network access |

### CWE Coverage

- **CWE-94:** Code Injection - ✅ Mitigated
- **CWE-502:** Deserialization - ✅ Safe (JSON-based bytecode)
- **CWE-400:** Uncontrolled Resource Consumption - ⚠️ Vulnerable
- **CWE-1321:** Prototype Pollution - ⚠️ Vulnerable
- **CWE-20:** Improper Input Validation - ⚠️ Partial

---

## Conclusion

Expr provides strong sandboxing against arbitrary code execution and unauthorized system access. However, it requires additional hardening against resource exhaustion and prototype pollution attacks before being used in high-security production environments.

**Recommended Actions:**
1. Apply patches for prototype pollution (V-001)
2. Implement resource limits (V-002, V-003, V-004)
3. Add execution timeouts
4. Validate and sanitize all input data
5. Monitor resource usage in production
6. Keep Expr updated with security patches

**Risk Assessment:** Medium (with mitigations), High (without mitigations)

**Suitable For:**
- ✅ Trusted internal tools
- ✅ Admin dashboards (with authentication)
- ⚠️ Multi-tenant SaaS (with fixes applied)
- ❌ Public-facing untrusted input (without hardening)

---

**Document Version:** 1.0
**Last Review:** 2026-02-04
**Next Review:** 2026-05-04 (Quarterly)
