# Yexp Language Specification

**Language version:** 0.1 (draft)

**Reference implementation:** `packages/core`

**Status:** The syntax and behavior described here match the current TypeScript runtime. Sections marked as compatibility behavior are not part of the preferred public evaluation model.

Yexp is a small expression language for querying, transforming, and validating JSON-like data. It borrows the readable surface of JavaScript, then adds the concise navigation and transformation tools expected from dedicated query languages.

```yexp
$.orders[.status == "paid"]
  |> groupBy(.customer)
  |> mapEntries(entry => {
    key: entry.key,
    value: {
      orders: entry.value |> length,
      total: entry.value |> map(.amount) |> add
    }
  })
```

Yexp is not JavaScript. It has no statements, classes, imports, prototypes, global object, or arbitrary code execution. A Yexp program is one expression compiled to versioned, reusable bytecode and evaluated against an explicit input.

## 1. What makes Yexp distinctive

Yexp deliberately combines ideas that usually live in separate tools:

- **JavaScript-shaped expressions:** property access, arithmetic, ternaries, object and array literals, template strings, and arrow lambdas.
- **Quick-query selectors:** negative indices, wildcard projection, inline predicate selection, recursive descent, and jq-style dot lambdas.
- **Composable transformations:** the same operation can be written as a function, a pipe, or familiar method-style syntax.
- **One language across application and terminal:** the core runtime embeds in TypeScript applications, while the CLI evaluates the same expressions over JSON and NDJSON streams.
- **Compiled, inspectable execution:** source becomes an AST and versioned bytecode rather than being passed to `eval()` or generated JavaScript.

The distinctive part is the combination. Yexp keeps common expressions familiar while making data queries substantially shorter:

```yexp
// Explicit JavaScript-style lambda
$.products.filter(product => product.inStock && product.price < 100)

// Query-language shorthand
$.products[.inStock && .price < 100]

// Project a field from every match
$.products[.inStock && .price < 100][*].name
```

Comments are shown in documentation for explanation; comments are not valid inside a Yexp expression.

## 2. Evaluation model

### 2.1 One expression, one result

A source program contains exactly one expression. Evaluation returns one Yexp value or one structured error.

```yexp
1 + 2 * 3
// result: 7
```

There are no variable declarations or statement blocks. Lambdas introduce parameters only inside their expression body.

### 2.2 Explicit inputs

The public evaluation model has three explicit roots:

| Root | Meaning | Required |
| --- | --- | --- |
| `$` | Primary input value | Yes |
| `$context` | Auxiliary application data | No; absent means `null` |
| `$env` | Explicit environment data | No; absent means `null` |

```ts
const program = compile(
  '$.price * (1 + $context.taxRate) * $env.currencyScale',
);

evaluate(program, { price: 100 }, {
  context: { taxRate: 0.21 },
  env: { currencyScale: 1 },
}); // 121
```

`$` always continues to mean the primary input, including inside nested lambdas. Lambda parameters use their declared names.

```yexp
$.groups.map(group =>
  group.values.map(value => value * $.multiplier)
)
```

### 2.3 Compilation and reuse

An implementation parses and compiles source before evaluation:

```text
source -> tokens -> AST -> bytecode -> result
```

Compiled programs contain a bytecode version, constants, slots, and instructions. They are JSON-serializable derived artifacts. Applications may compile once and evaluate the same program against many inputs.

## 3. Value model

Yexp values are JSON-shaped:

| Type | Examples |
| --- | --- |
| `null` | `null` |
| `boolean` | `true`, `false` |
| `number` | `0`, `-12`, `3.14` |
| `string` | `"hello"`, `'hello'`, `` `hello` `` |
| `array` | `[1, 2, 3]` |
| `object` | `{ name: "Ada", active: true }` |

Lambdas and structured runtime errors are internal runtime values. They are not ordinary JSON output values.

Object iteration follows the 0.1 reference order: integer-index keys in ascending numeric order, followed by other string keys in insertion order. This order is observable through wildcards, `keys`, `values`, `entries`, `mapEntries`, and recursive descent.

### 3.1 Numbers

Numbers follow IEEE 754 double-precision behavior in language version 0.1. Arithmetic requires numeric operands, except that `+` also concatenates two strings.

```yexp
10 + 2       // 12
"a" + "b"  // "ab"
"1" + 2     // TYPE_ERROR
```

Division or modulo by zero returns `DIVISION_BY_ZERO`.

### 3.2 Strings

Single and double quotes create strings. The escapes `\n`, `\t`, `\r`, and `\\` are recognized. Backticks create template strings:

