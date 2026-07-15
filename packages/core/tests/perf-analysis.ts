import { compileAst } from '../src/compiler.js';
import { tokenize } from '../src/lexer.js';
import { parse } from '../src/parser.js';
import { evaluate } from '../src/vm.js';

// Helper to measure execution time
function measure(label: string, fn: () => void, iterations = 1000): number {
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  const end = performance.now();
  const total = end - start;
  const avg = total / iterations;
  console.log(
    `${label}: ${total.toFixed(2)}ms total, ${avg.toFixed(4)}ms avg (${iterations} iterations)`,
  );
  return avg;
}

// Test 1: Small nested structure
const smallData = {
  users: [
    { name: 'Alice', profile: { name: 'Alice Admin' } },
    { name: 'Bob', posts: [{ name: 'Post 1' }] },
  ],
  config: { settings: { name: 'App Settings' } },
};

// Test 2: Deep nesting (near limit)
let deepData: any = { value: 'deep' };
for (let i = 0; i < 90; i++) {
  deepData = { nested: deepData };
}
deepData = { value: 'surface', deep: deepData };

// Test 3: Wide structure (many siblings)
const wideData: any = { items: [] };
for (let i = 0; i < 1000; i++) {
  wideData.items.push({ id: i, name: `Item ${i}`, value: i * 10 });
}

// Test 4: Large array with nested objects
const largeData: any = { records: [] };
for (let i = 0; i < 500; i++) {
  largeData.records.push({
    id: i,
    user: { name: `User ${i}`, email: `user${i}@example.com` },
    metadata: { created: Date.now(), tags: ['tag1', 'tag2'] },
  });
}

console.log('=== Performance Analysis: Recursive Descent Operator ===\n');

// Phase 1: Lexing
console.log('Phase 1: LEXING');
measure('  Simple expr (data..name)', () => tokenize('data..name'));
measure('  Complex expr (data..users[*].email)', () => tokenize('data..users[*].email'));
measure('  Optional variant (data?..name)', () => tokenize('data?..name'));
console.log('');

// Phase 2: Parsing
console.log('Phase 2: PARSING');
const tokens1 = tokenize('data..name');
const tokens2 = tokenize('data..users[*].email');
const tokens3 = tokenize('data?..name');
measure('  Simple expr (data..name)', () => parse(tokens1));
measure('  Complex expr (data..users[*].email)', () => parse(tokens2));
measure('  Optional variant (data?..name)', () => parse(tokens3));
console.log('');

// Phase 3: Compilation
console.log('Phase 3: COMPILATION');
const ast1 = parse(tokenize('data..name'));
const ast2 = parse(tokenize('data..users[*].email'));
const ast3 = parse(tokenize('data?..name'));
measure('  Simple expr (data..name)', () => compileAst(ast1));
measure('  Complex expr (data..users[*].email)', () => compileAst(ast2));
measure('  Optional variant (data?..name)', () => compileAst(ast3));
console.log('');

// Phase 4: Evaluation (VM execution) - THIS IS THE CRITICAL PHASE
console.log('Phase 4: EVALUATION (VM) - CRITICAL PHASE');

const program1 = compileAst(parse(tokenize('data..name')));
const program2 = compileAst(parse(tokenize('data..value')));
const program3 = compileAst(parse(tokenize('data..id')));
const program4 = compileAst(parse(tokenize('data..email')));

console.log('\n  Scenario: Small nested structure (5 matches)');
measure('    data..name', () => evaluate(program1, { state: {}, data: smallData, env: {} }), 10000);

console.log('\n  Scenario: Deep nesting (90 levels, 2 matches)');
measure('    data..value', () => evaluate(program2, { state: {}, data: deepData, env: {} }), 10000);

console.log('\n  Scenario: Wide structure (1000 items)');
measure('    data..id', () => evaluate(program3, { state: {}, data: wideData, env: {} }), 1000);

console.log('\n  Scenario: Large array with nesting (500 records)');
measure('    data..email', () => evaluate(program4, { state: {}, data: largeData, env: {} }), 1000);

console.log('\n=== Full Pipeline Comparison ===\n');

// Compare full pipeline (lex + parse + compile + eval) for different operators
console.log('Regular property access (data.users[0].name):');
const simpleExpr = 'data.users[0].name';
let _simpleResult;
measure(
  '  Full pipeline',
  () => {
    _simpleResult = evaluate(compileAst(parse(tokenize(simpleExpr))), {
      state: {},
      data: smallData,
      env: {},
    });
  },
  5000,
);

console.log('\nWildcard (data.users[*].name):');
const wildcardExpr = 'data.users[*].name';
let _wildcardResult;
measure(
  '  Full pipeline',
  () => {
    _wildcardResult = evaluate(compileAst(parse(tokenize(wildcardExpr))), {
      state: {},
      data: smallData,
      env: {},
    });
  },
  5000,
);

console.log('\nRecursive descent (data..name):');
const recursiveExpr = 'data..name';
let _recursiveResult;
measure(
  '  Full pipeline',
  () => {
    _recursiveResult = evaluate(compileAst(parse(tokenize(recursiveExpr))), {
      state: {},
      data: smallData,
      env: {},
    });
  },
  5000,
);

console.log('\n=== Analysis Summary ===');
console.log('Recursive descent has O(n*m) complexity where:');
console.log('  n = total number of objects/arrays in structure');
console.log('  m = average number of properties per object');
console.log('\nPerformance characteristics:');
console.log('  - Lexing/Parsing/Compilation: Negligible overhead (~0.01ms)');
console.log('  - Evaluation: Scales with structure size and depth');
console.log('  - Deep structures: Limited by MAX_FLATTEN_DEPTH (100 levels)');
console.log('  - Wide structures: Linear scan of all properties');
console.log('\nOptimizations in place:');
console.log('  ✓ WeakSet for circular reference detection (O(1) lookup)');
console.log('  ✓ Depth limit prevents infinite recursion');
console.log('  ✓ Object.hasOwn() avoids prototype chain traversal');
console.log('  ✓ Early returns on non-objects');
