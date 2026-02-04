// ─── Token Types ────────────────────────────────────────────────────────────

export enum TokenType {
  // Literals
  Number = 'Number',
  String = 'String',
  TemplateHead = 'TemplateHead',
  TemplateMiddle = 'TemplateMiddle',
  TemplateTail = 'TemplateTail',
  TemplateNoSub = 'TemplateNoSub',
  True = 'True',
  False = 'False',
  Null = 'Null',

  // Identifiers
  Identifier = 'Identifier',

  // Arithmetic
  Plus = 'Plus',
  Minus = 'Minus',
  Star = 'Star',
  Slash = 'Slash',
  Percent = 'Percent',

  // Comparison
  EqualEqual = 'EqualEqual',
  BangEqual = 'BangEqual',
  Less = 'Less',
  Greater = 'Greater',
  LessEqual = 'LessEqual',
  GreaterEqual = 'GreaterEqual',

  // Logical
  AmpersandAmpersand = 'AmpersandAmpersand',
  PipePipe = 'PipePipe',
  Bang = 'Bang',

  // Assignment & mutation
  Equal = 'Equal',
  PlusPlus = 'PlusPlus',
  MinusMinus = 'MinusMinus',
  LessLess = 'LessLess',

  // Pipe
  PipeGreater = 'PipeGreater',

  // Arrow
  Arrow = 'Arrow',

  // Spread
  DotDotDot = 'DotDotDot',

  // Recursive descent
  DotDot = 'DotDot',

  // Conditional
  Question = 'Question',
  QuestionQuestion = 'QuestionQuestion',
  QuestionDot = 'QuestionDot',

  // Punctuation
  Dot = 'Dot',
  Comma = 'Comma',
  Colon = 'Colon',
  LeftParen = 'LeftParen',
  RightParen = 'RightParen',
  LeftBracket = 'LeftBracket',
  RightBracket = 'RightBracket',
  LeftBrace = 'LeftBrace',
  RightBrace = 'RightBrace',

  // End
  EOF = 'EOF',
}

export interface Token {
  type: TokenType;
  value: string;
  position: number;
}

// ─── AST Node Types ─────────────────────────────────────────────────────────

export type ASTNode =
  | LiteralNode
  | IdentifierNode
  | MemberAccessNode
  | IndexAccessNode
  | WildcardIndexNode
  | PredicateIndexNode
  | RecursiveDescentNode
  | BinaryOpNode
  | UnaryOpNode
  | LogicalOpNode
  | CallNode
  | PipeNode
  | ArrayLiteralNode
  | ObjectLiteralNode
  | SpreadElementNode
  | TemplateLiteralNode
  | AssignmentNode
  | UpdateNode
  | AppendNode
  | LambdaNode
  | TernaryNode
  | NullCoalescingNode;

export interface LiteralNode {
  type: 'Literal';
  value: number | string | boolean | null;
  raw: string;
}

export interface IdentifierNode {
  type: 'Identifier';
  name: string;
}

export interface MemberAccessNode {
  type: 'MemberAccess';
  object: ASTNode;
  property: string;
  optional?: boolean;
}

export interface IndexAccessNode {
  type: 'IndexAccess';
  object: ASTNode;
  index: ASTNode;
  optional?: boolean;
}

export interface WildcardIndexNode {
  type: 'WildcardIndex';
  object: ASTNode;
  optional?: boolean;
}

export interface PredicateIndexNode {
  type: 'PredicateIndex';
  object: ASTNode;
  predicate: LambdaNode;
  optional?: boolean;
}

export interface RecursiveDescentNode {
  type: 'RecursiveDescent';
  object: ASTNode;
  property: string;
  optional?: boolean;
}

export interface BinaryOpNode {
  type: 'BinaryOp';
  operator: '+' | '-' | '*' | '/' | '%' | '==' | '!=' | '<' | '>' | '<=' | '>=';
  left: ASTNode;
  right: ASTNode;
}

export interface UnaryOpNode {
  type: 'UnaryOp';
  operator: '-' | '!';
  operand: ASTNode;
}

export interface LogicalOpNode {
  type: 'LogicalOp';
  operator: '&&' | '||';
  left: ASTNode;
  right: ASTNode;
}

export interface CallNode {
  type: 'Call';
  callee: string;
  args: ASTNode[];
}

export interface PipeNode {
  type: 'Pipe';
  value: ASTNode;
  callee: string;
  args: ASTNode[];
}

export interface ArrayLiteralNode {
  type: 'ArrayLiteral';
  elements: ASTNode[];
}

export interface ObjectLiteralNode {
  type: 'ObjectLiteral';
  properties: ObjectProperty[];
}

export interface ObjectProperty {
  key: string;
  value: ASTNode;
  shorthand: boolean;
}

export interface SpreadElementNode {
  type: 'SpreadElement';
  argument: ASTNode;
}

