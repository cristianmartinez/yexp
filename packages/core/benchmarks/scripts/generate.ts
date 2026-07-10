#!/usr/bin/env bun
/**
 * Generate AST and bytecode files from expressions.json
 *
 * Usage: bun run packages/core/benchmarks/generate.ts
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { compileAst } from '../../src/compiler.js';
import { tokenize } from '../../src/lexer.js';
import { parse } from '../../src/parser.js';
import type { ASTNode, BytecodeProgram } from '../../src/types.js';

interface Expression {
  id: number;
  source: string;
  category: string;
  complexity: string;
}

const BENCHMARK_DIR = join(import.meta.dir, '..');
const EXPRESSIONS_FILE = join(BENCHMARK_DIR, 'data', 'expressions.json');
const AST_FILE = join(BENCHMARK_DIR, 'data', 'expressions.ast.json');
const BYTECODE_FILE = join(BENCHMARK_DIR, 'data', 'expressions.bytecode.json');

console.log('📝 Generating AST and bytecode from expressions...\n');

// Read expressions
const expressions: Expression[] = JSON.parse(readFileSync(EXPRESSIONS_FILE, 'utf-8'));

const astMap: Record<number, { source: string; ast: ASTNode }> = {};
const bytecodeMap: Record<number, { source: string; bytecode: BytecodeProgram }> = {};

let errors = 0;

for (const expr of expressions) {
  try {
    console.log(`  [${expr.id}] ${expr.source}`);

    // Generate AST
    const tokens = tokenize(expr.source);
    const ast = parse(tokens);
    astMap[expr.id] = {
      source: expr.source,
      ast,
    };

    // Generate bytecode
    const bytecode = compileAst(ast);
    bytecodeMap[expr.id] = {
      source: expr.source,
      bytecode,
    };

    console.log(`      ✓ AST: ${ast.type}, Bytecode: ${bytecode.code.length} instructions`);
  } catch (error) {
    console.error(`      ✗ Error: ${error instanceof Error ? error.message : String(error)}`);
    errors++;
  }
}

// Write output files
writeFileSync(AST_FILE, JSON.stringify(astMap, null, 2));
writeFileSync(BYTECODE_FILE, JSON.stringify(bytecodeMap, null, 2));

console.log(`\n✅ Generated ${expressions.length} expressions`);
console.log(`   AST file: ${AST_FILE}`);
console.log(`   Bytecode file: ${BYTECODE_FILE}`);

if (errors > 0) {
  console.error(`\n❌ ${errors} error(s) occurred`);
  process.exit(1);
}
