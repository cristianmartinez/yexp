#!/usr/bin/env bun
/**
 * Benchmark all expressions and track performance history
 *
 * Usage: bun run packages/core/benchmarks/benchmark.ts [--no-history]
 */

import { readFileSync, writeFileSync, existsSync, appendFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { tokenize } from '../../src/lexer.js';
import { parse } from '../../src/parser.js';
import { compile } from '../../src/compiler.js';
import { evaluate } from '../../src/vm.js';
import type { BytecodeProgram } from '../../src/types.js';

interface Expression {
  id: number;
  source: string;
  category: string;
  complexity: string;
}

interface BenchmarkResult {
  id: number;
  source: string;
  category: string;
  complexity: string;
  lexer: number;      // avg time in ms
  parser: number;     // avg time in ms
  compiler: number;   // avg time in ms
  vm: number;         // avg time in ms
  total: number;      // avg time in ms
  iterations: number;
}

interface HistoryEntry {
  timestamp: string;
  commit: string;
  results: BenchmarkResult[];
}

const BENCHMARK_DIR = join(import.meta.dir, '..');
const EXPRESSIONS_FILE = join(BENCHMARK_DIR, 'data', 'expressions.json');
const HISTORY_FILE = join(BENCHMARK_DIR, 'results', 'performance-history.jsonl');
const LATEST_FILE = join(BENCHMARK_DIR, 'results', 'performance-latest.json');

const ITERATIONS = 10000; // iterations for micro-benchmarks
const SKIP_HISTORY = process.argv.includes('--no-history');

// Get current git commit
function getGitCommit(): string {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim().substring(0, 8);
  } catch {
    return 'unknown';
  }
}

// Measure execution time
function measure(fn: () => void, iterations: number): number {
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  const end = performance.now();
  return (end - start) / iterations; // avg time per iteration
}

// Dummy context for VM execution
const dummyContext = {
  state: { count: 5, user: { name: 'Alice' }, value: 100 },
  data: {
    user: { name: 'Alice', profile: { avatar: 'url' } },
    items: [
      { name: 'Item 1', price: 50, active: true, qty: 2 },
      { name: 'Item 2', price: 150, active: false, qty: 1 },
      { name: 'Item 3', price: 200, active: true, qty: 3 },
    ],
    users: [
      { name: 'Alice', email: 'alice@example.com', age: 25, active: true },
      { name: 'Bob', email: 'bob@example.com', age: 17, active: false },
      { name: 'Charlie', email: 'charlie@example.com', age: 30, active: true },
    ],
  },
  env: {},
};

console.log('🚀 Benchmarking expressions...\n');
console.log(`Iterations: ${ITERATIONS}`);
console.log(`Git commit: ${getGitCommit()}\n`);

// Read expressions
const expressions: Expression[] = JSON.parse(readFileSync(EXPRESSIONS_FILE, 'utf-8'));
const results: BenchmarkResult[] = [];

for (const expr of expressions) {
  console.log(`[${expr.id}] ${expr.source}`);

  try {
    // Measure lexer
    const lexerTime = measure(() => tokenize(expr.source), ITERATIONS);

    // Measure parser (requires tokens)
    const tokens = tokenize(expr.source);
    const parserTime = measure(() => parse(tokens), ITERATIONS);

    // Measure compiler (requires AST)
    const ast = parse(tokens);
    const compilerTime = measure(() => compile(ast), ITERATIONS);

    // Measure VM (requires bytecode)
    const bytecode = compile(ast);
    const vmTime = measure(() => evaluate(bytecode, dummyContext), ITERATIONS);

    const total = lexerTime + parserTime + compilerTime + vmTime;

    results.push({
      id: expr.id,
      source: expr.source,
      category: expr.category,
      complexity: expr.complexity,
      lexer: parseFloat(lexerTime.toFixed(6)),
      parser: parseFloat(parserTime.toFixed(6)),
      compiler: parseFloat(compilerTime.toFixed(6)),
      vm: parseFloat(vmTime.toFixed(6)),
      total: parseFloat(total.toFixed(6)),
      iterations: ITERATIONS,
    });

    console.log(
      `    Lexer: ${lexerTime.toFixed(4)}ms | Parser: ${parserTime.toFixed(4)}ms | Compiler: ${compilerTime.toFixed(4)}ms | VM: ${vmTime.toFixed(4)}ms | Total: ${total.toFixed(4)}ms`
    );
  } catch (error) {
    console.error(`    ✗ Error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Save latest results
const latest = {
  timestamp: new Date().toISOString(),
  commit: getGitCommit(),
  results,
};

writeFileSync(LATEST_FILE, JSON.stringify(latest, null, 2));
console.log(`\n✅ Results saved to: ${LATEST_FILE}`);

// Append to history (JSONL format - one JSON object per line)
if (!SKIP_HISTORY) {
  const historyEntry: HistoryEntry = {
    timestamp: latest.timestamp,
    commit: latest.commit,
    results,
  };

  appendFileSync(HISTORY_FILE, JSON.stringify(historyEntry) + '\n');
  console.log(`📊 History updated: ${HISTORY_FILE}`);
}

// Summary statistics
console.log('\n📈 Summary by Category:');
const categories = [...new Set(results.map((r) => r.category))];
for (const category of categories.sort()) {
  const categoryResults = results.filter((r) => r.category === category);
  const avgTotal = categoryResults.reduce((sum, r) => sum + r.total, 0) / categoryResults.length;
  console.log(`   ${category.padEnd(20)}: ${avgTotal.toFixed(4)}ms avg`);
}

console.log('\n📊 Summary by Complexity:');
const complexities = [...new Set(results.map((r) => r.complexity))];
for (const complexity of complexities.sort()) {
  const complexityResults = results.filter((r) => r.complexity === complexity);
  const avgTotal = complexityResults.reduce((sum, r) => sum + r.total, 0) / complexityResults.length;
  console.log(`   ${complexity.padEnd(20)}: ${avgTotal.toFixed(4)}ms avg`);
}

console.log('\n✨ Benchmark complete!');
