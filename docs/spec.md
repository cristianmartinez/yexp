# Expr Language Specification

**Version:** 0.1.0 (draft)

This document specifies the core expression language: types, syntax, operators, compilation, bytecode, and execution semantics.

---

## 0. Execution Context

Every expression runs under a **context** — a structured state object that the expression can read from and, in the case of actions, write to. Expressions never execute in isolation; they are always bound to a context at evaluation time.

```json
{
  "state": { },
  "data": { },
  "env": { }
}
```

| Root    | Purpose                                         | Mutability                       |
|---------|-------------------------------------------------|----------------------------------|
| `state` | Application state (UI state, form values, etc.) | Readable and writable            |
| `data`  | External data (API responses, config, records)  | Read-only                        |
| `env`   | Environment info (locale, platform, timestamp)  | Read-only                        |

All path expressions in the language (`state.user.name`, `data.items[0]`, `env.locale`) resolve against this context. There are no global variables, no closures, and no ambient state — the context is the only source of external values.

### Expression Types

The system supports two kinds of expressions:

**Value expressions** evaluate to a result without modifying the context:

```
state.count > 0                        // → boolean
state.user.name                        // → string
state.price * state.qty                // → number
`Hello, ${state.user.name}!`           // → string
{ ...state.user, active: true }        // → object
```

**Action expressions** modify the context and return no meaningful value:

```
state.count = state.count + 1          // SET: mutate state.count
state.items << { name: "new" }         // APPEND: push to state.items
state.user = { ...state.user, age: 31 } // SET: replace state.user
```

The compiler distinguishes between these at compile time. Action expressions may only write to `state` — writing to `data` or `env` is a compile-time error.

### Context Binding

An expression is compiled once and can be evaluated many times against different contexts:

```
// compiled expression
state.count > 0

// evaluated against context A
{ "state": { "count": 5 } }   → true

// evaluated against context B
{ "state": { "count": 0 } }   → false
```

This separation between compilation and evaluation is what enables caching, portability, and determinism.

### Custom Context Roots

The three roots (`state`, `data`, `env`) are the default set. Implementations may extend the context with additional roots for domain-specific needs, but the expression syntax and compilation model remain the same.

---

## 1. Type System

The expression language supports four primitive types and one structural type.

### Primitive Types

| Type      | Description                          | Examples              |
|-----------|--------------------------------------|-----------------------|
| `number`  | 64‑bit IEEE 754 floating point       | `0`, `3.14`, `-1`    |
| `string`  | UTF‑8 encoded text                   | `"hello"`, `""`      |
| `boolean` | Logical true or false                | `true`, `false`       |
| `null`    | Absence of value                     | `null`                |

### Structural Types

| Type     | Description                     |
|----------|---------------------------------|
| `array`  | Ordered list of values          |
| `object` | Key‑value map (string keys)     |

Arrays and objects can be constructed via literals (see §2) and accessed via member/index operators.

### Type Coercion

There is **no implicit type coercion**. Operands must be of the expected type or the expression produces a runtime error.

Exceptions:
- `null` equality: `null == null` is `true`; `null == <any non-null>` is `false`
- Truthiness (for logical operators only): `null` and `false` are falsy; all other values are truthy

---

## 2. Expression Syntax

Expressions are written as JS‑like strings and parsed into an AST before compilation.

### Literals

```
42          // number (integer)
3.14        // number (float)
-1          // number (negative, unary minus)
"hello"     // string (double quotes)
'hello'     // string (single quotes)
`hello`     // template literal (backticks)
true        // boolean
false       // boolean
null        // null
```

### Template Literals

Backtick strings support interpolation via `${...}`:

```
`Hello, ${state.user.name}!`
`Count: ${state.count}`
`${state.first} ${state.last}`
```

The expression inside `${...}` is a full expression — any valid expression can appear:

```
`Total: ${state.price * state.qty}`
`Status: ${state.active && "on" || "off"}`
```

Template literals compile to a sequence of `CONST` / expression evaluations joined by `TO_STRING` and `ADD` (string concatenation). Each interpolated segment is coerced to a string via `TO_STRING`.

#### Coercion Rules for Interpolation

Inside `${...}`, values are coerced to strings:

| Type      | Result          |
|-----------|-----------------|
| `string`  | unchanged       |
| `number`  | decimal representation (`3.14` → `"3.14"`) |
| `boolean` | `"true"` or `"false"` |
| `null`    | `"null"`        |

This is the **only** place implicit coercion occurs.

#### Compilation Example

