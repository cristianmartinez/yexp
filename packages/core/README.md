# yexp

A portable expression language that compiles JavaScript-like syntax to bytecode and evaluates it without `eval()` or generated JavaScript.

## Install

```bash
npm install @cristianmartinez/yexp
```

## Use

```ts
import { compile, evaluate } from '@cristianmartinez/yexp';

const program = compile('$.price * $.quantity');
const result = evaluate(program, { price: 12, quantity: 3 });

console.log(result); // 36
```

Compile once and reuse the program with different inputs:

```ts
const isAdult = compile('$.age >= 18');

evaluate(isAdult, { age: 21 }); // true
evaluate(isAdult, { age: 16 }); // false
```

Auxiliary context and environment values are explicit:

```ts
const program = compile('$.ownerId == $context.userId && $env.region == "eu"');

evaluate(program, { ownerId: 'user_1' }, {
  context: { userId: 'user_1' },
  env: { region: 'eu' },
}); // true
```

## Language

Yexp supports:

- Arithmetic, comparisons, logical operators, null coalescing, and ternaries
- Object, array, string, and template literals
- Property access, optional chaining, wildcards, and recursive descent
- Pipes and method-call syntax
- Lambdas and collection operations such as `map`, `filter`, and `reduce`
- A fixed registry of built-in operations
- Host-provided functions through evaluation options

Equality never coerces operand types: `1 == "1"` is `false`.

## Compilation pipeline

```ts
import { compile, compileAst, parse, tokenize } from '@cristianmartinez/yexp';

const tokens = tokenize('$.items |> length');
const ast = parse(tokens);
const program = compileAst(ast);

// Equivalent convenience API:
const sameProgram = compile('$.items |> length');
```

Compiled programs contain a bytecode version, slots, constants, and instructions. They are JSON-serializable, but applications should treat them as derived artifacts and regenerate them when the bytecode version changes.

## Debug execution

```ts
const program = compile('$.price * 2');

evaluate(program, { price: 10 }, {
  onStep: ({ ip, stack }) => {
    console.log(ip, stack);
  },
});
```

## Security boundary

The default runtime does not expose JavaScript globals, Node.js APIs, the filesystem, `eval()`, or `Function()`.

Yexp is not yet a complete untrusted-code resource sandbox. Some operations can consume significant CPU or memory, and time-dependent or random built-ins are not deterministic. Apply application-level input limits and execution isolation when evaluating expressions supplied by untrusted users. Host functions extend the runtime's authority and must be reviewed as part of the host application's security model.

See the repository's [security documentation](https://github.com/cristianmartinez/yexp/blob/main/docs/security.md) for the current threat model.

## API

- `compile(source)` parses and compiles source text.
- `compileAst(ast)` compiles an existing AST.
- `evaluate(program, input, options?)` evaluates bytecode.
- `run(source, context)` provides the legacy state/data context entry point while the public context model is being consolidated.
- `tokenize(source)` and `parse(tokens)` expose the lower-level frontend.

## CLI

Install [`yexp`](https://www.npmjs.com/package/yexp) globally or run it directly with `npx yexp` for the `yexp` command.

## License

MIT