```yexp
`Hello, ${$.user.name}. Total: ${$.items |> map(.price) |> add}`
```

Interpolated values are converted with `toString`. In the 0.1 reference runtime, string length and indexing follow JavaScript UTF-16 code-unit behavior.

### 3.3 Missing values

Yexp has no source literal named `undefined`. A missing property resolves to `null`:

```yexp
$.user.nickname             // null when absent
$.user.nickname ?? "Guest" // "Guest"
```

### 3.4 Equality

Yexp never coerces operand types for equality. In language version 0.1, `==` and `===` have the same behavior; `!=` and `!==` also have the same behavior.

```yexp
1 == 1       // true
1 == "1"    // false
0 == false   // false
null == null // true
```

Arrays and objects compare by runtime identity, not by deep structural equality.

### 3.5 Truthiness

Only `null` and `false` are falsy. Every other value is truthy, including `0`, `""`, `[]`, and `{}`.

Like JavaScript, `&&` and `||` return the selected operand and short-circuit. Yexp applies its own truthiness rule when selecting that operand.

```yexp
0 && true   // true
null || 0   // 0
```

Use `??` when selecting a fallback value:

```yexp
$.count ?? 0
```

## 4. Learn Yexp from simple to complex

The examples in this section form the recommended learning path.

### 4.1 Calculate a value

```yexp
($.price * $.quantity) |> round(2)
```

Property access starts at `$`. Parentheses control grouping.

### 4.2 Read nested data safely

```yexp
$.user.profile?.displayName ?? "Anonymous"
```

Optional access returns `null` instead of an access error. Null coalescing supplies a default without treating `0`, `false`, or `""` as missing.

### 4.3 Read from the end of an array

```yexp
$.events[-1]
```

Negative indices count from the end: `-1` is the last value and `-2` is the value before it.

### 4.4 Filter a collection

Arrow lambdas are familiar to JavaScript users:

```yexp
$.products.filter(product => product.inStock && product.price < 100)
```

Dot shorthand makes common data predicates shorter:

```yexp
$.products.filter(.inStock && .price < 100)
```

Predicate selectors make the query more compact again:

```yexp
$.products[.inStock && .price < 100]
```

All three expressions have the same filtering intent.

### 4.5 Project values with a wildcard

```yexp
$.products[.inStock && .price < 100][*].name
```

`[*]` exposes the selected collection for property projection. The result is an array of names.

### 4.6 Transform records

```yexp
$.products
  |> filter(.inStock)
  |> map(product => {
    label: `${product.name} - $${product.price}`,
    category: product.category ?? "other"
  })
```

Pipes pass the value on their left as the first argument to the function on their right.

### 4.7 Aggregate data

```yexp
$.orders
  |> filter(.status == "paid")
  |> reduce((total, order) => total + order.amount, 0)
  |> round(2)
```

### 4.8 Query an unknown tree

```yexp
$..email |> unique
```

Recursive descent searches objects and arrays at any depth and returns every own `email` property it finds.

### 4.9 Build a report

```yexp
$.orders[.status == "paid"]
  |> groupBy(.customer)
  |> mapEntries(entry => {
    key: entry.key,
    value: {
      orders: entry.value |> length,
      total: entry.value |> map(.amount) |> add
    }
  })
```

Given paid orders for Ada (`25`, `75`) and Linus (`50`), the result is:

```json
{
  "Ada": { "orders": 2, "total": 100 },
  "Linus": { "orders": 1, "total": 50 }
}
```

This example combines a predicate selector, pipe composition, a shorthand lambda, grouping, object transformation, projection, and aggregation.

## 5. Syntax reference

### 5.1 Literals and construction

```yexp
42
-3.14
true
false
null
"double quoted"
'single quoted'
`template ${$.value}`
[1, 2, $.value]
{ name: $.name, active: true }
```

Object keys in literals are unquoted identifiers. Computed keys are not supported. A later property overwrites an earlier property with the same key.

### 5.2 Spread

Spread is valid in arrays, objects, and function arguments:

```yexp
[...$.items, $.newItem]
{ ...$.defaults, ...$.overrides, enabled: true }
max(...$.scores)
```

Array spread expands arrays. Object spread copies object properties and ignores non-object sources. Function spread expands arrays into positional arguments.

### 5.3 Property and index access

```yexp
$.user.name
$.items[0]
$.lookup[$context.key]
$.items[-1]
$.text[-1]
$.items.length
```

