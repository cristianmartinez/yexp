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
  // Constants & loading (0-9)
  CONST = 0,
  LOAD = 1,
  DUP = 2, // Duplicate top stack value
  POP = 3, // Pop and discard top stack value

  // Arithmetic (10-19)
  ADD = 10,
  SUB = 11,
  MUL = 12,
  DIV = 13,
  MOD = 14,
  NEG = 15,

  // String (20-29)
  TO_STRING = 20,

  // Comparison (30-39)
  EQ = 30,
  NEQ = 31,
  LT = 32,
  GT = 33,
  LTE = 34,
  GTE = 35,

  // Optimized comparison patterns (40-49)
  RANGE_CHECK = 40,           // value >= min && value <= max
  RANGE_CHECK_EXCLUSIVE = 41,  // value > min && value < max
  RANGE_CHECK_LO_INCLUSIVE = 42,  // value >= min && value < max
  RANGE_CHECK_HI_INCLUSIVE = 43,  // value > min && value <= max

  // Fused comparison opcodes (50-59)
  LOAD_GT_CONST = 50,       // Load slot, compare > constant
  LOAD_GTE_CONST = 51,     // Load slot, compare >= constant
  LOAD_LT_CONST = 52,       // Load slot, compare < constant
  LOAD_LTE_CONST = 53,     // Load slot, compare <= constant
  LOAD_EQ_CONST = 54,       // Load slot, compare == constant
  LOAD_NEQ_CONST = 55,     // Load slot, compare != constant

  // Fused arithmetic opcodes (60-69)
  LOAD_ADD_CONST = 60,     // Load slot, add constant
  LOAD_SUB_CONST = 61,     // Load slot, subtract constant
  LOAD_MUL_CONST = 62,     // Load slot, multiply by constant
  LOAD_DIV_CONST = 63,     // Load slot, divide by constant
  LOAD_MOD_CONST = 64,     // Load slot, modulo constant

  // Optimized increment/decrement (70-79)
  INCREMENT = 70,               // Load slot, add 1
  DECREMENT = 71,               // Load slot, subtract 1

  // Null and boolean checks (80-89)
  IS_NULL = 80,                   // Load slot, compare == null
  IS_NOT_NULL = 81,           // Load slot, compare != null
  IS_TRUTHY = 82,               // Load slot, boolean coercion !!x
  IS_FALSY = 83,                 // Load slot, boolean negation !x

  // Logical & control flow (90-99)
  NOT = 90,
  JUMP_IF_FALSE = 91,
  JUMP_IF_TRUE = 92,
  JUMP = 93,

  // Construction (100-109)
  MAKE_ARRAY = 100,
  MAKE_OBJ = 101,
  SPREAD = 102,

  // Access (110-129)
  INDEX = 110,
  OPTIONAL_INDEX = 111,
  WILDCARD = 112,
  OPTIONAL_WILDCARD = 113,
  RECURSIVE_DESCENT = 114,
  OPTIONAL_RECURSIVE_DESCENT = 115,
  OPTIONAL_CHAIN_GET = 116, // Optional chaining property access (combines null check + get)
  OPTIONAL_CHAIN_INDEX = 117, // Optional chaining index access (combines null check + index)

  // Function calls (130-139)
  CALL = 130,

  // Mutation (140-149)
  SET_PATH = 140,
  DELETE_PATH = 141,
  INC_PATH = 142,
  DEC_PATH = 143,
  APPEND_PATH = 144,

  // Control (200+)
  RETURN = 200,
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
