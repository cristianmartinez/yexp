#!/usr/bin/env bun
/**
 * Generate a V8 CPU profile for flamegraph analysis.
 *
 * Usage:
 *   node --cpu-prof packages/core/benchmarks/scripts/profile.ts
 *
 * Then open the .cpuprofile file in:
 *   - Chrome DevTools (Performance tab → Load profile)
 *   - VSCode (just open the file)
 *   - speedscope (npx speedscope CPU.*.cpuprofile)
 */

import { compileAst } from '../../src/compiler.js';
import { tokenize } from '../../src/lexer.js';
import { parse } from '../../src/parser.js';
import { evaluate } from '../../src/vm.js';

const ITERATIONS = 100_000;

const context = {
  state: { count: 5, user: { name: 'Alice', age: 30, email: 'alice@example.com' }, value: 100 },
  data: {
    user: { name: 'Alice', profile: { avatar: 'url', settings: { theme: 'dark' } } },
    items: Array.from({ length: 50 }, (_, i) => ({
      name: `Item ${i}`,
      price: Math.random() * 200,
      active: i % 3 !== 0,
      qty: Math.floor(Math.random() * 10) + 1,
      category: ['electronics', 'books', 'clothing'][i % 3],
      tags: ['sale', 'new', 'featured'].slice(0, (i % 3) + 1),
    })),
    users: Array.from({ length: 20 }, (_, i) => ({
      name: `User ${i}`,
      email: `user${i}@example.com`,
      age: 15 + Math.floor(Math.random() * 50),
      active: i % 4 !== 0,
    })),
  },
  env: {},
};

// Expressions that stress different parts of the pipeline
const expressions = [
  // Simple path (tests slot resolution + VM loop)
  'data.user.name',
  // Arithmetic (tests operator opcodes)
  '(state.value + 100) * 0.8 - 20',
  // Predicate filter (tests lambda compilation + invocation)
  'data.items[.price > 100]',
  // Chained pipes with lambdas (tests HO_BUILTINS + lambda overhead)
  'data.items |> filter(.active) |> map(.name) |> join(", ")',
  // Complex: filter + sort + map (heavy lambda usage)
  'data.users |> filter((u) => u.age > 18 && u.active) |> map(.name)',
  // Reduce (tests accumulator pattern)
  'data.items |> reduce((acc, x) => acc + x.price, 0)',
  // Template literal with embedded expression
  '`Total: $${data.items |> map(.price) |> add}`',
  // Object construction with spread
  '{ maxPrice: max(...data.items.map(.price)), minPrice: min(...data.items.map(.price)) }',
];

// Phase 1: Profile full pipeline (tokenize → parse → compile → evaluate)
console.log(
  `Profiling full pipeline: ${ITERATIONS} iterations x ${expressions.length} expressions\n`,
);

console.time('full-pipeline');
for (let i = 0; i < ITERATIONS; i++) {
  for (const expr of expressions) {
    const tokens = tokenize(expr);
    const ast = parse(tokens);
    const program = compileAst(ast);
    evaluate(program, context);
  }
}
console.timeEnd('full-pipeline');

// Phase 2: Profile evaluate-only (pre-compiled, simulates real-world reuse)
console.log('\nProfiling evaluate-only (pre-compiled):');
const programs = expressions.map((expr) => ({
  expr,
  program: compileAst(parse(tokenize(expr))),
}));

console.time('evaluate-only');
for (let i = 0; i < ITERATIONS; i++) {
  for (const { program } of programs) {
    evaluate(program, context);
  }
}
console.timeEnd('evaluate-only');

// Phase 3: Individual stage breakdown
console.log('\nPer-stage breakdown (100k iterations each):');
for (const expr of expressions) {
  console.log(`\n  "${expr.substring(0, 60)}${expr.length > 60 ? '...' : ''}":`);

  console.time('    tokenize');
  for (let i = 0; i < ITERATIONS; i++) tokenize(expr);
  console.timeEnd('    tokenize');

  const tokens = tokenize(expr);
  console.time('    parse');
  for (let i = 0; i < ITERATIONS; i++) parse(tokens);
  console.timeEnd('    parse');

  const ast = parse(tokens);
  console.time('    compile');
  for (let i = 0; i < ITERATIONS; i++) compileAst(ast);
  console.timeEnd('    compile');

  const program = compileAst(ast);
  console.time('    evaluate');
  for (let i = 0; i < ITERATIONS; i++) evaluate(program, context);
  console.timeEnd('    evaluate');
}

console.log(
  '\nDone. If run with --cpu-prof, open the .cpuprofile in Chrome DevTools or speedscope.',
);
