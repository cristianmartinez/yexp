# Recommendations for LLM-Friendly Yexp Design

Based on RALPH optimization analysis, here are language features that would reduce LLM errors:

---

## 🔴 Critical: Add Simple Sort Syntax

### Current (Lambda Only)
```javascript
data.items |> sort((a, b) => b.price - a.price)  // descending
data.items |> sort((a, b) => a.price - b.price)  // ascending
```

**Problems:**
- Verbose for simple cases
- LLMs consistently try to generate simpler syntax
- High cognitive load for non-programmers

### Proposed (Add Shorthand)
```javascript
// Simple cases (80% of sorts)
data.items |> sort(.price)    // ascending
data.items |> sort(-.price)   // descending

// Complex cases (20% of sorts)
data.items |> sort((a, b) => a.x/a.y - b.x/b.y)
```

**Benefits:**
- ✅ Matches LLM intuition (6/7 iterations generated this)
- ✅ Simpler for users
- ✅ Consistent with unary `-` operator
- ✅ Parallel to `.property` for other functions

**Implementation:**
```typescript
// Desugar during compilation:
sort(-.price)  →  sort((a, b) => b.price - a.price)
sort(.price)   →  sort((a, b) => a.price - b.price)
```

---

## 🟡 High Impact: Add Let Bindings

### Current (No Intermediate Values)
```javascript
data.items
  |> filter(.price > 100)
  |> map(.price * .qty)
  |> reduce((sum, x) => sum + x, 0)
```

**Problems:**
- Hard to debug
- Complex expressions are unreadable
- LLMs lose track of transformations

### Proposed
```javascript
let expensive = data.items |> filter(.price > 100)
let totals = expensive |> map(.price * .qty)
totals |> add
```

**Benefits:**
- ✅ Breaking point for debugging
- ✅ LLMs think sequentially (matches their generation)
- ✅ Readable for non-programmers
- ✅ Enables incremental validation

**Syntax:**
```javascript
let name = expression
let name = expression
result
```

---

## 🟡 High Impact: Add Type Hints in Context

### Current
```json
{
  "state": { "user": "object | null" }
}
```

**Problems:**
- LLMs can't infer property structure
- Leads to wrong property paths (6/7 iterations)

### Proposed
```json
{
  "state": {
    "user": {
      "type": "object | null",
      "shape": {
        "profile": {
          "settings": {
            "theme": "string"
          }
        }
      }
    }
  }
}
```

**Benefits:**
- ✅ LLMs can generate correct property paths
- ✅ Enables autocomplete
- ✅ Better error messages
- ✅ Type safety

**Alternative: TypeScript-style**
```typescript
interface Context {
  state: {
    user?: {
      profile?: {
        settings?: {
          theme?: string
        }
      }
    }
  }
}
```

---

## 🟢 Medium Impact: Add Default Operator

### Current (Verbose)
```javascript
state.user?.name ?? 'Guest'
state.user?.profile?.settings?.theme ?? 'light'
```

### Proposed (Add `default` keyword)
```javascript
state.user.name default 'Guest'
state.user.profile.settings.theme default 'light'
```

**Benefits:**
- ✅ More readable
- ✅ Matches natural language ("user name default Guest")
- ✅ Less symbol overload

**Trade-off:**
- ❌ Another keyword vs reusing `??`
- Consider: readability > symbol reuse for DSLs

---

## 🟢 Medium Impact: Add Property Path Templates

### Current
```javascript
// LLMs guess wrong property paths
state.user?.address?.city?.name  // wrong guess
state.user?.profile?.settings?.theme  // correct
```

### Proposed (Schema Registration)
```javascript
// In CLAUDE.md or schema definition:
@path theme: user.profile.settings.theme
@path email: user.profile.contact.email
@path city: user.address.city

// Then LLMs can reference:
"Get user theme" → state.user.theme  // auto-expands to full path
```

**Benefits:**
- ✅ Shorter expressions
- ✅ LLMs don't need to guess structure
- ✅ Decouples schema from expressions

---

## 🟢 Medium Impact: Word-Based Alternative Syntax

### Current (Symbol-Heavy)
```javascript
data.items |> filter(.price > 100) |> map(.name)
```

### Proposed (Optional Word-Based)
```javascript
data.items where .price > 100 select .name
// or
from data.items where .price > 100 select .name
```

**Benefits:**
- ✅ SQL-like (massive training data)
- ✅ Closer to natural language
- ✅ LLMs excel at SQL generation

**Trade-off:**
- Two syntaxes to support
- Consider: offer as alternative, compile to same bytecode

---

## 🟢 Low Impact: Named Pattern Library

### Current
```javascript
// Common patterns repeated everywhere
data.items |> filter(.active) |> sort(-.date) |> limit(10)
```

### Proposed
```javascript
// Define patterns:
pattern latest(n) = sort(-.date) |> limit(n)
pattern active = filter(.active)

// Use patterns:
data.items |> active |> latest(10)
```

**Benefits:**
- ✅ Reduces token count
- ✅ Reusable across expressions
- ✅ Domain-specific vocabularies

---

## 🔵 Low Impact: Enum Support

### Current
```javascript
state.theme == 'dark' || state.theme == 'light'
```

### Proposed
```javascript
// Define enum:
enum Theme { Light, Dark, Auto }

// Use:
state.theme in [Theme.Dark, Theme.Light]
// or
state.theme is Theme
```

**Benefits:**
- ✅ Type safety
- ✅ Better autocomplete
- ✅ Prevents typos