```
`Hello, ${state.user.name}!`
```

Compiles to:

```
CONST 0        // "Hello, "
LOAD 0         // state.user.name
TO_STRING
ADD
CONST 1        // "!"
ADD
RETURN
```

### Identifiers and Paths

Identifiers follow JS rules: start with a letter, `_`, or `$`; followed by letters, digits, `_`, or `$`.

Paths use dot notation and bracket notation to access nested values from the execution context:

```
state.count
state.user.profile.age
data.items[0].name
env.locale
```

All paths must begin with a known root: `state`, `data`, or `env`.

### Parentheses

Parentheses override precedence:

```
(state.a + state.b) * state.c
```

### String Concatenation

The `+` operator concatenates when both operands are strings:

```
"hello" + " " + "world"    // "hello world"
```

Using `+` with mixed types (string + number) is a runtime error.

### Array Literals

Arrays can be constructed inline:

```
[1, 2, 3]
[state.a, state.b, "hello"]
[]
```

### Object Literals

Objects can be constructed with string keys:

```
{ name: "Alice", age: 30 }
{ key: state.value, active: true }
{}
```

Keys are unquoted identifiers (like JS shorthand). Values are full expressions.

#### Shorthand Property Names

When the key matches a path's last segment, shorthand is supported:

```
{ name, age }
// equivalent to: { name: state.name, age: state.age }
```

Shorthand resolves against the current context roots (`state`, `data`, `env`) using standard path resolution.

### Spread Operator

The spread operator (`...`) expands arrays or objects inside literals.

#### Array Spread

```
[...data.items, state.newItem]
[1, ...data.list, 2]
[...data.a, ...data.b]
```

Spreads the elements of an array into the surrounding array literal.

#### Object Spread

```
{ ...state.user, name: "Bob" }
{ ...state.defaults, ...state.overrides }
```

Spreads the key‑value pairs of an object into the surrounding object literal. Later keys override earlier ones (left‑to‑right).

#### Constraints

- Spread is only valid inside array `[]` or object `{}` literals
- Spreading a non‑array into an array literal is a runtime error
- Spreading a non‑object into an object literal is a runtime error

### Pipe Operator

The pipe operator (`|>`) passes a value as the first argument to a built‑in function:

```
state.value |> toString
state.value |> toString |> length
```

This is equivalent to nested function calls:

```
length(toString(state.value))
```

Pipes are left‑associative and evaluate left to right. The right‑hand side must be a **registered built‑in function name** — arbitrary expressions are not allowed on the right side of `|>`.

#### With Additional Arguments

If the built‑in accepts more than one argument, pass them in parentheses:

```
state.value |> round(2)
state.list |> slice(0, 5) |> length
```

This desugars to:

```
length(slice(state.list, 0, 5))
// pipe inserts the left side as the FIRST argument
```

### Lambda Functions

Lambda functions are anonymous functions that can be passed as arguments to higher-order built-in functions like `map`, `filter`, and `reduce`.

#### Arrow Syntax

Lambda functions use arrow function syntax:

```
(x) => x > 5
(x, y) => x + y
(item) => item.price * item.qty
```

The left side declares parameter names (in parentheses), and the right side is the expression body that gets evaluated.

#### Dot Shorthand Syntax

For single-parameter lambdas that access members of the parameter, a shorthand syntax is available:

```
.price > 100
.name
.user.active
```

This is syntactic sugar that expands to a full lambda:

```
.price > 100    →    (x) => x.price > 100
.name           →    (x) => x.name
.user.active    →    (x) => x.user.active
```

The dot shorthand can only be used in positions where a lambda is expected (as arguments to higher-order functions).

#### Usage with Higher-Order Functions

```
data.items |> filter((x) => x.price > 100)
data.items |> filter(.price > 100)              // shorthand equivalent

data.items |> map((x) => x.price * x.qty)
data.items |> map(.price * .qty)                // shorthand (NOT YET SUPPORTED - use arrow for complex expressions)

data.items |> sort((a, b) => a.price - b.price)
```

#### Compilation

Lambdas compile to self-contained bytecode programs embedded in the parent program. At runtime, when a higher-order function is invoked, the lambda's bytecode is evaluated with the lambda parameters bound to the execution context.

---

## 3. Operators

### Arithmetic Operators

| Operator | Name           | Operand Types     | Result Type |
|----------|----------------|-------------------|-------------|
| `+`      | Add            | number, number    | number      |
| `+`      | Concatenate    | string, string    | string      |
| `-`      | Subtract       | number, number    | number      |
| `*`      | Multiply       | number, number    | number      |
| `/`      | Divide         | number, number    | number      |
| `%`      | Modulo         | number, number    | number      |

