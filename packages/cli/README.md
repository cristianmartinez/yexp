# yexp-cli

Command-line interface for Yexp expression language.

## Installation

```bash
# From npm
npm install -g yexp-cli

# From source
cd packages/cli
bun install
bun run build
npm link
```

## Usage

```bash
# Basic property access (jq-style with '.')
echo '{"name": "Alice", "age": 30}' | yexp '.name'
# Output: "Alice"

# Array indexing
echo '{"users": [{"name": "Alice"}, {"name": "Bob"}]}' | yexp '.users[0].name'
# Output: "Alice"

# From file
yexp '.users[0].name' data.json

# Filter and map
echo '{"users": [{"name": "Alice", "age": 30}, {"name": "Bob", "age": 25}]}' | \
  yexp '.users.filter(u => u.age > 25).map(u => u.name)'
# Output: ["Alice"]

# Arithmetic
echo '{"price": 100, "tax": 0.1}' | yexp '.price * (1 + .tax)'
# Output: 110

# Template strings (use '$' to access input)
echo '{"name": "Alice"}' | yexp '`Hello, ${$.name}!`'
# Output: "Hello, Alice!"

# Access input explicitly with '$'
echo '{"name": "Alice"}' | yexp '$.name'
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
cat users.json | yexp 'users.filter(u => u.age >= 21)'
```

### Calculate Total
```bash
echo '{"items": [{"price": 10}, {"price": 20}]}' | \
  yexp 'items.map(i => i.price).reduce((a, b) => a + b, 0)'
```

### Extract Nested Data
```bash
yexp '$.orders[0].items.map(i => i.name)' orders.json
# Or use jq-style leading dot:
yexp '.orders[0].items.map(i => i.name)' orders.json
```

### Conditional Logic
```bash
echo '{"score": 85}' | yexp 'score >= 90 ? "A" : score >= 80 ? "B" : "C"'
# Output: "B"
```

## File System Functions

The CLI includes built-in functions for file exploration, making yexp a composable alternative to `find` and `grep`.

### `glob(pattern)`

Find files matching a glob pattern. Returns an array of file entries.

```bash
echo '{}' | yexp 'glob("src/**/*.ts") |> map(.name)'
# Output: ["index.ts", "functions.ts"]

echo '{}' | yexp 'glob("src/**/*.ts") |> filter(.size > 10000) |> sort(.size)'
# Find large TypeScript files

echo '{}' | yexp 'glob("**/*.ts") |> filter(.modified > now() - 86400000)'
# Files modified in the last 24 hours
```

Each file entry has: `path`, `name`, `ext`, `size`, `modified`, `type`.

### `read(path)`

Read a file's contents as a string.

```bash
echo '{}' | yexp 'read("package.json") |> length'
# Output: 726

echo '{}' | yexp 'read("tsconfig.json")'
# Output: raw file contents
```

### `lines(path)`

Read a file as an array of `{num, text}` objects.

```bash
echo '{}' | yexp 'lines("src/index.ts") |> filter(.text.includes("import")) |> map(.num)'
# Output: [1, 2, 3]

echo '{}' | yexp 'lines("src/index.ts") |> length'
# Count lines in a file
```

### `grep(pattern, pathGlob?)`

Search file contents for a pattern. Returns `{path, line, num, match}` objects.

```bash
echo '{}' | yexp 'grep("TODO", "src/**/*.ts") |> groupBy(.path)'
# Find all TODOs grouped by file

echo '{}' | yexp 'grep("evaluate", "packages/core/src/*.ts") |> map(.path) |> unique'
# Find files containing "evaluate"

echo '{}' | yexp 'grep("/export\\s+const/", "src/**/*.ts")'
# Regex pattern (wrap in /slashes/)
```

## Comparison with jq

| Feature | yexp | jq |
|---------|------|-----|
| Syntax | JavaScript-like | Custom DSL |
| Performance | ⚡ Very fast | Fast (C implementation) |
| Lambda functions | `x => x.age` | `\| .age` |
| Use case | Embedded + CLI | CLI-focused |

## Development

```bash
# Run without building
bun run dev 'expression' < input.json

# Build
bun run build

# Test
bun test
```
