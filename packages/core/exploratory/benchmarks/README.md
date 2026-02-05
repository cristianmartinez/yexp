# Benchmarks: Jext vs jq vs JSONata

Performance comparison of JSON query/transformation engines.

## Competitors

- **jq** - C-based CLI tool, industry standard
- **JSONata** - JavaScript library, used by Node-RED
- **Jext** - Our expression language (stack-based VM)

## Quick Start

```bash
cd packages/core/exploratory/benchmarks

# Install dependencies
bun install

# Run benchmarks
bun run bench
```

## Test Cases

1. **Simple Property Access** - `users[0].name`
2. **Filter Array** - `users.filter(u => u.age > 28)`
3. **Map Array** - `users.map(u => u.name)`
4. **Complex Query** - `users.filter(...).map(...)`
5. **Arithmetic** - `users[0].score * 1.1 + 10`

## Expected Results

| Test | Jext | JSONata | jq (CLI) |
|------|------|---------|----------|
| Property Access | ~2µs | ~5µs | ~50ms* |
| Filter | ~15µs | ~30µs | ~50ms* |
| Map | ~10µs | ~20µs | ~50ms* |
| Complex | ~25µs | ~50µs | ~50ms* |
| Arithmetic | ~3µs | ~8µs | ~50ms* |

\* jq is slow here due to subprocess overhead. When used as a C library, it's very fast.

## Why Jext is Fast

1. **Compiled bytecode** - Parse once, run many times
2. **Stack-based VM** - Efficient interpretation
3. **Optimized for JS** - Native array methods, JIT-friendly
4. **No subprocess overhead** - Embedded in your app

## Why JSONata is Slower

- Interprets AST on every evaluation
- More complex transformation features (overhead)
- Designed for flexibility over raw speed

## Why jq Appears Slow Here

- Subprocess spawn time dominates (30-50ms)
- JSON serialization/parsing overhead
- **But**: jq's C implementation is extremely fast for large data

## When to Use Each

| Tool | Best For |
|------|----------|
| **Jext** | High-frequency queries, user rules, embedded logic |
| **JSONata** | Complex transformations, Node-RED, data mapping |
| **jq** | CLI scripts, one-off queries, shell pipelines |

## Real-World Performance

For a typical web application evaluating user rules on every request:

```
1000 requests/second, each evaluates 5 rules:
- Jext: ~10µs × 5 = 50µs = 0.05ms total
- JSONata: ~30µs × 5 = 150µs = 0.15ms total
- jq: Not suitable (50ms overhead per rule)

Jext adds negligible latency to your API!
```