### Comparison Operators

| Operator | Name                  | Operand Types         | Result Type |
|----------|-----------------------|-----------------------|-------------|
| `==`     | Equal                 | any, any              | boolean     |
| `!=`     | Not equal             | any, any              | boolean     |
| `<`      | Less than             | number, number        | boolean     |
| `>`      | Greater than          | number, number        | boolean     |
| `<=`     | Less than or equal    | number, number        | boolean     |
| `>=`     | Greater than or equal | number, number        | boolean     |

Equality (`==`, `!=`) compares by value. Two values of different types are never equal (except `null == null`).

### Logical Operators

| Operator | Name        | Behavior                    |
|----------|-------------|-----------------------------|
| `&&`     | Logical AND | Short‑circuit; returns last evaluated operand |
| `\|\|`   | Logical OR  | Short‑circuit; returns last evaluated operand |
| `!`      | Logical NOT | Unary; returns boolean                        |

Logical operators use **truthiness** (see §1 Type Coercion).

`&&` returns the left operand if falsy, otherwise the right operand.
`||` returns the left operand if truthy, otherwise the right operand.

### Ternary Operator

| Operator | Name     | Syntax              | Description                                    |
|----------|----------|---------------------|------------------------------------------------|
| `? :`    | Ternary  | `condition ? a : b` | Returns `a` if condition is truthy, else `b`   |

The ternary operator evaluates a condition and returns one of two values based on truthiness:

```
state.count > 0 ? "positive" : "zero or negative"
state.user ? state.user.name : "Guest"
state.value ? state.value : "default"
```

The ternary operator short-circuits: only the selected branch is evaluated.

### Null Coalescing Operator

| Operator | Name            | Syntax    | Description                              |
|----------|-----------------|-----------|------------------------------------------|
| `??`     | Null coalescing | `a ?? b`  | Returns `b` if `a` is `null`, else `a`   |

The null coalescing operator provides a default value when the left operand is `null`:

```
state.user.name ?? "Anonymous"
data.config.timeout ?? 5000
env.locale ?? "en-US"
```

Unlike `||`, the `??` operator only checks for `null`, not general falsiness. `false`, `0`, and `""` are not considered null.

The operator short-circuits: if the left side is not `null`, the right side is not evaluated.

### Optional Chaining Operator

| Operator | Name              | Syntax     | Description                                        |
|----------|-------------------|------------|----------------------------------------------------|
| `?.`     | Optional chaining | `a?.b`     | Access `b` if `a` is not `null`, otherwise `null`  |

The optional chaining operator safely accesses nested properties without explicit null checks:

```
state.user?.profile?.avatar
data.response?.data?.items
```

If any part of the chain is `null`, the entire expression evaluates to `null` without error:

```
// If state.user is null:
state.user?.name              →  null (not an error)

// If state.user.profile is null:
state.user.profile?.avatar    →  null (not an error)

// Equivalent explicit null checks:
state.user && state.user.name
state.user && state.user.profile && state.user.profile.avatar
```

Optional chaining can be combined with bracket access and function calls (future feature):

```
state.users?.[0]?.name
state.handler?.()              // (not yet supported)
```

### Recursive Descent Operator

| Operator | Name              | Syntax     | Description                                        |
|----------|-------------------|------------|----------------------------------------------------|
| `..`     | Recursive descent | `a..prop`  | Find all occurrences of `prop` at any depth in `a` |

The recursive descent operator searches for a property at all levels of a nested structure, recursively traversing objects and arrays:

```
data..name
data.users..email
data..items[*].price
```

If the object is:

```json
{
  "users": [
    { "name": "Alice", "profile": { "name": "Alice Admin" } },
    { "name": "Bob", "posts": [{ "name": "Post 1" }] }
  ],
  "config": { "settings": { "name": "App Settings" } }
}
```

Then `data..name` returns an array of all `name` values found at any depth:

```
["Alice", "Alice Admin", "Bob", "Post 1", "App Settings"]
```

#### Search Semantics

The recursive descent operator performs a **depth-first traversal**:

1. If the current value has the property, collect it
2. Recursively traverse all child values (object properties and array elements)
3. Return all collected values as an array

The search:
- Returns an empty array if no matches are found (not an error)
- Works on both objects and arrays
- Skips dangerous keys (`__proto__`, `constructor`, `prototype`) for security
- Limits recursion depth to 100 levels to prevent infinite loops
- Detects circular references using a visited set

