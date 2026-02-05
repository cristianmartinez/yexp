# Feature Comparison: Jext vs JSONata

## What Jext Has ✅

| Feature | Jext | JSONata |
|---------|------|---------|
| Property access | `data.name` | `data.name` |
| Array indexing | `items[0]` | `items[0]` |
| Negative indexing | `items[-1]` | ❌ |
| Array methods | `.filter()`, `.map()` | `.filter()`, `.map()` |
| Lambda functions | `x => x.age` | `function($x) { $x.age }` |
| Arithmetic | `+`, `-`, `*`, `/`, `%` | ✅ |
| Comparisons | `==`, `<`, `>`, etc. | ✅ |
| Logical operators | `&&`, `\|\|`, `!` | `and`, `or`, `not` |
| Optional chaining | `data?.user?.name` | Automatic |
| Template strings | `` `Hello ${name}` `` | ❌ (uses `&`) |
| Ternary operator | `a ? b : c` | `a ? b : c` |
| JSON serializable | ✅ (bytecode) | ❌ (AST) |
| Performance | ⚡ 0.3-0.5µs | 🐢 0.6-2.0µs |

---

## What JSONata Has (That Jext Doesn't) ❌

### 1. **Recursive Descent / Wildcards**
```javascript
// JSONata
Account.Order.**.Price  // Get all Prices recursively
*.name                   // All name properties at this level

// Jext: ❌ Not supported (yet)
```

### 2. **String Concatenation Operator**
```javascript
// JSONata
firstName & " " & lastName  // String concat with &

// Jext
`${firstName} ${lastName}`  // Template strings (different syntax)
```

### 3. **Array Range Operator**
```javascript
// JSONata
[1..10]        // [1,2,3,4,5,6,7,8,9,10]
[1..10].($*$)  // [1,4,9,16,25,36,49,64,81,100]

// Jext: ❌ Not supported
```

### 4. **Extensive Built-in Functions**

JSONata has 60+ built-in functions:

**String Functions:**
```javascript
$uppercase("hello")      → "HELLO"
$lowercase("HELLO")      → "hello"
$substring("hello", 0, 2) → "he"
$split("a,b,c", ",")     → ["a","b","c"]
$join(["a","b"], ",")    → "a,b,c"
$trim("  hello  ")       → "hello"
$pad("5", 3, "0")        → "005"
```

**Array Functions:**
```javascript
$count([1,2,3])          → 3
$append([1,2], 3)        → [1,2,3]
$distinct([1,2,2,3])     → [1,2,3]
$reverse([1,2,3])        → [3,2,1]
$shuffle([1,2,3])        → [2,3,1] (random)
$sort([3,1,2])           → [1,2,3]
$zip([1,2], [3,4])       → [[1,3], [2,4]]
```

**Numeric/Aggregation:**
```javascript
$sum([1,2,3])            → 6
$max([1,5,3])            → 5
$min([1,5,3])            → 1
$average([1,2,3])        → 2
$round(3.14159, 2)       → 3.14
$power(2, 3)             → 8
$sqrt(16)                → 4
```

**Date/Time:**
```javascript
$now()                   → "2024-01-01T12:00:00.000Z"
$fromMillis(0)           → "1970-01-01T00:00:00.000Z"
$toMillis("2024-01-01")  → 1704067200000
```

**Higher-Order Functions:**
```javascript
$map([1,2,3], function($x) { $x * 2 })
$filter([1,2,3,4], function($x) { $x > 2 })
$reduce([1,2,3], function($a, $b) { $a + $b }, 0)
$sift(obj, function($v, $k) { $v > 10 })
```

**Jext:** Only has built-in array methods (filter, map, etc.) via JS

---

### 5. **Object Construction**
```javascript
// JSONata
{
  "fullName": firstName & " " & lastName,
  "age": age,
  "isAdult": age >= 18
}

// Jext: ❌ Can't construct objects in expressions
```

### 6. **Regex Support**
```javascript
// JSONata
$match("hello world", /w.*d/)  → ["world"]
$replace("hello", /l/g, "r")   → "herro"

// Jext: ❌ No regex
```

### 7. **Pattern Matching / Conditionals**
```javascript
// JSONata - Case expression
(
  $value := score;
  $value >= 90 ? "A" :
  $value >= 80 ? "B" :
  $value >= 70 ? "C" : "F"
)

// Jext: Can use ternary but no multi-case
score >= 90 ? "A" : score >= 80 ? "B" : "C"  // Nested ternary (ugly)
```

### 8. **Parent References**
```javascript
// JSONata
Account.Order[Product.Price > %.MinPrice]
// % refers to parent context

// Jext: ❌ Not supported
```

### 9. **Transform Operator**
```javascript
// JSONata
Account.Order ~> $map(function($v) { $v.Price * 1.1 })

// Jext: Use regular .map()
Account.Order.map(v => v.Price * 1.1)
```

### 10. **Function Definitions**
```javascript
// JSONata - Define custom functions
(
  $square := function($x) { $x * $x };
  [1..5].$square($)
)

// Jext: ❌ Can't define functions in expressions
```

### 11. **Grouping & Aggregation**
```javascript
// JSONata
Account.Order{
  Product.Category: $sum(Price)
}

// Jext: ❌ No grouping syntax
```

---

## Philosophy Differences

### JSONata Philosophy:
- **Transformation-focused**: Reshape and aggregate data
- **SQL-like queries**: Grouping, aggregation, joins
- **Rich function library**: Batteries included
- **Complex expressions**: Full programming language

### Jext Philosophy:
- **Expression-focused**: Evaluate conditions and simple transforms
- **JavaScript-like**: Familiar syntax for JS developers
- **Minimal core**: Small, fast, composable
- **Serializable**: JSON bytecode for caching/distribution

---

## Should Jext Add These Features?

| Feature | Priority | Complexity | Notes |
|---------|----------|------------|-------|
| Recursive descent `**` | 🟡 Medium | Hard | Useful for deeply nested data |
| String concat `&` | 🟢 Low | Easy | Already have template strings |
| Range `[1..10]` | 🟢 Low | Easy | Nice syntactic sugar |
| Built-in functions | 🟡 Medium | Medium | Start with common ones |
| Object construction | 🔴 High | Hard | Changes execution model |
| Regex | 🟡 Medium | Medium | Useful for string matching |
| Parent refs `%` | 🟢 Low | Medium | Good for nested queries |
| Custom functions | 🔴 High | Hard | Security implications |
| Grouping | 🔴 High | Hard | Complex feature |

---

## Jext's Advantages Over JSONata

1. ✅ **Much faster** (2-6x)
2. ✅ **Serializable bytecode** (can cache as JSON)
3. ✅ **Simpler** (smaller learning curve)
4. ✅ **JavaScript-like** (familiar to devs)
5. ✅ **Negative indexing** (`arr[-1]`)
6. ✅ **Template strings** (cleaner than `&`)
7. ✅ **Smaller runtime** (less code to load)

---

## Recommendation

**Keep Jext focused on:**
- Fast expression evaluation
- User rules & conditions
- Simple transformations
- JavaScript familiarity

**Add selectively:**
- Common built-in functions ($sum, $max, etc.)
- Range operator `[1..10]`
- Recursive descent `**` (if needed)

**Don't add:**
- Object construction (breaks serialization model)
- Custom function definitions (security risk)
- Complex SQL-like features (scope creep)

**Jext's niche:** Fast, safe, cacheable expressions for user-defined rules.
**JSONata's niche:** Complex data transformations and aggregations.

Different tools for different jobs! 🎯