export interface TemplateLiteralNode {
  type: 'TemplateLiteral';
  parts: TemplatePart[];
}

export type TemplatePart =
  | { type: 'string'; value: string }
  | { type: 'expression'; value: ASTNode };

export interface AssignmentNode {
  type: 'Assignment';
  target: ASTNode;
  value: ASTNode;
}

export interface UpdateNode {
  type: 'Update';
  operator: '++' | '--';
  target: ASTNode;
}

export interface AppendNode {
  type: 'Append';
  target: ASTNode;
  value: ASTNode;
}

export interface LambdaNode {
  type: 'Lambda';
  params: string[];
  body: ASTNode;
}

export interface TernaryNode {
  type: 'Ternary';
  condition: ASTNode;
  consequent: ASTNode;
  alternate: ASTNode;
}

export interface NullCoalescingNode {
  type: 'NullCoalescing';
  left: ASTNode;
  right: ASTNode;
}

// ─── Opcodes ────────────────────────────────────────────────────────────────

export enum Opcode {
  // Constants & loading
  CONST = 'CONST',
  LOAD = 'LOAD',
  DUP = 'DUP', // Duplicate top stack value

  // Arithmetic
  ADD = 'ADD',
  SUB = 'SUB',
  MUL = 'MUL',
  DIV = 'DIV',
  MOD = 'MOD',
  NEG = 'NEG',

  // String
  TO_STRING = 'TO_STRING',

  // Comparison
  EQ = 'EQ',
  NEQ = 'NEQ',
  LT = 'LT',
  GT = 'GT',
  LTE = 'LTE',
  GTE = 'GTE',

  // Logical & control flow
  NOT = 'NOT',
  JUMP_IF_FALSE = 'JUMP_IF_FALSE',
  JUMP_IF_TRUE = 'JUMP_IF_TRUE',
  JUMP = 'JUMP',

  // Construction
  MAKE_ARRAY = 'MAKE_ARRAY',
  MAKE_OBJ = 'MAKE_OBJ',
  SPREAD = 'SPREAD',

  // Access
  INDEX = 'INDEX',
  OPTIONAL_INDEX = 'OPTIONAL_INDEX',
  WILDCARD = 'WILDCARD',
  OPTIONAL_WILDCARD = 'OPTIONAL_WILDCARD',
  RECURSIVE_DESCENT = 'RECURSIVE_DESCENT',
  OPTIONAL_RECURSIVE_DESCENT = 'OPTIONAL_RECURSIVE_DESCENT',
  OPTIONAL_CHAIN_GET = 'OPTIONAL_CHAIN_GET', // Optional chaining property access (combines null check + get)
  OPTIONAL_CHAIN_INDEX = 'OPTIONAL_CHAIN_INDEX', // Optional chaining index access (combines null check + index)

  // Function calls
  CALL = 'CALL',

  // Mutation
  SET_PATH = 'SET_PATH',
  DELETE_PATH = 'DELETE_PATH',
  INC_PATH = 'INC_PATH',
  DEC_PATH = 'DEC_PATH',
  APPEND_PATH = 'APPEND_PATH',

  // Control
  RETURN = 'RETURN',
}

// ─── Bytecode ───────────────────────────────────────────────────────────────

export type Instruction = [Opcode, ...unknown[]];

export interface BytecodeProgram {
  version: number;
  slots: string[];
  constants: ExprValue[];
  code: Instruction[];
}

// ─── Values & Errors ────────────────────────────────────────────────────────

export interface LambdaValue {
  __lambda: true;
  program: BytecodeProgram;
  params: string[];
}

export type ExprValue =
  | number
  | string
  | boolean
  | null
  | ExprValue[]
  | ExprObject
  | ExprError
  | LambdaValue;

export type ExprObject = { [key: string]: ExprValue };

export interface ExprError {
  error: ExprErrorType;
  message: string;
}

export type ExprErrorType =
  | 'TYPE_ERROR'
  | 'DIVISION_BY_ZERO'
  | 'STACK_UNDERFLOW'
  | 'INVALID_SLOT'
  | 'INDEX_OUT_OF_BOUNDS'
  | 'INVALID_INSTRUCTION'
  | 'PARSE_ERROR'
  | 'COMPILE_ERROR';

export function isExprError(value: ExprValue): value is ExprError {
  return typeof value === 'object' && value !== null && 'error' in value && 'message' in value;
}

export function isLambdaValue(value: ExprValue): value is LambdaValue {
  return (
    typeof value === 'object' && value !== null && '__lambda' in value && value.__lambda === true
  );
}

export function makeError(error: ExprErrorType, message: string): ExprError {
  return { error, message };
}

// ─── Execution Context ──────────────────────────────────────────────────────

export interface ExecutionContext {
  state: Record<string, ExprValue>;
  data: Record<string, ExprValue>;
  env: Record<string, ExprValue>;
  [key: string]: Record<string, ExprValue>;
}