---

## Summary by Priority

### Implement Now (Highest ROI)

1. **Simple sort syntax** (`sort(-.price)`)
   - Impact: Fixes 6/7 test failures
   - Effort: Low (desugar to lambda)
   - Benefit: Huge reduction in LLM errors

2. **Type hints in context**
   - Impact: Fixes 6/7 property path failures
   - Effort: Medium (schema system)
   - Benefit: Correct property paths

### Consider for v2

3. **Let bindings**
   - Impact: Improves readability & debuggability
   - Effort: Medium (new statement type)
   - Benefit: Better for complex expressions

4. **SQL-like syntax** (alternative)
   - Impact: Leverages massive LLM SQL training
   - Effort: High (new parser)
   - Benefit: May drastically improve generation

### Future Ideas

5. Named patterns
6. Default operator (`default` keyword)
7. Enum support

---

## LLM-Friendly Design Principles

Based on RALPH analysis:

### ✅ DO:
1. **Provide multiple valid syntaxes** (simple + complex)
2. **Match natural language** where possible
3. **Show negative examples** ("Don't do X, do Y")
4. **Explicit schemas** over inference
5. **Words over symbols** when ambiguous

### ❌ DON'T:
1. **Force verbose syntax** for simple cases
2. **Rely on schema inference** from context
3. **Overload symbols** (`??` vs `||` vs `|>`)
4. **Hide type information** from LLMs
5. **Assume LLMs understand** domain conventions

---

## Implementation Roadmap

### Phase 1: Quick Wins (1-2 weeks)
- [ ] Add `sort(-.property)` syntax
- [ ] Update spec with syntax disambiguation
- [ ] Add schema hints to eval contexts
- [ ] Document "When to use" for all alternatives

### Phase 2: Type System (1 month)
- [ ] Add context schema format
- [ ] Implement type validation
- [ ] Generate autocomplete from schemas
- [ ] Better error messages with suggestions

### Phase 3: Advanced Features (2-3 months)
- [ ] Let bindings
- [ ] Pattern library
- [ ] SQL-like alternative syntax

### Phase 4: Tooling (ongoing)
- [ ] VSCode extension with autocomplete
- [ ] Schema generator from TypeScript
- [ ] RALPH-powered prompt optimizer
- [ ] Multi-model benchmark suite

---

## Testing Strategy

For each new feature:

1. **Add to eval dataset** with clear test cases
2. **Run RALPH optimization** to find edge cases
3. **Document failure patterns** in LEARNINGS.md
4. **Iterate prompt** until 95%+ pass rate
5. **Commit learnings** to spec as examples

This ensures every feature is LLM-validated before release.

---

## Example: Implementing Simple Sort

### 1. Update Spec

```markdown
## Sort Syntax

### Simple Property Sort

For sorting by a single property:
- **Ascending**: `sort(.property)`
- **Descending**: `sort(-.property)`

Examples:
```javascript
data.products |> sort(.name)      // A-Z
data.products |> sort(-.price)    // expensive first
data.logs |> sort(-.timestamp)    // newest first
```

### Lambda Sort (Complex)

For custom comparisons:
```javascript
// Custom calculation
data.items |> sort((a, b) => a.x/a.y - b.x/b.y)

// Multi-field
data.users |> sort((a, b) => a.role == 'admin' ? -1 : 1)
```

**When to use:**
- Simple property: Use `sort(.prop)` or `sort(-.prop)`
- Complex logic: Use lambda
```

### 2. Update Compiler

```typescript
// In parser.ts
function parseSort(expr: SortExpression): CompiledSort {
  if (expr.arg.type === 'UnaryMinus' && expr.arg.operand.type === 'Property') {
    // Desugar: sort(-.price) → sort((a,b) => b.price - a.price)
    return {
      type: 'Sort',
      comparator: createDescendingComparator(expr.arg.operand.name)
    };
  }
  if (expr.arg.type === 'Property') {
    // Desugar: sort(.price) → sort((a,b) => a.price - b.price)
    return {
      type: 'Sort',
      comparator: createAscendingComparator(expr.arg.name)
    };
  }
  // Lambda syntax
  return compileLambda(expr.arg);
}
```

### 3. Add Tests

```typescript
const sortTests = [
  {
    input: "Sort products by price ascending",
    expected: "data.products |> sort(.price)",
    context: { data: { products: "array<{price: number}>" } }
  },
  {
    input: "Sort products by price descending",
    expected: "data.products |> sort(-.price)",
    context: { data: { products: "array<{price: number}>" } }
  },
  {
    input: "Sort by efficiency ratio",
    expected: "data.items |> sort((a,b) => a.value/a.cost - b.value/b.cost)",
    context: { data: { items: "array<{value: number, cost: number}>" } }
  }
];
```

### 4. Run RALPH

```bash
bun run ralph
# Should now achieve 100% on sort tests
```

### 5. Document Learnings

Update LEARNINGS.md with:
- What syntax was confusing before
- How simple syntax improved pass rate
- Examples of edge cases discovered

---

## Conclusion

The single most impactful change: **Add `sort(-.property)` syntax**

This one feature would have prevented 85% of the sort-related failures across 7 RALPH iterations.

LLMs naturally generate this syntax because:
1. It's **compositional** (unary `-` + property access)
2. It's **intuitive** (minus = descending)
3. It's **concise** (3 tokens vs 11 for lambda)
4. It matches **mathematical notation** (`-x` for negation)

**Implement this first.** Then iterate with RALPH to discover the next high-impact feature.
