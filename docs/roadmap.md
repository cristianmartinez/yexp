# Expr Roadmap

This document outlines planned features to make Expr more feature-rich, comparable to [jq](https://jqlang.org/).

## Current Status

**Implemented:**
- ✅ Core expression evaluation (arithmetic, comparison, logical)
- ✅ Path resolution (`state.user.name`, `data.items[0]`)
- ✅ Template literals with interpolation
- ✅ Array/object literals with spread operator
- ✅ Pipe operator (`|>`)
- ✅ Lambda functions: arrow `(x) => x > 5` and dot shorthand `.price > 100`
- ✅ Higher-order functions: `filter`, `map`, `find`, `reduce`, `every`, `some`, `sort`, `flatMap`
- ✅ State mutations: `=`, `++`, `--`, `<<`
- ✅ Built-in functions: `toString`, `length`, `round`, `floor`, `ceil`, `abs`, `min`, `max`, `slice`, `includes`, `keys`, `values`, `type`

## Phase 1: Core Collection Operations

Essential array and object operations for data transformation.

### Array Functions

- [ ] `add` - Sum/concatenate all array elements
  ```js
  [1, 2, 3] |> add  // 6
  ["a", "b"] |> add  // "ab"
  ```

- [ ] `group_by(expr)` - Group elements by expression result
  ```js
  items |> group_by(.category)
  ```

- [ ] `unique` / `unique_by(expr)` - Remove duplicates
  ```js
  [1, 2, 2, 3] |> unique  // [1, 2, 3]
  items |> unique_by(.id)
  ```

- [ ] `reverse` - Reverse array order
  ```js
  [1, 2, 3] |> reverse  // [3, 2, 1]
  ```

- [ ] `flatten` / `flatten(depth)` - Flatten nested arrays
  ```js
  [[1, 2], [3, 4]] |> flatten  // [1, 2, 3, 4]
  [[[1]], [[2]]] |> flatten(1)  // [[1], [2]]
  ```

- [ ] `min_by(expr)` / `max_by(expr)` - Find extrema by expression
  ```js
  items |> min_by(.price)
  items |> max_by(.score)
  ```

### Object Functions

- [ ] `to_entries` - Convert object to key-value pairs
  ```js
  {a: 1, b: 2} |> to_entries  // [{key: "a", value: 1}, {key: "b", value: 2}]
  ```

- [ ] `from_entries` - Convert key-value pairs to object
  ```js
  [{key: "a", value: 1}] |> from_entries  // {a: 1}
  ```

- [ ] `with_entries(f)` - Transform object entries
  ```js
  obj |> with_entries((entry) => {key: entry.key, value: entry.value * 2})
  ```

- [ ] `del(path)` - Remove keys/paths
  ```js
  {a: 1, b: 2} |> del("a")  // {b: 2}
  ```

- [ ] `pick(paths)` - Project specific fields
  ```js
  obj |> pick(["name", "email"])
  ```

- [ ] `has(key)` - Check key existence
  ```js
  obj |> has("name")
  ```

### String Functions

- [ ] `join(separator)` - Join array elements into string
  ```js
  ["a", "b", "c"] |> join(", ")  // "a, b, c"
  ```

- [ ] `startswith(str)` / `endswith(str)` - Prefix/suffix checks
  ```js
  "hello" |> startswith("he")  // true
  ```

- [ ] `ltrimstr(str)` / `rtrimstr(str)` - Remove prefix/suffix
  ```js
  "hello world" |> ltrimstr("hello ")  // "world"
  ```

- [ ] `ascii_downcase` / `ascii_upcase` - Case conversion
  ```js
  "Hello" |> ascii_downcase  // "hello"
  ```

- [ ] `index(s)` / `rindex(s)` - Find substring position
  ```js
  "hello world" |> index("world")  // 6
  ```

### Utility Functions

- [ ] `select(condition)` - Filter single values
  ```js
  data.items[] |> select(.active)  // emit only active items
  ```

- [ ] `first(expr)` / `last(expr)` - Take first/last value
  ```js
  data.items |> first
  data.items |> last
  ```

- [ ] `limit(n)` - Take first n values
  ```js
  data.items |> limit(5)
  ```

## Phase 2: Control Flow & Usability

Enhanced control structures and error handling.

### Conditionals

- [ ] Ternary operator: `condition ? true_val : false_val`
  ```js
  state.age >= 18 ? "adult" : "minor"
  ```

- [ ] `if-then-else` expression
  ```js
  if .score > 90 then "A" else if .score > 80 then "B" else "C"
  ```

### Error Handling

- [ ] `try-catch` expression
  ```js
  try state.value / state.divisor catch 0
  ```

- [ ] Optional chaining improvements
  ```js
  state.user?.address?.city
  ```

### Path Operations

- [ ] `getpath(path)` - Retrieve value at path array
  ```js
  getpath(["user", "address", "city"])
  ```

- [ ] `setpath(path; value)` - Set value at path array
  ```js
  setpath(["user", "name"]; "Alice")
  ```

- [ ] `paths` - Enumerate all paths
  ```js
  obj |> paths  // all paths to leaf values
  ```

- [ ] `leaf_paths` - Paths to leaf values only
  ```js
  obj |> leaf_paths
  ```

### Recursive Operations

- [ ] `..` - Recursive descent
  ```js
  data.. |> select(.type == "user")  // find all nested user objects
  ```

- [ ] `recurse(f)` - Apply function recursively
  ```js
  category |> recurse(.subcategories[])
  ```

- [ ] `walk(f)` - Transform nested structures
  ```js
  obj |> walk(if type == "string" then ascii_upcase else . end)
  ```

## Phase 3: Advanced Features

Extended functionality for specialized use cases.

### Math Functions

- [ ] `sqrt` / `pow(n)` - Power and root operations
  ```js
  16 |> sqrt  // 4
  2 |> pow(3)  // 8
  ```

- [ ] `log` / `log10` / `log2` - Logarithms
  ```js
  100 |> log10  // 2
  ```

- [ ] `sin` / `cos` / `tan` - Trigonometry
  ```js
  0 |> sin  // 0
  ```

### String Operations

- [ ] `test(regex)` / `match(regex)` - Regex matching
  ```js
  "hello123" |> test("[0-9]+")  // true
  "hello123" |> match("[0-9]+")  // ["123"]
  ```

- [ ] `capture(regex)` - Regex capture groups
  ```js
  "2024-01-15" |> capture("([0-9]+)-([0-9]+)-([0-9]+)")
  ```

- [ ] `sub(regex; replacement)` / `gsub(regex; replacement)` - Regex replace
  ```js
  "hello world" |> sub("world"; "universe")
  ```

### Date/Time

- [ ] `now` - Current Unix timestamp
  ```js
  now  // 1706198400
  ```

- [ ] `fromdateiso8601` / `todateiso8601` - ISO date parsing/formatting
  ```js
  "2024-01-15T12:00:00Z" |> fromdateiso8601  // timestamp
  1706198400 |> todateiso8601  // "2024-01-15T12:00:00Z"
  ```

- [ ] `strftime(fmt)` - Date formatting
  ```js
  now |> strftime("%Y-%m-%d")  // "2024-01-15"
  ```

### Encoding/Formatting

- [ ] `@json` - JSON serialization
  ```js
  obj |> @json
  ```

- [ ] `@uri` / `@urid` - URL encoding/decoding
  ```js
  "hello world" |> @uri  // "hello%20world"
  ```

- [ ] `@csv` / `@tsv` - CSV/TSV formatting
  ```js
  [[1, 2], [3, 4]] |> @csv
  ```

- [ ] `@base64` / `@base64d` - Base64 encoding/decoding
  ```js
  "hello" |> @base64  // "aGVsbG8="
  ```

- [ ] `@html` - HTML entity escaping
  ```js
  "<script>" |> @html  // "&lt;script&gt;"
  ```

### Advanced Iteration

- [ ] Variables: `expr as $var | body` - Bind intermediate results
  ```js
  .items |> length as $count | {count: $count, items: .}
  ```

- [ ] `foreach` - Stateful iteration
  ```js
  foreach .items[] as $item (0; . + $item; .)
  ```

- [ ] `empty` - Produce no output
  ```js
  if .hidden then empty else . end
  ```

- [ ] Generators/streaming
  ```js
  range(1; 10)  // 1, 2, 3, ..., 9
  ```

## Implementation Notes

### Design Principles

1. **Non-Turing Complete** - No arbitrary recursion depth, maintain bounded execution
2. **Immutable by Default** - State mutations only via explicit operators on `state` paths
3. **Type Safety** - Runtime type checking with clear error messages
4. **Context Isolation** - Lambda parameters don't close over arbitrary scopes

### Technical Considerations

- **Regex Support** - Requires adding a regex engine or embedding one in the runtime
- **Date/Time** - May need external date library or implement subset of ISO 8601
- **Streaming** - Current VM is stack-based; generators would require iterator support
- **Variables** - Requires extending compiler to track bindings and emit STORE/LOAD_VAR opcodes

## References

- [jq 1.8 Manual](https://jqlang.org/manual/)
- [JMESPath Specification](https://jmespath.org/)
- [JSONPath Specification](https://goessner.net/articles/JsonPath/)