#### Optional Variant (`?..`)

The optional recursive descent operator returns an empty array if the left side is `null`:

```
data.users?..email         // returns [] if data.users is null
data.missing?..property    // returns [] if data.missing is undefined
```

This is useful for safe traversal when the starting point might not exist.

#### Chaining with Other Operators

Recursive descent integrates with wildcards, predicates, and property access:

```
// Recursive descent + wildcard
data..users[*].email
// Finds all "users" arrays, then extracts email from each user

// Recursive descent + property access
data..user.name
// Finds all "user" objects, then accesses their name property

// Multiple recursive descents
data..groups..name
// Finds all "groups" arrays, then finds all "name" properties within them
```

When chained, the recursive descent returns an array, and subsequent operators automatically map over the results.

### Unary Operators

| Operator | Name        | Operand Type | Result Type |
|----------|-------------|--------------|-------------|
| `-`      | Negate      | number       | number      |
| `!`      | Logical NOT | any          | boolean     |

### Member Access Operators

| Operator | Name              | Example           |
|----------|-------------------|-------------------|
| `.`      | Dot access        | `state.user.name` |
| `[]`     | Bracket access    | `data.items[0]`   |
| `..`     | Recursive descent | `data..name`      |

Bracket access supports number literals only (for array indexing). Dynamic bracket access (`items[state.i]`) is not supported in this version.

The recursive descent operator (`..`) searches for a property at all depths in a nested structure, returning an array of all matches. See §2 Recursive Descent Operator for full syntax and semantics.

### Pipe

| Operator | Name | Associativity | Description                                          |
|----------|------|---------------|------------------------------------------------------|
| `\|>`    | Pipe | Left          | Pass left value as first arg to right‑hand built‑in  |

See §2 Pipe Operator for full syntax and semantics.

### Spread

| Operator | Name   | Context                   | Description                                    |
|----------|--------|---------------------------|------------------------------------------------|
| `...`    | Spread | Array and object literals | Expand iterable into surrounding literal       |

Spread is not a general-purpose operator — it is only valid inside `[]` and `{}` literals. See §2 Spread Operator.

---

## 4. Operator Precedence

From highest to lowest:

| Precedence | Operator(s)                  | Associativity |
|------------|------------------------------|---------------|
| 1          | `.` `[]` `?.` `..` `?..`     | Left          |
| 2          | `!` `-` (unary) `...`        | Right         |
| 3          | `\|>`                  | Left          |
| 4          | `*` `/` `%`            | Left          |
| 5          | `+` `-`                | Left          |
| 6          | `<` `>` `<=` `>=`      | Left          |
| 7          | `==` `!=`              | Left          |
| 8          | `&&`                   | Left          |
| 9          | `\|\|`                 | Left          |
| 10         | `??`                   | Left          |
| 11         | `? :`                  | Right         |

---

## 5. Built-in Functions

The expression language provides a rich set of **built-in functions** that can be called directly or via the pipe operator. All built-in functions are **pure** (no side effects, except `now` and `random`) and **deterministic** (same inputs produce same outputs).

Built-in functions are invoked using call syntax or pipe syntax:

```
toString(state.value)           // call syntax
state.value |> toString         // pipe syntax
```

### Type Conversion and Inspection

| Function   | Signature              | Description                                    |
|------------|------------------------|------------------------------------------------|
| `toString` | `(any) → string`       | Convert any value to string representation     |
| `type`     | `(any) → string`       | Return type name: "number", "string", "boolean", "null", "array", "object" |
| `length`   | `(string\|array) → number` | Return length of string or array           |

### Math Functions

| Function | Signature                  | Description                        |
|----------|----------------------------|------------------------------------|
| `round`  | `(number, decimals?) → number` | Round to N decimal places (default: 0) |
| `floor`  | `(number) → number`        | Round down to integer              |
| `ceil`   | `(number) → number`        | Round up to integer                |
| `abs`    | `(number) → number`        | Absolute value                     |
| `min`    | `(...numbers) → number`    | Minimum of arguments               |
| `max`    | `(...numbers) → number`    | Maximum of arguments               |
| `sqrt`   | `(number) → number`        | Square root                        |
| `pow`    | `(number, exponent) → number` | Exponentiation                  |
| `sin`    | `(number) → number`        | Sine (radians)                     |
| `cos`    | `(number) → number`        | Cosine (radians)                   |
| `tan`    | `(number) → number`        | Tangent (radians)                  |
| `log`    | `(number) → number`        | Natural logarithm                  |
| `log10`  | `(number) → number`        | Base-10 logarithm                  |
| `log2`   | `(number) → number`        | Base-2 logarithm                   |
| `exp`    | `(number) → number`        | e raised to the power              |
| `random` | `() → number`              | Random number between 0 and 1 (non-deterministic) |

