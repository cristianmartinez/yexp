import type { ASTNode, BytecodeProgram, ExprValue, Instruction, LambdaValue } from './types.js';
import { Opcode } from './types.js';

export class CompileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CompileError';
  }
}

export function compile(ast: ASTNode): BytecodeProgram {
  const slots: string[] = [];
  const constants: ExprValue[] = [];
  const code: Instruction[] = [];

  function addSlot(path: string): number {
    const existing = slots.indexOf(path);
    if (existing !== -1) return existing;
    slots.push(path);
    return slots.length - 1;
  }

  function addConstant(value: ExprValue): number {
    // Don't deduplicate objects, arrays, or lambdas
    if (typeof value === 'object' && value !== null) {
      constants.push(value);
      return constants.length - 1;
    }
    const existing = constants.indexOf(value);
    if (existing !== -1) return existing;
    constants.push(value);
    return constants.length - 1;
  }

  function emit(...instruction: Instruction): number {
    const index = code.length;
    code.push(instruction);
    return index;
  }

  function resolvePath(node: ASTNode): string {
    if (node.type === 'Identifier') return node.name;
    if (node.type === 'MemberAccess') {
      return `${resolvePath(node.object)}.${node.property}`;
    }
    if (node.type === 'IndexAccess' && node.index.type === 'Literal') {
      return `${resolvePath(node.object)}[${node.index.value}]`;
    }
    throw new CompileError('Cannot resolve dynamic path for slot');
  }

  function isPath(node: ASTNode): boolean {
    if (node.type === 'Identifier') return true;
    if (node.type === 'MemberAccess') return isPath(node.object);
    if (node.type === 'IndexAccess' && node.index.type === 'Literal') return isPath(node.object);
    return false;
  }

  function isStatePath(node: ASTNode): boolean {
    if (node.type === 'Identifier') return node.name === 'state';
    if (node.type === 'MemberAccess') return isStatePath(node.object);
    if (node.type === 'IndexAccess') return isStatePath(node.object);
    return false;
  }

  function compileNode(node: ASTNode): void {
    switch (node.type) {
      case 'Literal':
        emit(Opcode.CONST, addConstant(node.value));
        break;

      case 'Identifier':
        if (isPath(node)) {
          emit(Opcode.LOAD, addSlot(node.name));
        }
        break;

      case 'MemberAccess':
        if (node.optional) {
          compileOptionalMemberAccess(node);
        } else if (isPath(node)) {
          emit(Opcode.LOAD, addSlot(resolvePath(node)));
        } else {
          compileNode(node.object);
          emit(Opcode.CONST, addConstant(node.property));
          emit(Opcode.INDEX, -1); // dynamic index
        }
        break;

      case 'IndexAccess':
        if (node.optional) {
          compileOptionalIndexAccess(node);
        } else if (isPath(node) && node.index.type === 'Literal') {
          emit(Opcode.LOAD, addSlot(resolvePath(node)));
        } else {
          compileNode(node.object);
          if (node.index.type === 'Literal' && typeof node.index.value === 'number') {
            emit(Opcode.INDEX, node.index.value);
          } else {
            compileNode(node.index);
            emit(Opcode.INDEX, -1); // dynamic index
          }
        }
        break;

      case 'BinaryOp':
        compileNode(node.left);
        compileNode(node.right);
        switch (node.operator) {
          case '+':
            emit(Opcode.ADD);
            break;
          case '-':
            emit(Opcode.SUB);
            break;
          case '*':
            emit(Opcode.MUL);
            break;
          case '/':
            emit(Opcode.DIV);
            break;
          case '%':
            emit(Opcode.MOD);
            break;
          case '==':
            emit(Opcode.EQ);
            break;
          case '!=':
            emit(Opcode.NEQ);
            break;
          case '<':
            emit(Opcode.LT);
            break;
          case '>':
            emit(Opcode.GT);
            break;
          case '<=':
            emit(Opcode.LTE);
            break;
          case '>=':
            emit(Opcode.GTE);
            break;
        }
        break;

      case 'UnaryOp':
        compileNode(node.operand);
        if (node.operator === '-') emit(Opcode.NEG);
        else emit(Opcode.NOT);
        break;

      case 'LogicalOp':
        compileLogical(node.operator, node.left, node.right);
        break;

      case 'Call':
        for (const arg of node.args) {
          compileNode(arg);
        }
        emit(Opcode.CALL, node.callee, node.args.length);
        break;

      case 'Pipe':
        compileNode(node.value);
        for (const arg of node.args) {
          compileNode(arg);
        }
        emit(Opcode.CALL, node.callee, node.args.length + 1);
        break;

      case 'ArrayLiteral':
        compileArrayLiteral(node.elements);
        break;

      case 'ObjectLiteral':
        compileObjectLiteral(node);
        break;

      case 'SpreadElement':
        compileNode(node.argument);
        emit(Opcode.SPREAD);
        break;

      case 'TemplateLiteral':
        compileTemplateLiteral(node.parts);
        break;

      case 'Assignment':
        compileAssignment(node.target, node.value);
        break;

      case 'Update':
        compileUpdate(node);
        break;

      case 'Append':
        compileAppend(node.target, node.value);
        break;

      case 'Lambda':
        compileLambda(node);
        break;

      case 'Ternary':
        compileTernary(node);
        break;

      case 'NullCoalescing':
        compileNullCoalescing(node);
        break;

      case 'WildcardIndex':
        // Syntactic sugar: just compile the object
        // The wildcard behavior is handled by INDEX opcode auto-mapping on arrays
        // For objects, we need to convert to Object.values
        compileNode(node.object);
        if (node.optional) {
          emit(Opcode.OPTIONAL_WILDCARD);
        } else {
          emit(Opcode.WILDCARD);
        }
        break;

      case 'PredicateIndex':
        // Syntactic sugar: transform to filter operation
        // arr[.condition] => arr |> filter(.condition)
        compileNode(node.object);
        if (node.optional) {
          // For optional predicate, we need to handle null/undefined
          // We'll emit a null coalescing to return empty array
          emit(Opcode.CONST, addConstant(null));
          emit(Opcode.EQ);
          const skipIndex = emit(Opcode.JUMP_IF_TRUE, 0); // placeholder

          // Not null: compile object again and filter
          compileNode(node.object);
          compileLambda(node.predicate);
          emit(Opcode.CALL, 'filter', 2);
          const doneIndex = emit(Opcode.JUMP, 0); // placeholder

          // Null: push empty array
          const nullLabel = code.length;
          emit(Opcode.CONST, addConstant([]));

          // Patch jumps
          const endLabel = code.length;
          code[skipIndex] = [Opcode.JUMP_IF_TRUE, nullLabel];
          code[doneIndex] = [Opcode.JUMP, endLabel];
        } else {
          compileLambda(node.predicate);
          emit(Opcode.CALL, 'filter', 2);
        }
        break;

      case 'RecursiveDescent':
        compileNode(node.object);
        emit(Opcode.CONST, addConstant(node.property));
        if (node.optional) {
          emit(Opcode.OPTIONAL_RECURSIVE_DESCENT);
        } else {
          emit(Opcode.RECURSIVE_DESCENT);
        }
        break;
    }
  }

  function compileLambda(node: { params: string[]; body: ASTNode }): void {
    const subProgram = compile(node.body);
    const lambdaValue: LambdaValue = {
      __lambda: true,
      program: subProgram,
      params: node.params,
    };
    emit(Opcode.CONST, addConstant(lambdaValue as unknown as ExprValue));
  }

  function compileLogical(operator: '&&' | '||', left: ASTNode, right: ASTNode): void {
    compileNode(left);
    const jumpOp = operator === '&&' ? Opcode.JUMP_IF_FALSE : Opcode.JUMP_IF_TRUE;
    const skipIndex = emit(jumpOp, 0); // placeholder
    compileNode(right);
    const doneIndex = emit(Opcode.JUMP, 0); // placeholder

    // Patch skip jump to land here (push the short-circuit value)
    const falseLabel = code.length;
    emit(Opcode.CONST, addConstant(operator !== '&&'));

    // Patch done jump
    const endLabel = code.length;
    code[skipIndex] = [jumpOp, falseLabel];
    code[doneIndex] = [Opcode.JUMP, endLabel];
  }

  function compileTernary(node: {
    condition: ASTNode;
    consequent: ASTNode;
    alternate: ASTNode;
  }): void {
    compileNode(node.condition);
    const jumpIfFalse = emit(Opcode.JUMP_IF_FALSE, 0); // placeholder
    compileNode(node.consequent);
    const jumpToEnd = emit(Opcode.JUMP, 0); // placeholder

    // Alternate branch
    const alternateLabel = code.length;
    compileNode(node.alternate);

    // Patch jumps
    const endLabel = code.length;
    code[jumpIfFalse] = [Opcode.JUMP_IF_FALSE, alternateLabel];
    code[jumpToEnd] = [Opcode.JUMP, endLabel];
  }

  function compileNullCoalescing(node: { left: ASTNode; right: ASTNode }): void {
    compileNode(node.left);
    // Duplicate value on stack for null check
    emit(Opcode.CONST, addConstant(null));
    emit(Opcode.NEQ);
    const jumpIfNotNull = emit(Opcode.JUMP_IF_TRUE, 0); // placeholder

    // Left is null, evaluate right
    compileNode(node.right);
    const jumpToEnd = emit(Opcode.JUMP, 0); // placeholder

    // Left is not null, use it
    const notNullLabel = code.length;
    compileNode(node.left);

    // Patch jumps
    const endLabel = code.length;
    code[jumpIfNotNull] = [Opcode.JUMP_IF_TRUE, notNullLabel];
    code[jumpToEnd] = [Opcode.JUMP, endLabel];
  }

  function compileOptionalMemberAccess(node: {
    object: ASTNode;
    property: string;
    optional?: boolean;
  }): void {
    // Compile object and emit specialized optional chain opcode
    compileNode(node.object);
    emit(Opcode.OPTIONAL_CHAIN_GET, node.property);
  }

  function compileOptionalIndexAccess(node: {
    object: ASTNode;
    index: ASTNode;
    optional?: boolean;
  }): void {
    // Compile object and emit specialized optional chain opcode
    compileNode(node.object);

    // Handle static vs dynamic index
    if (node.index.type === 'Literal' && typeof node.index.value === 'number') {
      emit(Opcode.OPTIONAL_CHAIN_INDEX, node.index.value);
    } else {
      compileNode(node.index);
      emit(Opcode.OPTIONAL_CHAIN_INDEX, -1); // dynamic index
    }
  }

  function compileArrayLiteral(elements: ASTNode[]): void {
    let stackCount = 0;
    for (const el of elements) {
      compileNode(el);
      stackCount++;
      if (el.type === 'SpreadElement') {
        stackCount++; // SPREAD adds a marker to the stack
      }
    }
    emit(Opcode.MAKE_ARRAY, stackCount);
  }

  function compileObjectLiteral(node: {
    properties: Array<{ key: string; value: ASTNode; shorthand: boolean }>;
  }): void {
    let segmentCount = 0;
    for (const prop of node.properties) {
      if (prop.key === '__spread__' && prop.value.type === 'SpreadElement') {
        compileNode(prop.value);
        segmentCount++;
      } else {
        emit(Opcode.CONST, addConstant(prop.key));
        compileNode(prop.value);
        segmentCount++;
      }
    }
    emit(Opcode.MAKE_OBJ, segmentCount);
  }

  function compileTemplateLiteral(parts: Array<{ type: string; value: string | ASTNode }>): void {
    let first = true;
    for (const part of parts) {
      if (part.type === 'string') {
        emit(Opcode.CONST, addConstant(part.value as string));
      } else {
        compileNode(part.value as ASTNode);
        emit(Opcode.TO_STRING);
      }
      if (!first) {
        emit(Opcode.ADD);
      }
      first = false;
    }
  }

  function compileAssignment(target: ASTNode, value: ASTNode): void {
    if (!isStatePath(target)) {
      throw new CompileError('Can only assign to state paths');
    }
    compileNode(value);
    const path = resolvePath(target);
    emit(Opcode.SET_PATH, addSlot(path));
  }

  function compileUpdate(node: { operator: '++' | '--'; target: ASTNode }): void {
    if (!isStatePath(node.target)) {
      throw new CompileError('Can only update state paths');
    }
    const path = resolvePath(node.target);
    const slot = addSlot(path);
    if (node.operator === '++') {
      emit(Opcode.INC_PATH, slot);
    } else {
      emit(Opcode.DEC_PATH, slot);
    }
  }

  function compileAppend(target: ASTNode, value: ASTNode): void {
    if (!isStatePath(target)) {
      throw new CompileError('Can only append to state paths');
    }
    compileNode(value);
    const path = resolvePath(target);
    emit(Opcode.APPEND_PATH, addSlot(path));
  }

  compileNode(ast);
  emit(Opcode.RETURN);

  return { version: 1, slots, constants, code };
}
