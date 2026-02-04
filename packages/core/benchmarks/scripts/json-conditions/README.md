# JSON Condition Evaluator

Simple, extensible JSON-based condition engine for comparison purposes.

## Structure

```typescript
interface JsonCondition {
  field?: string;           // Simple field access: "age"
  path?: string;            // Nested path: "user.profile.age"
  op?: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte';
  value?: any;
  and?: JsonCondition[];
  or?: JsonCondition[];
}
```

## API

### `evaluateSimple(condition, context)`

Fast evaluator for simple field access only.

```typescript
const condition = {
  and: [
    { field: 'age', op: 'gte', value: 18 },
    { field: 'verified', op: 'eq', value: true }
  ]
};

evaluateSimple(condition, { age: 25, verified: true }); // → true
```

### `evaluateWithPaths(condition, context)`

Extended evaluator supporting nested paths.

```typescript
const condition = {
  and: [
    { path: 'user.profile.age', op: 'gte', value: 18 },
    { path: 'user.profile.country.code', op: 'eq', value: 'US' }
  ]
};

evaluateWithPaths(condition, {
  user: {
    profile: {
      age: 25,
      country: { code: 'US' }
    }
  }
}); // → true
```

## Performance

- **evaluateSimple**: ~0.04µs per evaluation (V8 JIT optimized)
- **evaluateWithPaths**: ~0.10µs per evaluation (adds path parsing overhead)
- **vs Compiled Expressions**: 5-9x faster for simple conditions

JSON wins on raw speed for simple boolean logic because:
1. Native JavaScript execution (JIT compiled)
2. No bytecode dispatch overhead
3. Direct property access
4. Switch statement optimization

## When to Use

✅ **Use JSON conditions when:**
- Extremely simple comparisons only
- Need database storage/serialization
- Type safety is critical
- One-time or low-frequency evaluation

❌ **Don't use JSON when you need:**
- Arithmetic: `score * 1.5 > threshold`
- Transformations: `email |> lower`
- Array operations: `items |> filter(.active) |> length`
- Complex logic requiring many extensions

For these cases, use the full expression language instead!

## Example Conditions

See [examples.ts](./examples.ts) for more examples:
- `conditionExamples.simple` - Basic field comparisons
- `conditionExamples.complex` - Nested AND/OR logic
- `conditionExamples.nested` - Nested property paths

## Comprehensive Analysis

Run `bun run packages/core/benchmarks/scripts/json-conditions/comprehensive-analysis.ts` to see:
- JSON conditions vs compiled expressions (Part 1)
- JSON actions vs hypothetical expression mutations (Part 2)
- Performance comparisons across multiple scenarios
- Recommended hybrid approach
