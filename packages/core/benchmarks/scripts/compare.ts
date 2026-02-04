#!/usr/bin/env bun
/**
 * Compare current performance with historical baseline
 *
 * Usage: bun run packages/core/benchmarks/compare.ts [--baseline=commit_hash]
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface BenchmarkResult {
  id: number;
  source: string;
  category: string;
  lexer: number;
  parser: number;
  compiler: number;
  vm: number;
  total: number;
}

interface HistoryEntry {
  timestamp: string;
  commit: string;
  results: BenchmarkResult[];
}

interface LatestResults {
  timestamp: string;
  commit: string;
  results: BenchmarkResult[];
}

const BENCHMARK_DIR = join(import.meta.dir, '..');
const HISTORY_FILE = join(BENCHMARK_DIR, 'results', 'performance-history.jsonl');
const LATEST_FILE = join(BENCHMARK_DIR, 'results', 'performance-latest.json');

// Parse command line args
const args = process.argv.slice(2);
const baselineCommit = args.find((arg) => arg.startsWith('--baseline='))?.split('=')[1];

console.log('📊 Performance Comparison\n');

// Read latest results
if (!existsSync(LATEST_FILE)) {
  console.error('❌ No latest results found. Run benchmark first: bun run benchmarks/benchmark.ts');
  process.exit(1);
}

const latest: LatestResults = JSON.parse(readFileSync(LATEST_FILE, 'utf-8'));
console.log(`Current: ${latest.timestamp} (${latest.commit})`);

// Read history
if (!existsSync(HISTORY_FILE)) {
  console.log('\n⚠️  No historical data available yet');
  console.log('Run benchmarks a few times to build performance history');
  process.exit(0);
}

const historyLines = readFileSync(HISTORY_FILE, 'utf-8')
  .trim()
  .split('\n')
  .filter((line) => line.length > 0);

const history: HistoryEntry[] = historyLines.map((line) => JSON.parse(line));

// Find baseline
let baseline: HistoryEntry | undefined;

if (baselineCommit) {
  baseline = history.find((h) => h.commit.startsWith(baselineCommit));
  if (!baseline) {
    console.error(`❌ No baseline found for commit: ${baselineCommit}`);
    process.exit(1);
  }
} else {
  // Use first entry as baseline (oldest)
  baseline = history[0];
}

console.log(`Baseline: ${baseline.timestamp} (${baseline.commit})`);
console.log(`History entries: ${history.length}\n`);

// Compare results
console.log('═'.repeat(120));
console.log(
  'ID'.padEnd(4) +
    'Expression'.padEnd(50) +
    'Lexer'.padEnd(12) +
    'Parser'.padEnd(12) +
    'Compiler'.padEnd(12) +
    'VM'.padEnd(12) +
    'Total'.padEnd(12)
);
console.log('═'.repeat(120));

let regressions = 0;
let improvements = 0;

for (const current of latest.results) {
  const base = baseline.results.find((r) => r.id === current.id);
  if (!base) continue;

  const formatDiff = (current: number, base: number): string => {
    const diff = ((current - base) / base) * 100;
    const sign = diff > 0 ? '+' : '';
    const color = diff > 5 ? '\x1b[31m' : diff < -5 ? '\x1b[32m' : '\x1b[33m';
    const reset = '\x1b[0m';

    if (diff > 5) regressions++;
    if (diff < -5) improvements++;

    return `${color}${sign}${diff.toFixed(1)}%${reset}`;
  };

  const truncatedExpr = current.source.length > 47 ? current.source.substring(0, 47) + '...' : current.source;

  console.log(
    `${String(current.id).padEnd(4)}${truncatedExpr.padEnd(50)}` +
      `${formatDiff(current.lexer, base.lexer).padEnd(20)}` +
      `${formatDiff(current.parser, base.parser).padEnd(20)}` +
      `${formatDiff(current.compiler, base.compiler).padEnd(20)}` +
      `${formatDiff(current.vm, base.vm).padEnd(20)}` +
      `${formatDiff(current.total, base.total).padEnd(20)}`
  );
}

console.log('═'.repeat(120));

// Category-level comparison
console.log('\n📊 Performance by Category:\n');
console.log('Category'.padEnd(25) + 'Current'.padEnd(15) + 'Baseline'.padEnd(15) + 'Change'.padEnd(15));
console.log('─'.repeat(70));

const categories = [...new Set(latest.results.map((r) => r.category))];
for (const category of categories.sort()) {
  const currentCat = latest.results.filter((r) => r.category === category);
  const baseCat = baseline.results.filter((r) => r.category === category);

  const currentAvg = currentCat.reduce((sum, r) => sum + r.total, 0) / currentCat.length;
  const baseAvg = baseCat.reduce((sum, r) => sum + r.total, 0) / baseCat.length;
  const diff = ((currentAvg - baseAvg) / baseAvg) * 100;

  const sign = diff > 0 ? '+' : '';
  const color = diff > 5 ? '\x1b[31m' : diff < -5 ? '\x1b[32m' : '\x1b[33m';
  const reset = '\x1b[0m';

  console.log(
    category.padEnd(25) +
      `${currentAvg.toFixed(4)}ms`.padEnd(15) +
      `${baseAvg.toFixed(4)}ms`.padEnd(15) +
      `${color}${sign}${diff.toFixed(1)}%${reset}`
  );
}

// Summary
console.log('\n' + '═'.repeat(70));
console.log(`\n📈 Summary:`);
console.log(`   Improvements: ${improvements} (>5% faster)`);
console.log(`   Regressions:  ${regressions} (>5% slower)`);
console.log(`   Stable:       ${latest.results.length - improvements - regressions} (±5%)`);

if (regressions > 0) {
  console.log('\n⚠️  Performance regressions detected!');
  process.exit(1);
}

console.log('\n✅ No significant performance regressions');
