#!/usr/bin/env bun
/**
 * VM Optimization Testing
 *
 * Test specific optimizations to improve VM performance against JSON
 */

import { compile } from '../../src/compiler.js';
import { tokenize } from '../../src/lexer.js';
import { parse } from '../../src/parser.js';
import { evaluate as evalBytecode } from '../../src/vm.js';

console.log('🔬 VM Optimization Analysis\n');

// The expression that JSON is beating us on
const simpleExpr = 'age >= 18 && age <= 65';
const context = { age: 25 };

// Compile once
const bytecode = compile(parse(tokenize(simpleExpr)));

console.log('📊 Bytecode Analysis:\n');
console.log('Instructions:', bytecode.code.length);
console.log('Constants:', bytecode.constants);
console.log('Slots:', bytecode.slots);
console.log('\nBytecode:');
bytecode.code.forEach((inst, i) => {
  console.log(`  ${i}: ${inst.join(' ')}`);
});

// Measure overhead breakdown
console.log('\n\n⚡ Performance Breakdown:\n');

// 1. Full evaluation
const fullStart = performance.now();
for (let i = 0; i < 100000; i++) {
  evalBytecode(bytecode, context as any);
}
const fullTime = performance.now() - fullStart;
console.log(
  `Full evaluation:     ${fullTime.toFixed(2)}ms (${(fullTime / 100).toFixed(3)}µs per eval)`,
);

// 2. Direct JavaScript (for comparison)
const jsStart = performance.now();
for (let i = 0; i < 100000; i++) {
  const age = context.age;
  const _result = age >= 18 && age <= 65;
}
const jsTime = performance.now() - jsStart;
console.log(
  `Direct JavaScript:   ${jsTime.toFixed(2)}ms (${(jsTime / 100).toFixed(3)}µs per eval)`,
);

// 3. Just property access
const propStart = performance.now();
for (let i = 0; i < 100000; i++) {
  const _age = context.age;
}
const propTime = performance.now() - propStart;
console.log(
  `Property access only: ${propTime.toFixed(2)}ms (${(propTime / 100).toFixed(3)}µs per access)`,
);

console.log(`\n🎯 VM overhead: ${(fullTime / jsTime - 1) * 100}% slower than direct JS`);
console.log(`   Bytecode interpretation adds: ${(fullTime - jsTime).toFixed(2)}ms overhead`);

// 4. Analyze instruction distribution
console.log('\n\n📈 Instruction Distribution:\n');
const opcodes = bytecode.code.map((inst) => inst[0]);
const opCount = new Map<string, number>();
for (const op of opcodes) {
  opCount.set(op as string, (opCount.get(op as string) || 0) + 1);
}
for (const [op, count] of [...opCount.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${op}: ${count}x`);
}

console.log('\n\n💡 Optimization Opportunities:\n');
console.log('1. Inline property access - Avoid LOAD opcode overhead');
console.log('2. Fuse comparisons - Combine LOAD + GTE into single operation');
console.log('3. Short-circuit AND - Skip second comparison if first fails');
console.log('4. Inline caching - Cache property lookups');
console.log('5. Specialize hot paths - Optimize common patterns');
