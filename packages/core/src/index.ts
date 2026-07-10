export { compileAst } from './compiler.js';
export { tokenize, LexerError } from './lexer.js';
export { parse, ParseError } from './parser.js';
export {
  Opcode,
  TokenType,
  isExprError,
  isLambdaValue,
  makeError,
  type ASTNode,
  type BytecodeProgram,
  type ExecutionContext,
  type ExprError,
  type ExprErrorType,
  type ExprObject,
  type ExprValue,
  type Instruction,
  type LambdaNode,
  type LambdaValue,
  type Token,
} from './types.js';
export { evaluate, type EvaluateOptions, type BuiltinFn } from './vm.js';

import { compileAst } from './compiler.js';
import { tokenize } from './lexer.js';
import { parse } from './parser.js';
import type { BytecodeProgram, ExecutionContext, ExprValue } from './types.js';
import { evaluate } from './vm.js';

export function compile(source: string): BytecodeProgram {
  return compileAst(parse(tokenize(source)));
}

/** @deprecated Use `compile` instead. */
export const compileExpr = compile;

export function run(source: string, context: ExecutionContext): ExprValue {
  const program = compile(source);
  return evaluate(program, context);
}
