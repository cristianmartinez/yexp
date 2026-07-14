# Yexp

[![CI](https://github.com/cristianmartinez/yexp/actions/workflows/ci.yml/badge.svg)](https://github.com/cristianmartinez/yexp/actions/workflows/ci.yml)
[![npm core](https://img.shields.io/npm/v/@cristianmartinez/yexp?label=core)](https://www.npmjs.com/package/@cristianmartinez/yexp)
[![npm CLI](https://img.shields.io/npm/v/@cristianmartinez/yexp-cli?label=cli)](https://www.npmjs.com/package/@cristianmartinez/yexp-cli)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Yexp is a compact expression language for querying, transforming, and validating JSON-like data. It keeps familiar JavaScript-shaped expressions while adding query-language features such as inline predicates, wildcard projections, negative indices, recursive descent, and pipelines.

```yexp
$.products[.inStock && .price < 100][*].name
```

Yexp compiles source into versioned, inspectable bytecode. It does not pass expressions to `eval()` or generate JavaScript.

## Install

Embed the language in a TypeScript or JavaScript application:

```bash
npm install @cristianmartinez/yexp
```

Use the terminal CLI without installing it globally:

```bash
printf '{"name":"Ada"}\n' | npx @cristianmartinez/yexp-cli '.name'
```

## Quick start

```ts
import { compile, evaluate } from '@cristianmartinez/yexp';

const query = compile('$.products[.inStock && .price < 100][*].name');
const result = evaluate(query, {
  products: [
    { name: 'Mouse', price: 25, inStock: true },
    { name: 'Laptop', price: 999, inStock: true },
  ],
});

console.log(result); // ["Mouse"]
```

## What makes Yexp different

- **Familiar expressions:** property access, literals, templates, ternaries, and arrow lambdas use JavaScript-shaped syntax.
- **Query-native navigation:** predicate selectors, wildcards, negative indices, recursive descent, and pipes keep data work concise.
- **Compiled execution:** source becomes an AST and versioned bytecode that can be cached, serialized, and inspected.
- **Explicit authority:** the portable core has no filesystem, network, or ambient JavaScript globals. Hosts opt into additional functions.
- **Application and terminal parity:** the embedded runtime and CLI evaluate the same language.

## Repository

| Area | Purpose |
| --- | --- |
| [`packages/core`](packages/core) | Lexer, parser, compiler, VM, public API, and conformance tests |
| [`packages/cli`](packages/cli) | Streaming JSON/NDJSON terminal interface and filesystem host functions |
| [`packages/playground`](packages/playground) | Landing page, language documentation, and interactive playground |
| [`docs/spec.md`](docs/spec.md) | Canonical Yexp 0.1 language specification |
| [`evals`](evals) | Independent, experimental LLM evaluation tooling |

## Development

Yexp uses [Bun](https://bun.sh/) 1.3.6 and supports maintained Node.js LTS releases starting with Node 22.

```bash
bun install --frozen-lockfile
bun run ci
```

Useful individual commands:

```bash
bun run check
bun run test
bun run lint
bun run format:check
bun run playground
```

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request. Language changes must update the canonical specification and add observable-behavior tests.

## Security

Read [SECURITY.md](SECURITY.md) for the supported versions, threat model, and private reporting process. Yexp is an expression evaluator, not a complete resource-isolation sandbox; hosts evaluating untrusted expressions must apply appropriate execution and input limits.

## License

[MIT](LICENSE) © Cristian Martinez
