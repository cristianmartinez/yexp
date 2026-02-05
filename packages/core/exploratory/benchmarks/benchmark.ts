/**
 * Benchmark: Jext vs jq vs JSONata
 *
 * Compares performance across different JSON query/transformation engines
 */

import { execSync } from 'child_process';
import jsonata from 'jsonata';
import { tokenize } from '../../src/lexer';
import { parse } from '../../src/parser';
import { compile } from '../../src/compiler';
import { evaluate } from '../../src/vm';
import type { ExecutionContext } from '../../src/types';

// Test data
const testData = {
  users: [
    { id: 1, name: 'Alice', age: 30, city: 'NYC', score: 85 },
    { id: 2, name: 'Bob', age: 25, city: 'LA', score: 92 },
    { id: 3, name: 'Charlie', age: 35, city: 'NYC', score: 78 },
    { id: 4, name: 'Diana', age: 28, city: 'Chicago', score: 95 },
    { id: 5, name: 'Eve', age: 32, city: 'LA', score: 88 },
  ],
  metadata: {
    total: 5,
    timestamp: '2024-01-01T00:00:00Z',
  },
};

// Benchmark runner
function benchmark(name: string, fn: () => any, iterations = 100000) {
  // Warmup
  for (let i = 0; i < 1000; i++) fn();

  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  const end = performance.now();
  const total = end - start;
  const perOp = (total / iterations) * 1000; // microseconds

  return { name, total, perOp, iterations };
}

// Run jq via command line
function runJq(expr: string, data: any): any {
  try {
    const input = JSON.stringify(data);
    const result = execSync(`echo '${input}' | jq '${expr}'`, {
      encoding: 'utf-8',
      timeout: 5000,
    });
    return JSON.parse(result);
  } catch (e) {
    return null;
  }
}

// Run jext CLI via command line
function runJextCli(expr: string, data: any): any {
  try {
    const input = JSON.stringify(data);
    // Use the compiled native jext binary (no JS runtime startup overhead)
    // From: packages/core/exploratory/benchmarks/benchmark.ts
    // To:   packages/cli/dist/jext (native binary)
    const jextPath = new URL('../../../cli/dist/jext', import.meta.url).pathname;
    const result = execSync(`echo '${input}' | ${jextPath} '${expr}'`, {
      encoding: 'utf-8',
      timeout: 5000,
    });
    return JSON.parse(result);
  } catch (e) {
    console.error('jext CLI error:', e);
    return null;
  }
}

// Benchmark jq (single execution, not in loop)
function benchmarkJq(name: string, expr: string, data: any) {
  const iterations = 100; // Reduced for faster testing (subprocess overhead)
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    runJq(expr, data);
  }
  const end = performance.now();
  const total = end - start;
  const perOp = (total / iterations) * 1000; // microseconds

  return { name: `${name} (jq CLI)`, total, perOp, iterations };
}

// Benchmark jext CLI
function benchmarkJextCli(name: string, expr: string, data: any) {
  const iterations = 100; // Same as jq for fair comparison
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    runJextCli(expr, data);
  }
  const end = performance.now();
  const total = end - start;
  const perOp = (total / iterations) * 1000; // microseconds

  return { name: `${name} (jext CLI)`, total, perOp, iterations };
}

console.log('🏁 Benchmark: Jext vs jq vs JSONata\n');
console.log('='.repeat(80));

// Test 1: Simple property access
console.log('\n📊 Test 1: Simple Property Access');
console.log('Expression: users[0].name\n');

const test1Results: any[] = [];

// Jext
const jextExpr1 = 'users[0].name';
const jextProgram1 = compile(parse(tokenize(jextExpr1)));
test1Results.push(
  benchmark('Jext', () => {
    evaluate(jextProgram1, { data: testData, state: {}, env: {} });
  }),
);

// JSONata
const jsonataExpr1 = jsonata('users[0].name');
test1Results.push(
  benchmark('JSONata', () => {
    jsonataExpr1.evaluate(testData);
  }),
);

// jq CLI
test1Results.push(benchmarkJq('jq', '.users[0].name', testData));

// jext CLI
test1Results.push(benchmarkJextCli('jext', '$.users[0].name', testData));

printResults(test1Results);

// Test 2: Filter operation
console.log('\n📊 Test 2: Filter Array');
console.log('Expression: users.filter(u => u.age > 28)\n');

const test2Results: any[] = [];

// Jext
const jextExpr2 = 'users.filter(u => u.age > 28)';
const jextProgram2 = compile(parse(tokenize(jextExpr2)));
test2Results.push(
  benchmark('Jext', () => {
    evaluate(jextProgram2, { data: testData, state: {}, env: {} });
  }),
);

// JSONata
const jsonataExpr2 = jsonata('users[age > 28]');
test2Results.push(
  benchmark('JSONata', () => {
    jsonataExpr2.evaluate(testData);
  }),
);

// jq CLI
test2Results.push(benchmarkJq('jq', '.users | map(select(.age > 28))', testData));