A missing object property returns `null`. A literal non-negative array or string index that is out of bounds also resolves to `null` through path lookup. An out-of-bounds dynamic index or negative index returns `INDEX_OUT_OF_BOUNDS`. Use optional index access when a stable `null` result is required.

### 5.4 Optional access

```yexp
$.user?.profile?.name
$.items?.[0]
$.items?.[-1]
```

Optional access returns `null` when the receiver is null, invalid, or out of bounds.

### 5.5 Wildcard projection

```yexp
$.users[*].name
$.users?.[*].name
$.settings[*]
```

For arrays, `[*]` preserves the elements. For objects, it returns the values in object enumeration order. For a primitive, it returns a one-element array. The optional form returns `[]` for `null`.

Property access after a wildcard maps that property over the result while preserving nested array structure.

### 5.6 Predicate selection

```yexp
$.users[.active]
$.users[.age >= 18 && .country == "NL"]
$.users?.[.active]
```

`collection[.predicate]` is shorthand for filtering the collection with an implicit `$it` parameter. The optional form returns `[]` for a null collection.

### 5.7 Recursive descent

```yexp
$..id
$.payload..name
$.payload?..name
```

`value..property` performs a depth-first search through arrays and objects and collects matching own properties. Dangerous prototype-related keys are not traversed. The optional form returns `[]` for `null` or invalid input.

### 5.8 Lambdas

```yexp
item => item.price
(item) => item.price
(total, item) => total + item.price
() => $.defaultValue
```

A lambda body is one expression. Parameters shadow parameters with the same name in an outer lambda for the duration of the call. `$`, `$context`, and `$env` retain their root meanings.

Dot shorthand creates a one-parameter lambda named internally as `$it`:

```yexp
.price             // equivalent to: item => item.price
.price < 100       // equivalent to: item => item.price < 100
.profile?.name     // equivalent to: item => item.profile?.name
```

Dot shorthand is a lambda, not root access in the core language. The CLI separately accepts a leading `.` as convenience syntax and rewrites `.name` to `$.name`.

### 5.9 Calls, methods, and pipes

These forms are equivalent when `items` is the first argument:

```yexp
filter($.items, .active)
$.items |> filter(.active)
$.items.filter(.active)
```

Method syntax is syntax sugar for a pipe; Yexp does not perform prototype lookup or dynamic method dispatch.

Pipes bind more tightly than arithmetic in language version 0.1. Parenthesize a calculated value before piping it:

```yexp
($.subtotal + $.tax) |> round(2)
```

### 5.10 Conditional expressions

```yexp
$.age >= 18 ? "adult" : "minor"
$.nickname ?? $.name ?? "Guest"
```

Only the selected ternary branch is evaluated. `??` evaluates its right side only when its left side is `null`.

### 5.11 Operators

| Category | Operators | Behavior |
| --- | --- | --- |
| Arithmetic | `+ - * / %` | Numbers; `+` also accepts two strings |
| Comparison | `< <= > >=` | Numbers only |
| Equality | `== != === !==` | No type coercion |
| Logical | <code>&amp;&amp; &#124;&#124; !</code> | `&&` and `||` select operands; all short-circuit |
| Fallback | `??` | Uses right side only for `null` |
| Conditional | `? :` | Selects one branch |
| Pipe | <code>&#124;&gt;</code> | Passes left value as first function argument |
| Spread | `...` | Expands array/object/argument values |

From highest to lowest, operator precedence is:

1. member access, indexing, calls, postfix `++` and `--`
2. unary `!` and `-`
3. pipe `|>`
4. `*`, `/`, `%`
5. `+`, `-`
6. `<`, `<=`, `>`, `>=`
7. `==`, `!=`, `===`, `!==`
8. `&&`
9. `||`
10. `??`
11. `? :`
12. assignment `=`, append `<<`
13. lambda `=>`

Use parentheses whenever precedence would make the intent unclear.

## 6. Built-in functions

`value` below means the first positional argument. Every function can use direct-call syntax. Functions that naturally receive a value first can also use pipe or method syntax.

### 6.1 Type and conversion

| Function | Result |
| --- | --- |
| `type(value)` | `"null"`, `"array"`, or the runtime type name |
| `toString(value)` | String representation |
| `length(value)` | Length of a string or array |

### 6.2 Numbers

