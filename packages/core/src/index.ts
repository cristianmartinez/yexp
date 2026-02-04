export { compile } from './compiler.js';
export { tokenize, LexerError } from './lexer.js';
export { parse, ParseError } from './parser.js';
export {
  Opcode,
  TokenType,
  isExprError,
  makeError,
  type ASTNode,
  type BytecodeProgram,
  type ExecutionContext,
  type ExprError,
  type ExprErrorType,
  type ExprObject,
  type ExprValue,
  type Instruction,
  type Token,
} from './types.js';
export { evaluate } from './vm.js';

import { compile as compileAst } from './compiler.js';
import { tokenize } from './lexer.js';
import { parse } from './parser.js';
import type { BytecodeProgram, ExecutionContext, ExprValue } from './types.js';
import { evaluate } from './vm.js';

export function compileExpr(source: string): BytecodeProgram {
  return compileAst(parse(tokenize(source)));
}

export function run(source: string, context: ExecutionContext): ExprValue {
  const program = compileExpr(source);
  return evaluate(program, context);
}
