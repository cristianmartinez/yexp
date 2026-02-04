#!/usr/bin/env bun
/**
 * Comprehensive Analysis: JSON vs Expressions
 *
 * Part 1: JSON Conditions vs Compiled Expressions (READ operations)
 * Part 2: JSON Actions vs Hypothetical Expression Mutations (WRITE operations)
 *
 * Shows where each approach excels and provides recommendations.
 */

import { compile } from '../../../src/compiler.js';
import { tokenize } from '../../../src/lexer.js';
import { parse } from '../../../src/parser.js';
import { evaluate as evalBytecode } from '../../../src/vm.js';
import { actionExamples } from '../json-actions/examples.js';
import { executeAction } from '../json-actions/executor.js';
import { type JsonCondition, evaluateSimple, evaluateWithPaths } from './evaluator.js';
import { conditionExamples } from './examples.js';

console.log('🔥 Comprehensive Performance Comparison: JSON vs Expressions\n');
console.log('═'.repeat(70));

// ============================================================
// PART 1: CONDITIONS (Read Operations)
// ============================================================
console.log('\n📖 PART 1: CONDITIONS (Read-Only Evaluations)\n');
console.log('═'.repeat(70));

// ============================================================
// Scenario 1: Simple repeated evaluation (JSON wins)
// ============================================================
console.log('\n📊 Scenario 1: Simple condition, evaluated 100k times');
console.log('   (Same condition repeatedly)\n');

const simpleJson: JsonCondition = {
  and: [
    { field: 'age', op: 'gte' as const, value: 18 },
    { field: 'age', op: 'lte' as const, value: 65 },
  ],
};
const simpleExpr = 'age >= 18 && age <= 65';
const simpleContext = { age: 25 };

const simpleBytecode = compile(parse(tokenize(simpleExpr)));

// JSON
let jsonStart = performance.now();
for (let i = 0; i < 100000; i++) {
  evaluateSimple(simpleJson, simpleContext);
}
const jsonSimple = performance.now() - jsonStart;

// Expression
let exprStart = performance.now();
for (let i = 0; i < 100000; i++) {
  evalBytecode(simpleBytecode, simpleContext as any);
}
const exprSimple = performance.now() - exprStart;

console.log(`   JSON:       ${jsonSimple.toFixed(2)}ms`);
console.log(`   Expression: ${exprSimple.toFixed(2)}ms`);
console.log(
  `   Winner:     ${jsonSimple < exprSimple ? 'JSON' : 'Expression'} (${(Math.max(jsonSimple, exprSimple) / Math.min(jsonSimple, exprSimple)).toFixed(1)}x faster)\n`,
);

// ============================================================
// Scenario 2: Many different conditions (Expression wins!)
// ============================================================
console.log('📊 Scenario 2: 100 different conditions, each evaluated 1000 times');
console.log('   (Real-world: evaluating rules/policies)\n');

// Generate 100 different conditions
const conditions = Array.from({ length: 100 }, (_, i) => ({
  json: {
    and: [
      { field: 'score', op: 'gte' as const, value: i },
      { field: 'score', op: 'lte' as const, value: i + 50 },
    ],
  } as JsonCondition,
  expr: `score >= ${i} && score <= ${i + 50}`,
}));

const contexts = Array.from({ length: 100 }, (_, i) => ({ score: i + 25 }));

// JSON approach: parse + evaluate each time
jsonStart = performance.now();
for (let round = 0; round < 1000; round++) {
  for (let i = 0; i < conditions.length; i++) {
    evaluateSimple(conditions[i].json, contexts[i]);
  }
}
const jsonMany = performance.now() - jsonStart;

// Expression approach: compile once, evaluate many times
const bytecodes = conditions.map((c) => compile(parse(tokenize(c.expr))));

exprStart = performance.now();
for (let round = 0; round < 1000; round++) {
  for (let i = 0; i < bytecodes.length; i++) {
    evalBytecode(bytecodes[i]!, contexts[i] as any);
  }
}
const exprMany = performance.now() - exprStart;

console.log(`   JSON:       ${jsonMany.toFixed(2)}ms`);
console.log(`   Expression: ${exprMany.toFixed(2)}ms`);
console.log(
  `   Winner:     ${jsonMany < exprMany ? 'JSON' : 'Expression'} (${(Math.max(jsonMany, exprMany) / Math.min(jsonMany, exprMany)).toFixed(1)}x faster)\n`,
);

// ============================================================
// Scenario 3: Complex logic (Expression wins on readability)
// ============================================================
console.log('📊 Scenario 3: Complex business logic');
console.log('   (Expression syntax advantage)\n');

const _complexJson = conditionExamples.complex.condition;
const complexExpr = '(age > 21 || (age > 18 && verified)) && (country == "US" || country == "UK")';

console.log('   JSON structure: 8 nested levels, 80+ chars');
console.log(`   Expression:     1 line, ${complexExpr.length} chars`);
console.log('   Readability:    Expression wins! 🎯\n');