| Function | Result |
| --- | --- |
| `round(value, decimals?)` | Rounded number; zero decimals by default |
| `floor(value)`, `ceil(value)`, `abs(value)` | Standard numeric operation |
| `min(...numbers)`, `max(...numbers)` | Smallest or largest argument |
| `sqrt(value)`, `pow(value, exponent)` | Root and exponentiation |
| `sin(value)`, `cos(value)`, `tan(value)` | Trigonometric operation |
| `log(value)`, `log10(value)`, `log2(value)`, `exp(value)` | Logarithmic/exponential operation |
| `random()` | Pseudorandom number in `[0, 1)` |

### 6.3 Strings

| Function | Result |
| --- | --- |
| `includes(value, text)` | Whether a string contains text |
| `startsWith(value, prefix)`, `endsWith(value, suffix)` | Prefix/suffix test |
| `trimPrefix(value, prefix)`, `trimSuffix(value, suffix)` | Remove one matching boundary |
| `toLowerCase(value)`, `toUpperCase(value)` | Case conversion |
| `index(value, text)`, `rindex(value, text)` | First/last index, or `null` |
| `split(value, delimiter)` | Array of parts |
| `replace(value, search, replacement)` | Replace first match |
| `replaceAll(value, search, replacement)` | Replace all matches |
| `slice(value, start, end?)`, `substring(value, start, end?)` | Extract text |
| `trim(value)`, `trimStart(value)`, `trimEnd(value)` | Remove whitespace |
| `padStart(value, length, fill?)`, `padEnd(value, length, fill?)` | Pad text |
| `repeat(value, count)` | Repeat text |

### 6.4 Arrays and collections

| Function | Result |
| --- | --- |
| `slice(value, start, end?)` | Array slice |
| `includes(value, item)` | Membership test |
| `add(value)` | Sum numbers or concatenate strings; `null` for `[]` |
| `concat(...values)` | Concatenate arrays and append scalar values |
| `unique(value)` | Remove repeated values |
| `reverse(value)` | Reversed copy |
| `flatten(value, depth?)` | Flatten nested arrays; maximum depth is 100 |
| `first(value)`, `last(value)` | Boundary element or `null` |
| `limit(value, count)` | First `count` values |
| `join(value, separator?)` | Join values as text |
| `filter(value, predicate)` | Values whose predicate is truthy |
| `map(value, transform)` | Transformed values |
| `find(value, predicate)` | First match or `null` |
| `reduce(value, reducer, initial?)` | Accumulated result; initial defaults to `null` |
| `every(value, predicate)`, `some(value, predicate)` | Universal/existential test |
| `sort(value, comparator?)` | Sorted copy |
| `flatMap(value, transform)` | Map and flatten one level |
| `groupBy(value, keySelector)` | Object of arrays keyed by stringified selector results |
| `uniqueBy(value, keySelector)` | First value for each stringified key |
| `minBy(value, selector)`, `maxBy(value, selector)` | Item with smallest/largest numeric selected value |

### 6.5 Objects

| Function | Result |
| --- | --- |
| `keys(value)`, `values(value)` | Object keys or values |
| `entries(value)` | Array of `{ key, value }` objects |
| `fromEntries(value)` | Object built from `{ key, value }` objects |
| `mapEntries(value, transform)` | Object built from transformed entries |
| `del(value, key)` | Copy without one key |
| `pick(value, keys)` | Copy containing selected keys |
| `has(value, key)` | Whether the key exists |
| `select(value, predicate)` | Original value when truthy, otherwise `null` |

### 6.6 Dates and time

| Function | Result |
| --- | --- |
| `now()` | Current Unix time in milliseconds |
| `parseDate(value)` | Timestamp parsed from a date string |
| `toISOString(value)` | ISO 8601 string from a timestamp |

`random()` and `now()` are intentionally nondeterministic. Programs that require repeatable results must avoid them or replace them with host-provided functions/data.

### 6.7 Host functions

Applications may extend or override the function registry through evaluation options. Host functions expand Yexp's authority and portability contract; the host is responsible for their safety and for providing equivalent behavior on every target.

The CLI adds filesystem-oriented functions such as `glob`, `read`, `lines`, and `grep`. They are host functions, not portable core-language built-ins.

## 7. Errors

Lexing, parsing, and compilation failures throw phase-specific errors. Evaluation failures return a structured value:

```ts
{
  error: 'TYPE_ERROR',
  message: 'Cannot add string and number'
}
```

The 0.1 runtime error categories are:

- `TYPE_ERROR`
- `DIVISION_BY_ZERO`
- `STACK_UNDERFLOW`
- `INVALID_SLOT`
- `INDEX_OUT_OF_BOUNDS`
- `INVALID_INSTRUCTION`
- `PARSE_ERROR`
- `COMPILE_ERROR`

Errors propagate out of the current evaluation. They are not truthy data values for normal language operations.

