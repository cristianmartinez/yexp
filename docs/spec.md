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

### Unary Operators

| Operator | Name        | Operand Type | Result Type |
|----------|-------------|--------------|-------------|
| `-`      | Negate      | number       | number      |
| `!`      | Logical NOT | any          | boolean     |

### Member Access Operators

| Operator | Name            | Example             |
|----------|-----------------|---------------------|
| `.`      | Dot access      | `state.user.name`   |
| `[]`     | Bracket access  | `data.items[0]`     |

Bracket access supports number literals only (for array indexing). Dynamic bracket access (`items[state.i]`) is not supported in this version.

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

| Precedence | Operator(s)             | Associativity |
|------------|-------------------------|---------------|
| 1          | `.` `[]`                | Left          |
| 2          | `!` `-` (unary) `...`  | Right         |
| 3          | `\|>`                  | Left          |
| 4          | `*` `/` `%`            | Left          |
| 5          | `+` `-`                | Left          |
| 6          | `<` `>` `<=` `>=`      | Left          |
| 7          | `==` `!=`              | Left          |
| 8          | `&&`                   | Left          |
| 9          | `\|\|`                 | Left          |

---

## 5. Path Resolution and Slots

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

## 6. Opcode Set

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

## 7. Execution Model

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

See §0 for the full context specification. Value expressions only read from the context. Action expressions can mutate `state` via mutation opcodes (see §6 Mutation).

---

## 8. Bytecode Format

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

## 9. Error Model

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