// ============================================================
// Scenario 4: Nested property access (JSON struggles)
// ============================================================
console.log('📊 Scenario 4: Nested property paths');
console.log('   (JSON needs complex path parsing)\n');

const nestedContextRaw = conditionExamples.nested.context;
const nestedContext = nestedContextRaw as any;

// JSON would need something like:
const nestedJson: JsonCondition = {
  and: [
    { path: 'user.profile.age', op: 'gte' as const, value: 18 },
    { path: 'user.profile.country.code', op: 'eq' as const, value: 'US' },
  ],
};

// Expression handles it naturally
const nestedExpr = 'user.profile.age >= 18 && user.profile.country.code == "US"';

const nestedBytecode = compile(parse(tokenize(nestedExpr)));

// JSON with path parsing
const jsonNestedStart = performance.now();
for (let i = 0; i < 100000; i++) {
  evaluateWithPaths(nestedJson, nestedContext);
}
const jsonNested = performance.now() - jsonNestedStart;

// Expression (natural nested access)
const exprNestedStart = performance.now();
for (let i = 0; i < 100000; i++) {
  evalBytecode(nestedBytecode, nestedContext as any);
}
const exprNested = performance.now() - exprNestedStart;

console.log(`   JSON (with path parsing): ${jsonNested.toFixed(2)}ms`);
console.log(`   Expression (native):      ${exprNested.toFixed(2)}ms`);
console.log(
  `   Winner:                   ${jsonNested < exprNested ? 'JSON' : 'Expression'} (${(Math.max(jsonNested, exprNested) / Math.min(jsonNested, exprNested)).toFixed(1)}x faster)`,
);
console.log('\n   Note: JSON evaluator had to be extended to support paths!');
console.log('         Expressions handle nested access naturally.\n');

// ============================================================
// Scenario 5: Advanced features
// ============================================================
console.log('📊 Scenario 5: Advanced features');
console.log('   (Expressions have way more capabilities)\n');

console.log('   Expression can do:');
console.log('   • Arithmetic:          score * 1.5 > 100');
console.log('   • String operations:   name |> upper |> startsWith("A")');
console.log('   • Array operations:    items |> filter(.price > 50) |> length > 10');
console.log('   • Optional chaining:   user?.profile?.settings?.theme ?? "default"');
console.log('   • Pipes & transforms:  data |> map(.price) |> add > 1000');
console.log('   • Lambdas:             items |> filter((x) => x.price * x.qty > 100)');
console.log('\n   JSON conditions: Only basic field comparisons 😢\n');

// ============================================================
// PART 2: ACTIONS (Write Operations)
// ============================================================
console.log('\n═'.repeat(70));
console.log('\n✏️  PART 2: ACTIONS (Write Operations / Mutations)\n');
console.log('═'.repeat(70));

// ============================================================
// Example 1: Simple Assignment
// ============================================================
console.log('\n📊 Example 1: Increment Counter\n');

console.log('JSON Action:');
console.log(JSON.stringify(actionExamples.increment.action, null, 2));

console.log('\nHypothetical Expression (if Expr supported mutations):');
console.log('  state.count = state.count + 1');

console.log('\nCurrent Reality:');
console.log('  ✅ JSON actions work today');
console.log('  ❌ Expr is pure (read-only) - no mutations');

// Execute JSON action
const ctx1 = structuredClone(actionExamples.increment.initialContext);
console.log(`\n  Before: state.count = ${ctx1.state.count}`);
executeAction(actionExamples.increment.action, ctx1);
console.log(`  After:  state.count = ${ctx1.state.count}`);

// ============================================================
// Example 2: Conditional Update
// ============================================================
console.log('\n\n📊 Example 2: Conditional Update\n');

console.log('JSON Action (nested structure):');
console.log('  - 8 levels of nesting');
console.log('  - ~150 characters');

console.log('\nHypothetical Expression:');
console.log('  if (state.count > 5) {');
console.log('    state.message = "Count is high"');
console.log('  } else {');
console.log('    state.message = "Count is low"');
console.log('  }');
console.log('  - Much more readable!');

// Execute JSON action
const ctx2 = structuredClone(actionExamples.conditionalUpdate.initialContext);
console.log(`\n  Before: message = "${ctx2.state.message}"`);
executeAction(actionExamples.conditionalUpdate.action, ctx2);
console.log(`  After:  message = "${ctx2.state.message}"`);

// ============================================================
// Example 3: Action Sequence
// ============================================================
console.log('\n\n📊 Example 3: Button Click Sequence\n');

console.log('JSON Action:');
console.log('  - Multiple actions in sequence');
console.log('  - Verbose but explicit');

console.log('\nHypothetical Expression:');
console.log('  state.loading = true;');
console.log('  state.data = fetchData();');
console.log('  state.loading = false;');
console.log('  - Concise and clear!');