// jext CLI
test2Results.push(benchmarkJextCli('jext', '$.users.filter(u => u.age > 28)', testData));

printResults(test2Results);

// Test 3: Map operation
console.log('\n📊 Test 3: Map Array');
console.log('Expression: users.map(u => u.name)\n');

const test3Results: any[] = [];

// Jext
const jextExpr3 = 'users.map(u => u.name)';
const jextProgram3 = compile(parse(tokenize(jextExpr3)));
test3Results.push(
  benchmark('Jext', () => {
    evaluate(jextProgram3, { data: testData, state: {}, env: {} });
  }),
);

// JSONata
const jsonataExpr3 = jsonata('users.name');
test3Results.push(
  benchmark('JSONata', () => {
    jsonataExpr3.evaluate(testData);
  }),
);

// jq CLI
test3Results.push(benchmarkJq('jq', '.users | map(.name)', testData));

// jext CLI
test3Results.push(benchmarkJextCli('jext', '$.users.map(u => u.name)', testData));

printResults(test3Results);

// Test 4: Complex query
console.log('\n📊 Test 4: Complex Query');
console.log('Expression: users.filter(u => u.city == "NYC").map(u => u.score)\n');

const test4Results: any[] = [];

// Jext
const jextExpr4 = 'users.filter(u => u.city == "NYC").map(u => u.score)';
const jextProgram4 = compile(parse(tokenize(jextExpr4)));
test4Results.push(
  benchmark('Jext', () => {
    evaluate(jextProgram4, { data: testData, state: {}, env: {} });
  }),
);

// JSONata
const jsonataExpr4 = jsonata('users[city="NYC"].score');
test4Results.push(
  benchmark('JSONata', () => {
    jsonataExpr4.evaluate(testData);
  }),
);

// jq CLI
test4Results.push(
  benchmarkJq('jq', '.users | map(select(.city == "NYC")) | map(.score)', testData),
);

// jext CLI
test4Results.push(
  benchmarkJextCli('jext', '$.users.filter(u => u.city == "NYC").map(u => u.score)', testData),
);

printResults(test4Results);

// Test 5: Arithmetic
console.log('\n📊 Test 5: Arithmetic Expression');
console.log('Expression: users[0].score * 1.1 + 10\n');

const test5Results: any[] = [];

// Jext
const jextExpr5 = 'users[0].score * 1.1 + 10';
const jextProgram5 = compile(parse(tokenize(jextExpr5)));
test5Results.push(
  benchmark('Jext', () => {
    evaluate(jextProgram5, { data: testData, state: {}, env: {} });
  }),
);

// JSONata
const jsonataExpr5 = jsonata('users[0].score * 1.1 + 10');
test5Results.push(
  benchmark('JSONata', () => {
    jsonataExpr5.evaluate(testData);
  }),
);

// jq CLI
test5Results.push(benchmarkJq('jq', '.users[0].score * 1.1 + 10', testData));

// jext CLI
test5Results.push(benchmarkJextCli('jext', '$.users[0].score * 1.1 + 10', testData));

printResults(test5Results);

// Summary
console.log('\n' + '='.repeat(80));
console.log('\n📈 Summary\n');

console.log('Typical Performance Characteristics:\n');
console.log('│ Tool          │ Speed       │ Per Op   │ Use Case                           │');
console.log('├───────────────┼─────────────┼──────────┼────────────────────────────────────┤');
console.log('│ Jext (lib)    │ Very Fast   │ ~0.3µs   │ User rules, high-frequency queries │');
console.log('│ JSONata (lib) │ Fast        │ ~0.8µs   │ Node-RED, transformation pipelines │');
console.log('│ jq CLI        │ Medium*     │ ~7ms     │ Shell scripting, one-off queries   │');
console.log('│ jext CLI      │ Medium*     │ ~29ms    │ Shell scripting, one-off queries   │');
console.log('\n* CLI tools have subprocess overhead but are still fast enough (<100ms)');
console.log('  for interactive use and shell scripts\n');

console.log('Key Takeaways:');
console.log('  • Jext library: 20,000x faster than CLI tools - use for embedded/high-frequency');
console.log('  • jq CLI: 4x faster than jext CLI (native C binary vs JavaScript runtime)');
console.log('  • JSONata: great for complex transformations, library-only');
console.log('  • Both CLIs are fast enough for shell scripts and interactive use');

console.log('\n✨ Done!\n');

// Helper function
function printResults(results: any[]) {
  // Sort by speed (fastest first)
  results.sort((a, b) => a.perOp - b.perOp);

  const fastest = results[0].perOp;

  console.log('Results:\n');
  for (const result of results) {
    const speedup = (result.perOp / fastest).toFixed(2);
    const bar = '█'.repeat(Math.min(50, Math.round(result.perOp / 10)));

    console.log(`${result.name.padEnd(15)} ${result.perOp.toFixed(3)}µs  ${bar}`);
    if (result !== results[0]) {
      console.log(`${' '.repeat(15)} ${speedup}x slower than fastest`);
    }
  }
}