### String Functions

| Function      | Signature                              | Description                            |
|---------------|----------------------------------------|----------------------------------------|
| `toLowerCase` | `(string) → string`                    | Convert to lowercase                   |
| `toUpperCase` | `(string) → string`                    | Convert to uppercase                   |
| `trim`        | `(string) → string`                    | Remove whitespace from both ends       |
| `trimStart`   | `(string) → string`                    | Remove whitespace from start           |
| `trimEnd`     | `(string) → string`                    | Remove whitespace from end             |
| `startsWith`  | `(string, prefix) → boolean`           | Check if string starts with prefix     |
| `endsWith`    | `(string, suffix) → boolean`           | Check if string ends with suffix       |
| `trimPrefix`  | `(string, prefix) → string`            | Remove prefix if present               |
| `trimSuffix`  | `(string, suffix) → string`            | Remove suffix if present               |
| `index`       | `(string, substring) → number\|null`   | Find first occurrence index (null if not found) |
| `rindex`      | `(string, substring) → number\|null`   | Find last occurrence index (null if not found) |
| `split`       | `(string, delimiter) → array`          | Split string by delimiter              |
| `replace`     | `(string, search, replacement) → string` | Replace first occurrence             |
| `replaceAll`  | `(string, search, replacement) → string` | Replace all occurrences              |
| `substring`   | `(string, start, end?) → string`       | Extract substring                      |
| `slice`       | `(string\|array, start, end?) → string\|array` | Extract slice (works on strings and arrays) |
| `padStart`    | `(string, length, fill?) → string`     | Pad start to length (default fill: " ") |
| `padEnd`      | `(string, length, fill?) → string`     | Pad end to length (default fill: " ")  |
| `repeat`      | `(string, count) → string`             | Repeat string N times                  |
| `includes`    | `(string\|array, item) → boolean`      | Check if string/array contains item    |

### Array Functions

| Function  | Signature                          | Description                           |
|-----------|------------------------------------|---------------------------------------|
| `first`   | `(array) → any`                    | First element (null if empty)         |
| `last`    | `(array) → any`                    | Last element (null if empty)          |
| `limit`   | `(array, n) → array`               | Take first N elements                 |
| `slice`   | `(array, start, end?) → array`     | Extract slice                         |
| `includes`| `(array, item) → boolean`          | Check if array contains item          |
| `join`    | `(array, separator?) → string`     | Join elements to string (default: "") |
| `add`     | `(array) → number\|string`         | Sum numbers or concatenate strings    |
| `unique`  | `(array) → array`                  | Remove duplicates                     |
| `reverse` | `(array) → array`                  | Reverse order (returns new array)     |
| `flatten` | `(array, depth?) → array`          | Flatten nested arrays (default: infinite) |

### Object Functions

| Function      | Signature                          | Description                            |
|---------------|------------------------------------|----------------------------------------|
| `keys`        | `(object) → array`                 | Get object keys                        |
| `values`      | `(object) → array`                 | Get object values                      |
| `entries`     | `(object) → array`                 | Get array of `{key, value}` objects    |
| `fromEntries` | `(array) → object`                 | Create object from `{key, value}` array |
| `has`         | `(object, key) → boolean`          | Check if object has key                |
| `pick`        | `(object, keys) → object`          | Extract specified keys                 |
| `del`         | `(object, key) → object`           | Return object with key removed         |

### Date Functions

| Function      | Signature                  | Description                                |
|---------------|----------------------------|--------------------------------------------|
| `now`         | `() → number`              | Current Unix timestamp in milliseconds (non-deterministic) |
| `parseDate`   | `(string) → number`        | Parse ISO 8601 date string to timestamp    |
| `toISOString` | `(number) → string`        | Convert timestamp to ISO 8601 string       |

### Higher-Order Functions

Higher-order functions accept **lambda functions** as arguments and operate on collections.

