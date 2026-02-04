# JSON Actions Executor

Imperative action system for state mutations using JSON structures.

## Purpose

While [json-conditions](../json-conditions/) handles **read-only** evaluations, this module handles **write operations** (mutations/actions).

## Structure

```typescript
type JsonAction =
  | { type: 'assign'; path: string; value: JsonValue }
  | { type: 'sequence'; actions: JsonAction[] }
  | { type: 'conditional'; condition: JsonValue; then: JsonAction; else?: JsonAction }
  | { type: 'call'; function: string; args?: JsonValue[] };

type JsonValue =
  | { type: 'literal'; value: any }
  | { type: 'expr'; expr: string }  // Expr expression for reading
  | { type: 'path'; path: string };
```

## Examples

### Simple Assignment

```json
{
  "type": "assign",
  "path": "state.count",
  "value": {
    "type": "expr",
    "expr": "state.count + 1"
  }
}
```

Equivalent to: `state.count = state.count + 1`

### Conditional Update

```json
{
  "type": "conditional",
  "condition": { "type": "expr", "expr": "state.count > 5" },
  "then": {
    "type": "assign",
    "path": "state.message",
    "value": { "type": "literal", "value": "High" }
  },
  "else": {
    "type": "assign",
    "path": "state.message",
    "value": { "type": "literal", "value": "Low" }
  }
}
```

Equivalent to:
```javascript
if (state.count > 5) {
  state.message = "High"
} else {
  state.message = "Low"
}
```

### Action Sequence

```json
{
  "type": "sequence",
  "actions": [
    {
      "type": "assign",
      "path": "state.loading",
      "value": { "type": "literal", "value": true }
    },
    {
      "type": "call",
      "function": "fetchData"
    },
    {
      "type": "assign",
      "path": "state.loading",
      "value": { "type": "literal", "value": false }
    }
  ]
}
```

Equivalent to:
```javascript
state.loading = true;
fetchData();
state.loading = false;
```

## API

### `executeAction(action, context)`

Execute an action, mutating the context in place.

```typescript
const context = { state: { count: 0 } };

executeAction({
  type: 'assign',
  path: 'state.count',
  value: { type: 'expr', expr: 'state.count + 1' }
}, context);

console.log(context.state.count); // 1
```

## Performance

- **~5x slower** than direct JavaScript assignments
- But provides:
  - ✅ Serializability (store in database)
  - ✅ Explicit audit trail
  - ✅ Version control for actions
  - ✅ Safe sandboxing

## Hybrid Approach: Expr + JSON Actions ⭐

**Best practice**: Use Expr for computations, JSON actions for mutations

```json
{
  "type": "assign",
  "path": "state.total",
  "value": {
    "type": "expr",
    "expr": "items |> map(.price * .qty) |> add"  // ← Expr handles computation
  }
}
```

This gives you:
- **Power** of Expr for complex calculations
- **Safety** of JSON for controlled mutations
- **Serializability** for database storage

## When to Use

✅ **Use JSON actions when:**
- Need to store actions in database
- Want explicit audit trail
- Building low-code/no-code systems
- Need to sandbox user-defined actions

❌ **Don't use when:**
- Writing application code directly
- Performance is absolutely critical
- Don't need serializability

## Examples

See [examples.ts](./examples.ts) for example actions:
- `actionExamples.increment` - Simple counter increment
- `actionExamples.conditionalUpdate` - Conditional state update
- `actionExamples.sequence` - Multi-step action sequence

## Comprehensive Analysis

Run `bun run packages/core/benchmarks/scripts/json-conditions/comprehensive-analysis.ts` to see:
- JSON actions vs hypothetical expression mutations (Part 2)
- JSON conditions vs compiled expressions (Part 1)
- Performance comparisons
- Hybrid approach examples
- Recommendations

## Files

- `executor.ts` - Action execution engine
- `examples.ts` - Example actions for testing
- `README.md` - This file