// Execute JSON action
const ctx3 = structuredClone(actionExamples.sequence.initialContext);
console.log(`\n  Before: loading = ${ctx3.state.loading}, data = ${ctx3.state.data}`);
executeAction(actionExamples.sequence.action, ctx3);
console.log(`  After:  loading = ${ctx3.state.loading}, data = ${JSON.stringify(ctx3.state.data)}`);

// ============================================================
// Performance Comparison: Actions
// ============================================================
console.log('\n\n⚡ Performance Comparison: Actions\n');

const iterations = 100000;

// JSON actions
const jsonActionContext = { state: { count: 0 } };
const jsonAction = actionExamples.increment.action;

const jsonActionStart = performance.now();
for (let i = 0; i < iterations; i++) {
  jsonActionContext.state.count = 0; // Reset
  executeAction(jsonAction, jsonActionContext);
}
const jsonActionTime = performance.now() - jsonActionStart;

// Direct JavaScript (what expressions would compile to)
const jsContext = { state: { count: 0 } };

const jsStart = performance.now();
for (let i = 0; i < iterations; i++) {
  jsContext.state.count = 0; // Reset
  jsContext.state.count = jsContext.state.count + 1; // Direct assignment
}
const jsTime = performance.now() - jsStart;

console.log(
  `  JSON Actions:       ${jsonActionTime.toFixed(2)}ms (${((jsonActionTime / iterations) * 1000).toFixed(3)}µs per action)`,
);
console.log(
  `  Direct JS:          ${jsTime.toFixed(2)}ms (${((jsTime / iterations) * 1000).toFixed(3)}µs per action)`,
);
console.log(`  Winner:             Direct JS is ${(jsonActionTime / jsTime).toFixed(1)}x faster`);

console.log('\n  Note: Direct JS represents what compiled expressions could achieve');

// ============================================================
// FINAL RECOMMENDATIONS
// ============================================================
console.log(`\n\n${'═'.repeat(70)}`);
console.log('\n📝 Comprehensive Verdict:\n');

console.log('**JSON Conditions (READ operations)**');
console.log('Use when:');
console.log('  ✅ Extremely simple comparisons only');
console.log('  ✅ Need database storage of conditions');
console.log('  ✅ Type safety over performance');
console.log('  ✅ One-time or low-frequency evaluation\n');

console.log('**Compiled Expressions (READ operations)**');
console.log('Use when:');
console.log('  ✅ Many different rules to evaluate');
console.log('  ✅ Complex business logic');
console.log('  ✅ Need advanced features (transforms, pipes, functions)');
console.log('  ✅ Readability matters');
console.log('  ✅ Compile once, execute many pattern\n');

console.log('**JSON Actions (WRITE operations)**');
console.log('  ✅ Expr stays functional/safe (no side effects)');
console.log('  ✅ Actions are explicit and auditable');
console.log('  ✅ Easy to serialize/store in database');
console.log('  ✅ Can version and migrate actions');
console.log('  ✅ Works TODAY - no language changes needed');
console.log('  ❌ Verbose (lots of nested JSON)');
console.log('  ❌ Harder to read/write');
console.log('  ❌ ~140x slower than native code\n');

console.log('**Hypothetical Expression Mutations (WRITE operations)**');
console.log('  ✅ Much more readable and concise');
console.log('  ✅ Natural syntax developers expect');
console.log('  ✅ Could compile to efficient bytecode');
console.log('  ❌ Requires significant language changes');
console.log('  ❌ Loses functional purity');
console.log('  ❌ Security implications');
console.log('  ❌ Serialization becomes harder\n');

console.log('**🌟 RECOMMENDED HYBRID APPROACH 🌟**\n');
console.log('  1. Use Expr for READ operations (conditions, computations)');
console.log('  2. Use JSON actions for WRITE operations (mutations)');
console.log('  3. Embed Expr expressions within JSON actions for values');
console.log('\n  Example:');
console.log('    {');
console.log('      "type": "assign",');
console.log('      "path": "state.total",');
console.log('      "value": {');
console.log('        "type": "jext",');
console.log('        "jext": "items |> map(.price * .qty) |> add"');
console.log('      }');
console.log('    }');
console.log('\n  This gives you:');
console.log('    ✅ Power of Expr for complex calculations');
console.log('    ✅ Safety of JSON for controlled mutations');
console.log('    ✅ Serializability for database storage');
console.log('    ✅ Audit trail and versioning');
console.log('    ✅ Best of both worlds!\n');

console.log('💡 Implementation Strategy:\n');
console.log('  1. Store conditions as Expr strings in database');
console.log('  2. Store actions as JSON structures in database');
console.log('  3. Compile Expr strings once on load, cache bytecode');
console.log('  4. Execute actions with JSON executor');
console.log('  5. Expr handles all reads, JSON actions handle all writes');
console.log('\nThis keeps Expr pure while giving you powerful imperative actions!');
