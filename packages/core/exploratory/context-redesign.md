# Context Model Redesign

## Problem

Current design requires explicit `data.` prefix:
```javascript
evaluate(program, { data: input, state: {}, env: {} });
// Expression: data.name
```

This is verbose and doesn't match jq/JSONata patterns.

## New Design

**Primary input is directly accessible:**

```typescript
evaluate(program, input, { context?, env? });
```

### Access Patterns

| Pattern | Meaning | Example |
|---------|---------|---------|
| `.name` | Root input (jq-style) | `.users[0].name` |
| `$.name` | Root input (explicit) | `$.price * 1.1` |
| `$context.tax` | Auxiliary context | `$context.isPremium` |
| `$env.URL` | Environment variable | `$env.API_URL` |

## Implementation Plan

### 1. Types Changes

```typescript
// Old
interface ExecutionContext {
  data: any;
  state: any;
  env: any;
}

// New
interface ExecutionContext {
  root: any;           // The main input (accessible via . or $)
  context?: any;       // Optional auxiliary context
  env?: any;           // Optional environment
}

// API signature
function evaluate(
  program: Program,
  input: any,
  options?: { context?: any; env?: any }
): any;
```

### 2. Parser Changes

Recognize special identifiers:
- `$` → root reference
- `$context` → auxiliary context
- `$env` → environment
- `.` at start → root reference (transform to `$`)

### 3. Compiler Changes

Generate opcodes:
- `$.name` → `LOAD_ROOT`, `GET_PROP 'name'`
- `$context.tax` → `LOAD_CONTEXT`, `GET_PROP 'tax'`
- `$env.URL` → `LOAD_ENV`, `GET_PROP 'URL'`

### 4. VM Changes

Add new opcodes:
- `LOAD_ROOT` - Load the main input
- `LOAD_CONTEXT` - Load auxiliary context
- Keep `LOAD_ENV` (rename from `LOAD_ENV`)

### 5. Backward Compatibility

Support both APIs:
```typescript
// Detect old vs new API
if (typeof contextOrInput === 'object' && 'data' in contextOrInput) {
  // Old API
} else {
  // New API
}
```

## Migration Guide

### Before
```typescript
const ctx = { data: { name: 'Alice' }, state: {}, env: {} };
evaluate(program, ctx);
// Expression: data.name
```

### After
```typescript
const input = { name: 'Alice' };
evaluate(program, input);
// Expression: .name or $.name
```

### With Context
```typescript
const input = { price: 100 };
const options = {
  context: { taxRate: 0.1 },
  env: { SHIPPING: 5 }
};
evaluate(program, input, options);
// Expression: .price * (1 + $context.taxRate) + $env.SHIPPING
```

## Benefits

✅ Cleaner API - main data is the focus
✅ jq-compatible - `.` works like jq
✅ Still flexible - context/env when needed
✅ Intuitive - `$` for special variables
✅ Better DX - less typing, more readable

## Breaking Changes

- Old `data`, `state`, `env` namespaces → New `$`, `$context`, `$env`
- API signature changed (but backward compatible)
- All expressions need updating

## Timeline

1. Implement in exploratory first
2. Test thoroughly
3. Update all tests
4. Migrate main code
5. Update docs
6. Deprecate old API