| Function     | Signature                                  | Description                                |
|--------------|--------------------------------------------|--------------------------------------------|
| `map`        | `(array, lambda) → array`                  | Transform each element                     |
| `filter`     | `(array, lambda) → array`                  | Keep elements where lambda returns truthy  |
| `find`       | `(array, lambda) → any`                    | Find first element where lambda returns truthy |
| `reduce`     | `(array, lambda, initial?) → any`          | Reduce array to single value               |
| `every`      | `(array, lambda) → boolean`                | Test if all elements match                 |
| `some`       | `(array, lambda) → boolean`                | Test if any element matches                |
| `sort`       | `(array, comparator?) → array`             | Sort array (default: natural order)        |
| `flatMap`    | `(array, lambda) → array`                  | Map and flatten results                    |
| `groupBy`    | `(array, lambda) → object`                 | Group elements by key                      |
| `uniqueBy`   | `(array, lambda) → array`                  | Remove duplicates by key                   |
| `minBy`      | `(array, lambda) → any`                    | Find element with minimum value            |
| `maxBy`      | `(array, lambda) → any`                    | Find element with maximum value            |
| `mapEntries` | `(object, lambda) → object`                | Transform object entries                   |
| `select`     | `(any, lambda) → any\|null`                | Return value if lambda returns truthy, else null |

#### Higher-Order Function Examples

```
// map: transform elements
data.items |> map((x) => x.price * x.qty)
data.items |> map(.price)                    // dot shorthand

// filter: keep matching elements
data.items |> filter((x) => x.price > 100)
data.items |> filter(.active)

// reduce: accumulate values
data.numbers |> reduce((acc, x) => acc + x, 0)

// sort: order elements
data.items |> sort((a, b) => a.price - b.price)

// groupBy: group by key
data.items |> groupBy((x) => x.category)
data.items |> groupBy(.category)

// uniqueBy: deduplicate by key
data.items |> uniqueBy((x) => x.id)
data.items |> uniqueBy(.id)

// minBy/maxBy: find extremes
data.items |> minBy((x) => x.price)
data.items |> maxBy(.priority)

// mapEntries: transform object
state.settings |> mapEntries((e) => { key: e.key, value: e.value * 2 })
```

---

## 6. Path Resolution and Slots

At compile time, all path expressions are extracted and assigned numeric **slot indices**.

### Compilation

Given:

```
state.value > 1 && state.active
```

The compiler extracts:

```
slots: ["state.value", "state.active"]
```

At runtime, the evaluator resolves each slot once from the execution context and stores the values in an indexed array. Bytecode references slots by index, not by path string.

### Slot Resolution

Given a context:

```json
{
  "state": { "value": 5, "active": true },
  "data": {},
  "env": {}
}
```

Slot `0` (`state.value`) resolves to `5`.
Slot `1` (`state.active`) resolves to `true`.

If a path does not exist in the context, the slot resolves to `null`.

---

## 7. Opcode Set

All opcodes operate on an implicit **value stack**. Each opcode documents its stack effect as `(before -- after)`.

### Constants and Loading

| Opcode       | Operands       | Stack Effect     | Description                          |
|--------------|----------------|------------------|--------------------------------------|
| `CONST`      | value: any     | ( -- value)      | Push a constant onto the stack       |
| `LOAD`       | slot: number   | ( -- value)      | Push the value of a slot onto the stack |

### Arithmetic

| Opcode | Operands | Stack Effect       | Description     |
|--------|----------|--------------------|-----------------|
| `ADD`  | —        | (a b -- a+b)       | Add or concatenate |
| `SUB`  | —        | (a b -- a-b)       | Subtract        |
| `MUL`  | —        | (a b -- a*b)       | Multiply        |
| `DIV`  | —        | (a b -- a/b)       | Divide          |
| `MOD`  | —        | (a b -- a%b)       | Modulo          |
| `NEG`  | —        | (a -- -a)          | Negate          |

### String

| Opcode      | Operands | Stack Effect | Description                                       |
|-------------|----------|--------------|---------------------------------------------------|
| `TO_STRING` | —        | (a -- str)   | Coerce value to string (see §2 Template Literals) |

### Comparison

| Opcode | Operands | Stack Effect       | Description            |
|--------|----------|--------------------|------------------------|
| `EQ`   | —        | (a b -- a==b)      | Equal                  |
| `NEQ`  | —        | (a b -- a!=b)      | Not equal              |
| `LT`   | —        | (a b -- a<b)       | Less than              |
| `GT`   | —        | (a b -- a>b)       | Greater than           |
| `LTE`  | —        | (a b -- a<=b)      | Less than or equal     |
| `GTE`  | —        | (a b -- a>=b)      | Greater than or equal  |

### Logical