## 8. Safety and portability

The core runtime exposes no JavaScript globals, filesystem, network, `eval()`, or `Function()`. Object construction and traversal block `__proto__`, `constructor`, and `prototype` where they could cross the prototype boundary.

Yexp is an expression evaluator, not a complete resource sandbox. Large collections, nested transformations, host functions, and some built-ins can consume substantial CPU or memory. Hosts evaluating untrusted expressions must apply input limits, execution limits, and isolation appropriate to their environment.

Portable programs should:

- use only this value model and the portable built-in registry;
- pass changing values through `$context` or `$env` rather than ambient globals;
- avoid `random()` and `now()` when deterministic results matter;
- avoid depending on host functions unless every target implements the same contract;
- treat compiled bytecode as versioned derived output, not hand-authored source.

## 9. Compatibility action expressions

The parser and VM currently retain a legacy context model with `state`, `data`, and `env` roots. In that model only `state` paths may be mutated:

```yexp
state.count = state.count + 1
state.count++
state.count--
state.items << { name: "new" }
```

These action expressions return `null`. Assignment to other roots is a compile error. They exist for compatibility with `run(source, executionContext)` and are not part of the preferred `$`-rooted query model. New portable programs should return transformed values instead of mutating input.

The TypeScript reference runtime currently detects the legacy overload by looking for a top-level `state`, `data`, or `env` key. Consequently, passing an ordinary primary input object with one of those keys directly to `evaluate` is ambiguous in version 0.1. This is a host API compatibility limitation, not a language rule, and should not be reproduced by new platform ports.

## 10. Grammar sketch

This grammar is descriptive. The parser and the conformance tests are the executable reference while version 0.1 remains a draft.

```ebnf
expression       = lambda | assignment | conditional ;
lambda           = identifier "=>" expression
                 | "(" [ identifier { "," identifier } ] ")" "=>" expression ;
assignment       = conditional [ ( "=" | "<<" ) assignment ] ;
conditional      = coalesce [ "?" expression ":" expression ] ;
coalesce         = logical_or { "??" logical_or } ;
logical_or       = logical_and { "||" logical_and } ;
logical_and      = equality { "&&" equality } ;
equality         = comparison { ( "==" | "!=" | "===" | "!==" ) comparison } ;
comparison       = additive { ( "<" | "<=" | ">" | ">=" ) additive } ;
additive         = multiplicative { ( "+" | "-" ) multiplicative } ;
multiplicative   = pipe { ( "*" | "/" | "%" ) pipe } ;
pipe             = unary { "|>" identifier [ arguments ] } ;
unary            = ( "!" | "-" ) unary | postfix ;
postfix          = primary { member | index | wildcard | predicate | descent | arguments }
                   [ "++" | "--" ] ;
member           = ( "." | "?." ) identifier ;
index            = "[" expression "]" | "?.[" expression "]" ;
wildcard         = "[*]" | "?.[*]" ;
predicate        = "[" dot_lambda "]" | "?.[" dot_lambda "]" ;
descent          = ".." identifier | "?.." identifier ;
arguments        = "(" [ expression { "," expression } ] ")" ;
primary          = number | string | template | "true" | "false" | "null"
                 | identifier | array | object | "(" expression ")" ;
array            = "[" [ expression { "," expression } ] "]" ;
object           = "{" [ object_entry { "," object_entry } ] "}" ;
object_entry     = identifier [ ":" expression ] | "..." expression ;
dot_lambda       = dot_expression ;
```

Within a `dot_expression`, a leading member such as `.price` is parsed as `$it.price`; subsequent leading-dot members in that expression use the same implicit parameter. Otherwise a dot expression follows the normal expression grammar.

Identifiers begin with an ASCII letter, `_`, or `$`, followed by ASCII letters, digits, `_`, or `$`. Whitespace may appear between tokens. Number, string, and template lexical forms are defined in Sections 3.1 and 3.2. Comments are not part of the grammar.

## 11. Conformance requirements

A conforming Yexp 0.1 implementation must agree on:

1. tokenization and parse acceptance;
2. operator precedence and short-circuit behavior;
3. the value, missing-value, equality, and truthiness rules;
4. selector ordering and nested projection shape;
5. built-in names, arity behavior, return values, and errors;
6. the explicit `$`, `$context`, and `$env` roots;
7. structured runtime error categories;
8. bytecode version rejection or migration behavior.

Platform ports should be built from this contract and a shared conformance corpus. A port may use a different internal VM or native representation, but observable language behavior must match.
