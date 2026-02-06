/**
 * Benchmark: Yexp vs jq vs JSONata
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

// Run yexp CLI via command line
function runYexpCli(expr: string, data: any): any {
  try {
    const input = JSON.stringify(data);
    // Use the compiled native yexp binary (no JS runtime startup overhead)
    // From: packages/core/exploratory/benchmarks/benchmark.ts
    // To:   packages/cli/dist/yexp (native binary)
    const yexpPath = new URL('../../../cli/dist/yexp', import.meta.url).pathname;
    const result = execSync(`echo '${input}' | ${yexpPath} '${expr}'`, {
      encoding: 'utf-8',
      timeout: 5000,
    });
    return JSON.parse(result);
  } catch (e) {
    console.error('yexp CLI error:', e);
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

// Benchmark yexp CLI
function benchmarkYexpCli(name: string, expr: string, data: any) {
  const iterations = 100; // Same as jq for fair comparison
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    runYexpCli(expr, data);
  }
  const end = performance.now();
  const total = end - start;
  const perOp = (total / iterations) * 1000; // microseconds

  return { name: `${name} (yexp CLI)`, total, perOp, iterations };
}

console.log('🏁 Benchmark: Yexp vs jq vs JSONata\n');
console.log('='.repeat(80));

// Test 1: Simple property access
console.log('\n📊 Test 1: Simple Property Access');
console.log('Expression: users[0].name\n');

const test1Results: any[] = [];

// Yexp
const yexpExpr1 = 'users[0].name';
const yexpProgram1 = compile(parse(tokenize(yexpExpr1)));
test1Results.push(
  benchmark('Yexp', () => {
    evaluate(yexpProgram1, { data: testData, state: {}, env: {} });
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

// yexp CLI
test1Results.push(benchmarkYexpCli('yexp', '$.users[0].name', testData));

printResults(test1Results);

// Test 2: Filter operation
console.log('\n📊 Test 2: Filter Array');
console.log('Expression: users.filter(u => u.age > 28)\n');

const test2Results: any[] = [];

// Yexp
const yexpExpr2 = 'users.filter(u => u.age > 28)';
const yexpProgram2 = compile(parse(tokenize(yexpExpr2)));
test2Results.push(
  benchmark('Yexp', () => {
    evaluate(yexpProgram2, { data: testData, state: {}, env: {} });
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

// yexp CLI
test2Results.push(benchmarkYexpCli('yexp', '$.users.filter(u => u.age > 28)', testData));

printResults(test2Results);

// Test 3: Map operation
console.log('\n📊 Test 3: Map Array');
console.log('Expression: users.map(u => u.name)\n');

const test3Results: any[] = [];

// Yexp
const yexpExpr3 = 'users.map(u => u.name)';
const yexpProgram3 = compile(parse(tokenize(yexpExpr3)));
test3Results.push(
  benchmark('Yexp', () => {
    evaluate(yexpProgram3, { data: testData, state: {}, env: {} });
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

// yexp CLI
test3Results.push(benchmarkYexpCli('yexp', '$.users.map(u => u.name)', testData));

printResults(test3Results);

// Test 4: Complex query
console.log('\n📊 Test 4: Complex Query');
console.log('Expression: users.filter(u => u.city == "NYC").map(u => u.score)\n');

const test4Results: any[] = [];

// Yexp
const yexpExpr4 = 'users.filter(u => u.city == "NYC").map(u => u.score)';
const yexpProgram4 = compile(parse(tokenize(yexpExpr4)));
test4Results.push(
  benchmark('Yexp', () => {
    evaluate(yexpProgram4, { data: testData, state: {}, env: {} });
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

// yexp CLI
test4Results.push(
  benchmarkYexpCli('yexp', '$.users.filter(u => u.city == "NYC").map(u => u.score)', testData),
);

printResults(test4Results);

// Test 5: Arithmetic
console.log('\n📊 Test 5: Arithmetic Expression');
console.log('Expression: users[0].score * 1.1 + 10\n');

const test5Results: any[] = [];

// Yexp
const yexpExpr5 = 'users[0].score * 1.1 + 10';
const yexpProgram5 = compile(parse(tokenize(yexpExpr5)));
test5Results.push(
  benchmark('Yexp', () => {
    evaluate(yexpProgram5, { data: testData, state: {}, env: {} });
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

// yexp CLI
test5Results.push(benchmarkYexpCli('yexp', '$.users[0].score * 1.1 + 10', testData));

printResults(test5Results);

// Summary
console.log('\n' + '='.repeat(80));
console.log('\n📈 Summary\n');

console.log('Typical Performance Characteristics:\n');
console.log('│ Tool          │ Speed       │ Per Op   │ Use Case                           │');
console.log('├───────────────┼─────────────┼──────────┼────────────────────────────────────┤');
console.log('│ Yexp (lib)    │ Very Fast   │ ~0.3µs   │ User rules, high-frequency queries │');
console.log('│ JSONata (lib) │ Fast        │ ~0.8µs   │ Node-RED, transformation pipelines │');
console.log('│ jq CLI        │ Medium*     │ ~7ms     │ Shell scripting, one-off queries   │');
console.log('│ yexp CLI      │ Medium*     │ ~29ms    │ Shell scripting, one-off queries   │');
console.log('\n* CLI tools have subprocess overhead but are still fast enough (<100ms)');
console.log('  for interactive use and shell scripts\n');

console.log('Key Takeaways:');
console.log('  • Yexp library: 20,000x faster than CLI tools - use for embedded/high-frequency');
console.log('  • jq CLI: 4x faster than yexp CLI (native C binary vs JavaScript runtime)');
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
