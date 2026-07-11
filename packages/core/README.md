# yexp

A fast, portable JSON expression language with bytecode compilation.

## Features

- 🚀 **Fast**: Compiles expressions to bytecode for optimal performance
- 🔒 **Safe**: No arbitrary code execution, bounded and deterministic
- 📦 **Portable**: Pure TypeScript, runs anywhere
- 🎯 **Type-safe**: Full TypeScript support with strict types
- 🔄 **Serializable**: Expressions compile to JSON-serializable bytecode

## Installation

```bash
npm install yexp
# or
bun add yexp
```

## Quick Start

```typescript
import { compile, evaluate } from 'yexp';

// Compile expression to bytecode
const program = compile('user.age > 18 && user.verified');

// Evaluate with context
const result = evaluate(program, {
  user: { age: 25, verified: true }
});

console.log(result); // true
```

## Usage

### Basic Expressions

```typescript
import { compile, evaluate } from 'yexp';

// Arithmetic
compile('price * (1 + tax)');
evaluate(program, { price: 100, tax: 0.1 }); // 110

// String operations
compile('user.name.toUpperCase()');
evaluate(program, { user: { name: 'Alice' } }); // "ALICE"

// Array operations
compile('items.filter(x => x.price > 10).map(x => x.name)');
```

### Compilation Pipeline

```typescript
import { tokenize, parse, compile } from 'yexp';

// 1. Tokenize
const tokens = tokenize('user.age > 18');

// 2. Parse to AST
const ast = parse(tokens);

// 3. Compile to bytecode
const program = compile('user.age > 18');
// Or: const program = compileAST(ast);
```

### Execution Context

```typescript
const program = compile('state.count + data.value');

const result = evaluate(program, {
  state: { count: 10 },
  data: { value: 5 }
}); // 15
```

### Debug Mode

```typescript
import { evaluate } from 'yexp';

const program = compile('x * 2 + y');

evaluate(program, { x: 5, y: 3 }, {
  onStep: (state) => {
    console.log('IP:', state.ip);
    console.log('Stack:', state.stack);
  }
});
```

## Expression Syntax

### Operators

- Arithmetic: `+`, `-`, `*`, `/`, `%`, `**`
- Comparison: `==`, `!=`, `<`, `<=`, `>`, `>=`
- Logical: `&&`, `||`, `!`
- Ternary: `condition ? true_value : false_value`

### Property Access

```typescript
// Dot notation
user.profile.name

// Bracket notation
user["profile"]["name"]

// Array indexing
users[0].name
```

### Built-in Functions

```typescript
// String methods
str.toUpperCase()
str.toLowerCase()
str.trim()
str.split(separator)
str.includes(substring)

// Array methods
arr.map(x => x * 2)
arr.filter(x => x > 10)
arr.reduce((a, b) => a + b, 0)
arr.length
arr.includes(value)

// Object methods
Object.keys(obj)
Object.values(obj)
Object.entries(obj)
```

## Performance

Yexp uses bytecode compilation for optimal performance:

```typescript
const program = compile('user.age > 18'); // Compile once

// Evaluate many times (fast!)
for (const user of users) {
  const result = evaluate(program, { user });
}
```

Benchmark: ~0.1-0.3µs per evaluation on modern hardware.

## Safety Guarantees

- ✅ No arbitrary code execution
- ✅ Deterministic evaluation
- ✅ Bounded computation (no loops or recursion)
- ✅ Serializable bytecode
- ✅ Frontend/backend parity

## API Reference

### `compile(expression: string): BytecodeProgram`

Compiles an expression string to bytecode.

### `evaluate(program: BytecodeProgram, context: ExecutionContext, options?: EvalOptions): ExprValue`

Evaluates a compiled program with the given context.

### `tokenize(expression: string): Token[]`

Tokenizes an expression string.

### `parse(tokens: Token[]): ASTNode`

Parses tokens into an AST.

## TypeScript Support

Full type definitions included:

```typescript
import type {
  BytecodeProgram,
  ExecutionContext,
  ExprValue,
  ASTNode,
  Token
} from 'yexp';
```

## License

MIT

## Links

- [GitHub Repository](https://github.com/cristianmartinez/yexp)
- [CLI Tool](yexp-cli)
- [Documentation](https://github.com/cristianmartinez/yexp#readme)