| Opcode          | Operands       | Stack Effect  | Description                                |
|-----------------|----------------|---------------|--------------------------------------------|
| `NOT`           | —              | (a -- !a)     | Logical not (result is always boolean)     |
| `JUMP_IF_FALSE` | offset: number | (a -- )       | Pop; jump to offset if falsy               |
| `JUMP_IF_TRUE`  | offset: number | (a -- )       | Pop; jump to offset if truthy              |
| `JUMP`          | offset: number | ( -- )        | Unconditional jump to offset               |

### Array and Object Construction

| Opcode       | Operands      | Stack Effect                  | Description                          |
|--------------|---------------|-------------------------------|--------------------------------------|
| `MAKE_ARRAY` | count: number | (v0 v1 ... vN -- array)       | Pop N values, create array           |
| `MAKE_OBJ`   | count: number | (k0 v0 k1 v1 ... -- object)   | Pop N key-value pairs, make object   |
| `SPREAD`     | -             | (collection -- ...elements)   | Expand onto stack (see below)        |

`SPREAD` is only emitted inside `MAKE_ARRAY` or `MAKE_OBJ` sequences. The evaluator tracks spread boundaries to correctly construct the final collection.

#### Compilation Example: Array Spread

```
[1, ...data.items, 2]
```

Compiles to:

```
CONST 0        // 1
LOAD 0         // data.items
SPREAD
CONST 1        // 2
MAKE_ARRAY 3   // 3 segments (1, spread, 2) — actual length resolved at runtime
```

#### Compilation Example: Object Spread

```
{ ...state.user, name: "Bob" }
```

Compiles to:

```
LOAD 0         // state.user
SPREAD
CONST 0        // "name"
CONST 1        // "Bob"
MAKE_OBJ 2     // 2 segments (spread, key-value) — resolved at runtime
```

### Array Access

| Opcode  | Operands      | Stack Effect     | Description                            |
|---------|---------------|------------------|----------------------------------------|
| `INDEX` | index: number | (array -- value) | Access array element at constant index |

### Recursive Descent

| Opcode                       | Operands | Stack Effect            | Description                                              |
|------------------------------|----------|-------------------------|----------------------------------------------------------|
| `RECURSIVE_DESCENT`          | —        | (obj property -- array) | Find all occurrences of property at any depth            |
| `OPTIONAL_RECURSIVE_DESCENT` | —        | (obj property -- array) | Same as RECURSIVE_DESCENT but returns [] on null/error   |

The `RECURSIVE_DESCENT` opcode performs a depth-first traversal of the object structure:

1. Pop property name (string) and object from stack
2. Recursively search for the property at all depths
3. Collect all matching values into an array
4. Push the result array onto the stack

The opcode includes these security protections:
- Maximum recursion depth of 100 levels
- Circular reference detection using a visited set
- Skips dangerous keys (`__proto__`, `constructor`, `prototype`)

#### Compilation Example

```
data..name
```

Compiles to:

```
LOAD 0                    // data
CONST 0                   // "name"
RECURSIVE_DESCENT
RETURN
```

Optional variant:

```
data.users?..email
```

Compiles to:

```
LOAD 0                    // data.users
CONST 0                   // "email"
OPTIONAL_RECURSIVE_DESCENT
RETURN
```

### Function Calls (Pipe)

| Opcode | Operands                  | Stack Effect             | Description                            |
|--------|---------------------------|--------------------------|----------------------------------------|
| `CALL` | name: string, argc: number | (a0 a1 ... aN -- result) | Call built‑in function with N arguments |

The pipe operator compiles to `CALL`. For example:

```
state.value |> toString |> length
```

Compiles to:

```
LOAD 0         // state.value
CALL toString 1
CALL length 1
RETURN
```

With extra arguments:

```
state.value |> round(2)
```

Compiles to:

```
LOAD 0         // state.value
CONST 0        // 2
CALL round 2
RETURN
```

### Mutation (Action Expressions)

These opcodes modify the execution context. They are only emitted for action expressions and may only target paths under `state`.

| Opcode        | Operands     | Stack Effect | Description                                       |
|---------------|--------------|--------------|---------------------------------------------------|
| `SET_PATH`    | slot: number | (value -- )  | Set the value at the slot path                    |
| `DELETE_PATH` | slot: number | ( -- )       | Remove the value at the slot path                 |
| `INC_PATH`    | slot: number | ( -- )       | Increment the number at the slot path by 1        |
| `DEC_PATH`    | slot: number | ( -- )       | Decrement the number at the slot path by 1        |
| `APPEND_PATH` | slot: number | (value -- )  | Append a value to the array at the slot path      |

