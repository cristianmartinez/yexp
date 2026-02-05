# @jext/cli

Command-line interface for Jext expression language.

## Installation

```bash
# From npm (when published)
npm install -g @jext/cli

# From source
cd packages/cli
bun install
bun run build
npm link
```

## Usage

```bash
# Basic property access (jq-style with '.')
echo '{"name": "Alice", "age": 30}' | jext '.name'
# Output: "Alice"

# Array indexing
echo '{"users": [{"name": "Alice"}, {"name": "Bob"}]}' | jext '.users[0].name'
# Output: "Alice"

# From file
jext '.users[0].name' data.json

# Filter and map
echo '{"users": [{"name": "Alice", "age": 30}, {"name": "Bob", "age": 25}]}' | \
  jext '.users.filter(u => u.age > 25).map(u => u.name)'
# Output: ["Alice"]

# Arithmetic
echo '{"price": 100, "tax": 0.1}' | jext '.price * (1 + .tax)'
# Output: 110

# Template strings (use '$' to access input)
echo '{"name": "Alice"}' | jext '`Hello, ${$.name}!`'
# Output: "Hello, Alice!"

# Access input explicitly with '$'
echo '{"name": "Alice"}' | jext '$.name'
# Output: "Alice"
```

## Options

- `-c, --compact` - Compact output (no pretty-printing)
- `-r, --raw` - Raw output (don't JSON-encode strings)
- `-f, --file <path>` - Read from file instead of stdin
- `-h, --help` - Show help
- `-v, --version` - Show version

## Examples

### Filter Users by Age
```bash
cat users.json | jext 'users.filter(u => u.age >= 21)'
```

### Calculate Total
```bash
echo '{"items": [{"price": 10}, {"price": 20}]}' | \
  jext 'items.map(i => i.price).reduce((a, b) => a + b, 0)'
```

### Extract Nested Data
```bash
jext '$.orders[0].items.map(i => i.name)' orders.json
# Or use jq-style leading dot:
jext '.orders[0].items.map(i => i.name)' orders.json
```

### Conditional Logic
```bash
echo '{"score": 85}' | jext 'score >= 90 ? "A" : score >= 80 ? "B" : "C"'
# Output: "B"
```

## Comparison with jq

| Feature | jext | jq |
|---------|------|-----|
| Syntax | JavaScript-like | Custom DSL |
| Performance | ⚡ Very fast | Fast (C implementation) |
| Lambda functions | `x => x.age` | `\| .age` |
| Use case | Embedded + CLI | CLI-focused |

## Performance

Jext is optimized for speed with compiled bytecode:

```bash
# Benchmark: 100,000 evaluations
jext 'users[0].name'  # ~0.3µs per eval
jq '.users[0].name'   # ~50ms per eval (subprocess overhead)
```

For CLI usage, both are fast enough. Jext shines when embedded in applications.

## Development

```bash
# Run without building
bun run dev 'expression' < input.json

# Build
bun run build

# Test
bun test
```
