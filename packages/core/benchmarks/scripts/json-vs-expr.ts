#!/usr/bin/env bun
/**
 * Benchmark: JSON conditions vs Compiled expressions
 */

import { compileAst } from '../../src/compiler.js';
import { tokenize } from '../../src/lexer.js';
import { parse } from '../../src/parser.js';
import { evaluate as evalBytecode } from '../../src/vm.js';

// JSON-based condition evaluator
interface JsonCondition {
  field?: string;
  op?: string;
  value?: any;
  and?: JsonCondition[];
  or?: JsonCondition[];
}

function evaluateJsonCondition(condition: JsonCondition, context: any): boolean {
  // Simple field comparison
  if (condition.field && condition.op) {
    const fieldValue = context[condition.field];
    const { op, value } = condition;

    switch (op) {
      case 'eq':
        return fieldValue === value;
      case 'neq':
        return fieldValue !== value;
      case 'gt':
        return fieldValue > value;
      case 'gte':
        return fieldValue >= value;
      case 'lt':
        return fieldValue < value;
      case 'lte':
        return fieldValue <= value;
      default:
        return false;
    }
  }

  // AND logic
  if (condition.and) {
    return condition.and.every((c) => evaluateJsonCondition(c, context));
  }

  // OR logic
  if (condition.or) {
    return condition.or.some((c) => evaluateJsonCondition(c, context));
  }

  return false;
}

// Test cases
const testCases = [
  {
    name: 'Simple OR',
    json: {
      or: [
        { field: 'age', op: 'gt', value: 18 },
        { field: 'verified', op: 'eq', value: true },
      ],
    },
    expr: 'age > 18 || verified == true',
    context: { age: 25, verified: false },
  },
  {
    name: 'Complex AND + OR',
    json: {
      and: [
        { field: 'age', op: 'gte', value: 18 },
        { field: 'age', op: 'lte', value: 65 },
        {
          or: [
            { field: 'verified', op: 'eq', value: true },
            { field: 'admin', op: 'eq', value: true },
          ],
        },
      ],
    },
    expr: 'age >= 18 && age <= 65 && (verified == true || admin == true)',
    context: { age: 25, verified: false, admin: true },
  },
  {
    name: 'Deeply nested',
    json: {
      or: [
        {
          and: [
            { field: 'age', op: 'gt', value: 21 },
            { field: 'country', op: 'eq', value: 'US' },
          ],
        },
        {
          and: [
            { field: 'age', op: 'gt', value: 18 },
            { field: 'country', op: 'eq', value: 'UK' },
          ],
        },
        {
          and: [
            { field: 'verified', op: 'eq', value: true },
            { field: 'admin', op: 'eq', value: true },
          ],
        },
      ],
    },
    expr: '(age > 21 && country == "US") || (age > 18 && country == "UK") || (verified && admin)',
    context: { age: 22, country: 'US', verified: false, admin: false },
  },
];

console.log('🔥 JSON Conditions vs Compiled Expressions Benchmark\n');

const ITERATIONS = 100000;

for (const testCase of testCases) {
  console.log(`\n📊 Test: ${testCase.name}`);
  console.log(`   Expression: ${testCase.expr}`);

  // Compile expression once
  const tokens = tokenize(testCase.expr);
  const ast = parse(tokens);
  const bytecode = compileAst(ast);
  console.log(`   Bytecode:   ${bytecode.code.length} instructions\n`);

  // Warmup
  for (let i = 0; i < 1000; i++) {
    evaluateJsonCondition(testCase.json, testCase.context);
    evalBytecode(bytecode, testCase.context);
  }

  // Benchmark JSON conditions
  const jsonStart = performance.now();
  for (let i = 0; i < ITERATIONS; i++) {
    evaluateJsonCondition(testCase.json, testCase.context);
  }
  const jsonTime = performance.now() - jsonStart;

  // Benchmark compiled expressions
  const exprStart = performance.now();
  for (let i = 0; i < ITERATIONS; i++) {
    evalBytecode(bytecode, testCase.context);
  }
  const exprTime = performance.now() - exprStart;

  const speedup = jsonTime / exprTime;
  const winner = speedup > 1 ? 'Expression' : 'JSON';

  console.log(
    `   JSON:       ${jsonTime.toFixed(2)}ms (${((jsonTime / ITERATIONS) * 1000).toFixed(3)}µs per eval)`,
  );
  console.log(
    `   Expression: ${exprTime.toFixed(2)}ms (${((exprTime / ITERATIONS) * 1000).toFixed(3)}µs per eval)`,
  );
  console.log(`   \x1b[32m${winner} is ${speedup.toFixed(1)}x faster!\x1b[0m`);
}

console.log('\n\n📝 Summary:\n');
console.log('Compiled expressions win because:');
console.log('  1. No object property lookups');
console.log('  2. No string comparisons for operators');
console.log('  3. No tree traversal - direct stack operations');
console.log('  4. Bytecode optimizations (CSE, specialized opcodes)');
console.log('  5. Compilation cost amortized over many evaluations\n');
console.log('Use expressions when:');
console.log('  ✅ Evaluating the same condition many times');
console.log('  ✅ Performance is critical');
console.log('  ✅ Conditions are complex/nested\n');
console.log('Use JSON when:');
console.log('  ✅ One-time evaluation');
console.log('  ✅ Need to store/modify conditions dynamically');
console.log('  ✅ Type safety is more important than performance');