#### Compilation Examples

Assignment:

```
state.count = state.count + 1
```

Compiles to:

```
LOAD 0         // state.count
CONST 0        // 1
ADD
SET_PATH 0     // write back to state.count
```

Increment shorthand:

```
state.count++
```

Compiles to:

```
INC_PATH 0     // state.count
```

Append:

```
state.items << { name: "new" }
```

Compiles to:

```
CONST 0        // "name"
CONST 1        // "new"
MAKE_OBJ 1
APPEND_PATH 0  // state.items
```

#### Mutation Constraints

- Only `state` paths can be mutated. Writing to `data` or `env` is a compile-time error.
- Mutation opcodes do not push a result onto the stack.
- A single action expression can contain multiple mutations (executed sequentially).
- Mutations are applied immediately to the context — there is no transaction or rollback.

### Control

| Opcode   | Operands | Stack Effect  | Description                              |
|----------|----------|---------------|------------------------------------------|
| `RETURN` | —        | (value -- )   | End execution; top of stack is the result|

---

## 8. Execution Model

### Evaluation Loop

1. The evaluator receives a compiled bytecode program and an execution context.
2. Slots are resolved from the context into an indexed array.
3. The instruction pointer (`ip`) starts at `0`.
4. For each instruction at `ip`:
   - Execute the opcode (push/pop values, perform operations).
   - Advance `ip` (by 1 for most ops, or to the jump target for jump ops).
5. `RETURN` halts execution. The top of the stack is the result.

### Stack

- The stack starts empty.
- After `RETURN`, exactly one value must remain (the result). An empty stack at `RETURN` is a runtime error.
- Stack underflow (popping from empty stack) is a runtime error.

### Short‑Circuit Semantics

`&&` and `||` compile to conditional jumps, not function calls.

`a && b` compiles to:

```
<eval a>
JUMP_IF_FALSE end
<eval b>
JUMP done
end:
CONST false
done:
RETURN
```

`a || b` compiles to:

```
<eval a>
JUMP_IF_TRUE end
<eval b>
JUMP done
end:
CONST true
done:
RETURN
```

### Execution Context

See §0 for the full context specification. Value expressions only read from the context. Action expressions can mutate `state` via mutation opcodes (see §7 Mutation).

---

## 9. Bytecode Format

Compiled expressions are serialized as JSON:

```json
{
  "version": 1,
  "slots": ["state.value", "state.active"],
  "constants": [1, true, false],
  "code": [
    ["LOAD", 0],
    ["CONST", 0],
    ["GT"],
    ["JUMP_IF_FALSE", 7],
    ["LOAD", 1],
    ["JUMP", 8],
    ["CONST", 2],
    ["RETURN"]
  ]
}
```

### Fields

| Field       | Type                  | Description                             |
|-------------|-----------------------|-----------------------------------------|
| `version`   | number                | Bytecode format version                 |
| `slots`     | string[]              | Ordered list of context paths           |
| `constants` | any[]                 | Constant pool; referenced by index      |
| `code`      | instruction[]         | Array of instructions                   |

### Instruction Encoding

Each instruction is an array: `[opcode, ...operands]`.

- Opcodes are strings (for readability in JSON). A binary format may be introduced later.
- Operands for `CONST` and `LOAD` are **indices** into the `constants` and `slots` arrays, respectively.
- Jump targets are **absolute instruction indices** within the `code` array.

---

## 10. Error Model

The expression engine does not throw exceptions. All errors produce an **error result value**.

### Error Result

```json
{ "error": "DIVISION_BY_ZERO", "message": "Division by zero" }
```

### Error Types

| Error               | Trigger                                         |
|---------------------|-------------------------------------------------|
| `TYPE_ERROR`        | Operator applied to wrong type (e.g. `"a" - 1`) |
| `DIVISION_BY_ZERO`  | Division or modulo by zero                       |
| `STACK_UNDERFLOW`   | Pop from empty stack (indicates compiler bug)    |
| `INVALID_SLOT`      | Slot index out of bounds (indicates compiler bug)|
| `INDEX_OUT_OF_BOUNDS` | Array index out of range                       |
| `INVALID_INSTRUCTION`| Unknown opcode (indicates version mismatch)     |

### Error Propagation

If any operation produces an error, the entire expression evaluates to that error. Errors do not propagate through short‑circuit operators — if the short‑circuit branch avoids the error, the expression succeeds.
