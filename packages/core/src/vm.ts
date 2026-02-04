import type {
  BytecodeProgram,
  ExecutionContext,
  ExprObject,
  ExprValue,
  LambdaValue,
} from './types.js';
import { Opcode, isExprError, isLambdaValue, makeError } from './types.js';

type BuiltinFn = (...args: ExprValue[]) => ExprValue;
type HOBuiltinFn = (context: ExecutionContext, ...args: ExprValue[]) => ExprValue;

function invokeLambda(
  lambda: LambdaValue,
  context: ExecutionContext,
  args: ExprValue[],
): ExprValue {
  const lambdaContext: ExecutionContext = { ...context };
  for (let i = 0; i < lambda.params.length; i++) {
    (lambdaContext as Record<string, ExprValue>)[lambda.params[i]!] = args[i] ?? null;
  }
  return evaluate(lambda.program, lambdaContext);
}

const BUILTINS = new Map<string, BuiltinFn>([
  ['toString', (v) => String(v)],
  [
    'length',
    (v) => {
      if (typeof v === 'string') return v.length;
      if (Array.isArray(v)) return v.length;
      return makeError('TYPE_ERROR', 'length requires a string or array');
    },
  ],
  [
    'round',
    (v, decimals) => {
      if (typeof v !== 'number') return makeError('TYPE_ERROR', 'round requires a number');
      const d = typeof decimals === 'number' ? decimals : 0;
      const factor = 10 ** d;
      return Math.round(v * factor) / factor;
    },
  ],
  [
    'floor',
    (v) => {
      if (typeof v !== 'number') return makeError('TYPE_ERROR', 'floor requires a number');
      return Math.floor(v);
    },
  ],
  [
    'ceil',
    (v) => {
      if (typeof v !== 'number') return makeError('TYPE_ERROR', 'ceil requires a number');
      return Math.ceil(v);
    },
  ],
  [
    'abs',
    (v) => {
      if (typeof v !== 'number') return makeError('TYPE_ERROR', 'abs requires a number');
      return Math.abs(v);
    },
  ],
  [
    'min',
    (...args) => {
      for (const a of args) {
        if (typeof a !== 'number') return makeError('TYPE_ERROR', 'min requires numbers');
      }
      return Math.min(...(args as number[]));
    },
  ],
  [
    'max',
    (...args) => {
      for (const a of args) {
        if (typeof a !== 'number') return makeError('TYPE_ERROR', 'max requires numbers');
      }
      return Math.max(...(args as number[]));
    },
  ],
  [
    'slice',
    (v, start, end) => {
      if (Array.isArray(v)) return v.slice(start as number, end as number | undefined);
      if (typeof v === 'string') return v.slice(start as number, end as number | undefined);
      return makeError('TYPE_ERROR', 'slice requires a string or array');
    },
  ],
  [
    'includes',
    (v, item) => {
      if (Array.isArray(v)) return v.includes(item);
      if (typeof v === 'string' && typeof item === 'string') return v.includes(item);
      return makeError('TYPE_ERROR', 'includes requires a string or array');
    },
  ],
  [
    'keys',
    (v) => {
      if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
        return Object.keys(v as ExprObject);
      }
      return makeError('TYPE_ERROR', 'keys requires an object');
    },
  ],
  [
    'values',
    (v) => {
      if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
        return Object.values(v as ExprObject);
      }
      return makeError('TYPE_ERROR', 'values requires an object');
    },
  ],
  [
    'type',
    (v) => {
      if (v === null) return 'null';
      if (Array.isArray(v)) return 'array';
      return typeof v;
    },
  ],
]);

const HO_BUILTINS = new Map<string, HOBuiltinFn>([
  [
    'filter',
    (ctx, collection, lambda) => {
      if (!Array.isArray(collection)) return makeError('TYPE_ERROR', 'filter requires an array');
      if (!isLambdaValue(lambda)) return makeError('TYPE_ERROR', 'filter requires a lambda');
      return collection.filter((item) => {
        const result = invokeLambda(lambda, ctx, [item]);
        return isTruthy(result);
      });
    },
  ],
  [
    'map',
    (ctx, collection, lambda) => {
      if (!Array.isArray(collection)) return makeError('TYPE_ERROR', 'map requires an array');
      if (!isLambdaValue(lambda)) return makeError('TYPE_ERROR', 'map requires a lambda');
      return collection.map((item) => invokeLambda(lambda, ctx, [item]));
    },
  ],
  [
    'find',
    (ctx, collection, lambda) => {
      if (!Array.isArray(collection)) return makeError('TYPE_ERROR', 'find requires an array');
      if (!isLambdaValue(lambda)) return makeError('TYPE_ERROR', 'find requires a lambda');
      for (const item of collection) {
        if (isTruthy(invokeLambda(lambda, ctx, [item]))) return item;
      }
      return null;
    },
  ],
  [
    'reduce',
    (ctx, collection, lambda, initial) => {
      if (!Array.isArray(collection)) return makeError('TYPE_ERROR', 'reduce requires an array');
      if (!isLambdaValue(lambda)) return makeError('TYPE_ERROR', 'reduce requires a lambda');
      let acc = initial ?? null;
      for (const item of collection) {
        acc = invokeLambda(lambda, ctx, [acc, item]);
      }
      return acc;
    },
  ],
  [
    'every',
    (ctx, collection, lambda) => {
      if (!Array.isArray(collection)) return makeError('TYPE_ERROR', 'every requires an array');
      if (!isLambdaValue(lambda)) return makeError('TYPE_ERROR', 'every requires a lambda');
      for (const item of collection) {
        if (!isTruthy(invokeLambda(lambda, ctx, [item]))) return false;
      }
      return true;
    },
  ],
  [
    'some',
    (ctx, collection, lambda) => {
      if (!Array.isArray(collection)) return makeError('TYPE_ERROR', 'some requires an array');
      if (!isLambdaValue(lambda)) return makeError('TYPE_ERROR', 'some requires a lambda');
      for (const item of collection) {
        if (isTruthy(invokeLambda(lambda, ctx, [item]))) return true;
      }
      return false;
    },
  ],
  [
    'sort',
    (ctx, collection, lambda?) => {
      if (!Array.isArray(collection)) return makeError('TYPE_ERROR', 'sort requires an array');
      const copy = [...collection];
      if (!lambda || !isLambdaValue(lambda)) {
        copy.sort((a, b) => {
          if (typeof a === 'number' && typeof b === 'number') return a - b;
          return String(a).localeCompare(String(b));
        });
        return copy;
      }
      copy.sort((a, b) => {
        const result = invokeLambda(lambda, ctx, [a, b]);
        return typeof result === 'number' ? result : 0;
      });
      return copy;
    },
  ],
  [
    'flatMap',
    (ctx, collection, lambda) => {
      if (!Array.isArray(collection)) return makeError('TYPE_ERROR', 'flatMap requires an array');
      if (!isLambdaValue(lambda)) return makeError('TYPE_ERROR', 'flatMap requires a lambda');
      const result: ExprValue[] = [];
      for (const item of collection) {
        const mapped = invokeLambda(lambda, ctx, [item]);
        if (Array.isArray(mapped)) {
          result.push(...mapped);
        } else {
          result.push(mapped);
        }
      }
      return result;
    },
  ],
]);

// Sentinel to mark spread boundaries on the stack
const SPREAD_MARKER = Symbol('spread');
type StackValue = ExprValue | typeof SPREAD_MARKER;

export function evaluate(program: BytecodeProgram, context: ExecutionContext): ExprValue {
  const stack: StackValue[] = [];
  const { code, constants, slots: slotPaths } = program;

  // Resolve slots from context
  const slotValues: ExprValue[] = slotPaths.map((path) => resolvePath(context, path));

  let ip = 0;

  function push(value: StackValue): void {
    stack.push(value);
  }

  function pop(): ExprValue {
    if (stack.length === 0) {
      return makeError('STACK_UNDERFLOW', 'Stack underflow');
    }
    return stack.pop() as ExprValue;
  }

  while (ip < code.length) {
    const instruction = code[ip]!;
    const op = instruction[0];

    switch (op) {
      case Opcode.CONST: {
        const idx = instruction[1] as number;
        push(constants[idx]!);
        break;
      }

      case Opcode.LOAD: {
        const idx = instruction[1] as number;
        if (idx < 0 || idx >= slotValues.length) {
          return makeError('INVALID_SLOT', `Invalid slot index: ${idx}`);
        }
        push(slotValues[idx]!);
        break;
      }

      case Opcode.ADD: {
        const b = pop();
        const a = pop();
        if (isExprError(a)) return a;
        if (isExprError(b)) return b;
        if (typeof a === 'number' && typeof b === 'number') {
          push(a + b);
        } else if (typeof a === 'string' && typeof b === 'string') {
          push(a + b);
        } else {
          return makeError('TYPE_ERROR', `Cannot add ${typeof a} and ${typeof b}`);
        }
        break;
      }

      case Opcode.SUB: {
        const b = pop();
        const a = pop();
        if (isExprError(a)) return a;
        if (isExprError(b)) return b;
        if (typeof a !== 'number' || typeof b !== 'number') {
          return makeError('TYPE_ERROR', `Cannot subtract ${typeof a} and ${typeof b}`);
        }
        push(a - b);
        break;
      }

      case Opcode.MUL: {
        const b = pop();
        const a = pop();
        if (isExprError(a)) return a;
        if (isExprError(b)) return b;
        if (typeof a !== 'number' || typeof b !== 'number') {
          return makeError('TYPE_ERROR', `Cannot multiply ${typeof a} and ${typeof b}`);
        }
        push(a * b);
        break;
      }

      case Opcode.DIV: {
        const b = pop();
        const a = pop();
        if (isExprError(a)) return a;
        if (isExprError(b)) return b;
        if (typeof a !== 'number' || typeof b !== 'number') {
          return makeError('TYPE_ERROR', `Cannot divide ${typeof a} and ${typeof b}`);
        }
        if (b === 0) return makeError('DIVISION_BY_ZERO', 'Division by zero');
        push(a / b);
        break;
      }

      case Opcode.MOD: {
        const b = pop();
        const a = pop();
        if (isExprError(a)) return a;
        if (isExprError(b)) return b;
        if (typeof a !== 'number' || typeof b !== 'number') {
          return makeError('TYPE_ERROR', `Cannot modulo ${typeof a} and ${typeof b}`);
        }
        if (b === 0) return makeError('DIVISION_BY_ZERO', 'Division by zero');
        push(a % b);
        break;
      }

      case Opcode.NEG: {
        const v = pop();
        if (isExprError(v)) return v;
        if (typeof v !== 'number') return makeError('TYPE_ERROR', 'Cannot negate non-number');
        push(-v);
        break;
      }

      case Opcode.TO_STRING: {
        const v = pop();
        if (isExprError(v)) return v;
        push(String(v));
        break;
      }

      case Opcode.EQ: {
        const b = pop();
        const a = pop();
        if (isExprError(a)) return a;
        if (isExprError(b)) return b;
        push(a === b);
        break;
      }

      case Opcode.NEQ: {
        const b = pop();
        const a = pop();
        if (isExprError(a)) return a;
        if (isExprError(b)) return b;
        push(a !== b);
        break;
      }

      case Opcode.LT: {
        const b = pop();
        const a = pop();
        if (isExprError(a)) return a;
        if (isExprError(b)) return b;
        if (typeof a !== 'number' || typeof b !== 'number') {
          return makeError('TYPE_ERROR', `Cannot compare ${typeof a} and ${typeof b}`);
        }
        push(a < b);
        break;
      }

      case Opcode.GT: {
        const b = pop();
        const a = pop();
        if (isExprError(a)) return a;
        if (isExprError(b)) return b;
        if (typeof a !== 'number' || typeof b !== 'number') {
          return makeError('TYPE_ERROR', `Cannot compare ${typeof a} and ${typeof b}`);
        }
        push(a > b);
        break;
      }

      case Opcode.LTE: {
        const b = pop();
        const a = pop();
        if (isExprError(a)) return a;
        if (isExprError(b)) return b;
        if (typeof a !== 'number' || typeof b !== 'number') {
          return makeError('TYPE_ERROR', `Cannot compare ${typeof a} and ${typeof b}`);
        }
        push(a <= b);
        break;
      }

      case Opcode.GTE: {
        const b = pop();
        const a = pop();
        if (isExprError(a)) return a;
        if (isExprError(b)) return b;
        if (typeof a !== 'number' || typeof b !== 'number') {
          return makeError('TYPE_ERROR', `Cannot compare ${typeof a} and ${typeof b}`);
        }
        push(a >= b);
        break;
      }

      case Opcode.NOT: {
        const v = pop();
        if (isExprError(v)) return v;
        push(!isTruthy(v));
        break;
      }

      case Opcode.JUMP_IF_FALSE: {
        const target = instruction[1] as number;
        const v = pop();
        if (isExprError(v)) return v;
        if (!isTruthy(v)) {
          ip = target;
          continue;
        }
        break;
      }

      case Opcode.JUMP_IF_TRUE: {
        const target = instruction[1] as number;
        const v = pop();
        if (isExprError(v)) return v;
        if (isTruthy(v)) {
          ip = target;
          continue;
        }
        break;
      }

      case Opcode.JUMP: {
        ip = instruction[1] as number;
        continue;
      }

      case Opcode.MAKE_ARRAY: {
        const count = instruction[1] as number;
        const items = stack.splice(stack.length - count, count);
        const result: ExprValue[] = [];
        for (let i = 0; i < items.length; i++) {
          if (items[i] === SPREAD_MARKER) {
            i++;
            const source = items[i] as ExprValue;
            if (Array.isArray(source)) {
              result.push(...source);
            } else {
              result.push(source);
            }
          } else {
            result.push(items[i] as ExprValue);
          }
        }
        push(result);
        break;
      }

      case Opcode.MAKE_OBJ: {
        const count = instruction[1] as number;
        const items = stack.splice(stack.length - count * 2, count * 2);
        const result: ExprObject = {};

        // Handle spreads and key-value pairs
        // Items can be: SPREAD_MARKER, object (spread source), key, value
        let i = 0;
        while (i < items.length) {
          if (items[i] === SPREAD_MARKER) {
            i++;
            const source = items[i] as ExprObject;
            if (
              typeof source === 'object' &&
              source !== null &&
              !Array.isArray(source) &&
              !isExprError(source)
            ) {
              Object.assign(result, source);
            }
            i++;
          } else {
            const key = items[i] as string;
            i++;
            const value = items[i] as ExprValue;
            i++;
            result[key] = value;
          }
        }
        push(result);
        break;
      }

      case Opcode.SPREAD: {
        // Mark the top of stack as a spread
        push(SPREAD_MARKER);
        // Swap: marker should be before the spread value
        const len = stack.length;
        if (len >= 2) {
          const tmp = stack[len - 1]!;
          stack[len - 1] = stack[len - 2]!;
          stack[len - 2] = tmp;
        }
        break;
      }

      case Opcode.INDEX: {
        const idx = instruction[1] as number;
        const arr = pop();
        if (isExprError(arr)) return arr;
        if (!Array.isArray(arr)) {
          return makeError('TYPE_ERROR', 'Cannot index non-array');
        }
        if (idx < 0 || idx >= arr.length) {
          return makeError(
            'INDEX_OUT_OF_BOUNDS',
            `Index ${idx} out of bounds (length ${arr.length})`,
          );
        }
        push(arr[idx]!);
        break;
      }

      case Opcode.CALL: {
        const name = instruction[1] as string;
        const argc = instruction[2] as number;
        const args = stack.splice(stack.length - argc, argc) as ExprValue[];

        // Check higher-order builtins first (they need context)
        const hoFn = HO_BUILTINS.get(name);
        if (hoFn) {
          const result = hoFn(context, ...args);
          push(result);
          break;
        }

        const fn = BUILTINS.get(name);
        if (!fn) {
          return makeError('INVALID_INSTRUCTION', `Unknown function: ${name}`);
        }
        const result = fn(...args);
        push(result);
        break;
      }

      case Opcode.SET_PATH: {
        const slotIdx = instruction[1] as number;
        const value = pop();
        if (isExprError(value)) return value;
        const path = slotPaths[slotIdx]!;
        setPath(context, path, value);
        slotValues[slotIdx] = value;
        break;
      }

      case Opcode.DELETE_PATH: {
        const slotIdx = instruction[1] as number;
        const path = slotPaths[slotIdx]!;
        deletePath(context, path);
        slotValues[slotIdx] = null;
        break;
      }

      case Opcode.INC_PATH: {
        const slotIdx = instruction[1] as number;
        const current = slotValues[slotIdx];
        if (typeof current !== 'number') {
          return makeError('TYPE_ERROR', 'Cannot increment non-number');
        }
        const newVal = current + 1;
        const path = slotPaths[slotIdx]!;
        setPath(context, path, newVal);
        slotValues[slotIdx] = newVal;
        break;
      }

      case Opcode.DEC_PATH: {
        const slotIdx = instruction[1] as number;
        const current = slotValues[slotIdx];
        if (typeof current !== 'number') {
          return makeError('TYPE_ERROR', 'Cannot decrement non-number');
        }
        const newVal = current - 1;
        const path = slotPaths[slotIdx]!;
        setPath(context, path, newVal);
        slotValues[slotIdx] = newVal;
        break;
      }

      case Opcode.APPEND_PATH: {
        const slotIdx = instruction[1] as number;
        const value = pop();
        if (isExprError(value)) return value;
        const current = slotValues[slotIdx];
        if (!Array.isArray(current)) {
          return makeError('TYPE_ERROR', 'Cannot append to non-array');
        }
        current.push(value);
        break;
      }

      case Opcode.RETURN: {
        if (stack.length === 0) return null; // action expressions may leave stack empty
        return pop();
      }

      default:
        return makeError('INVALID_INSTRUCTION', `Unknown opcode: ${op}`);
    }

    ip++;
  }

  return makeError('INVALID_INSTRUCTION', 'Program ended without RETURN');
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function isTruthy(value: ExprValue): boolean {
  if (value === null || value === false) return false;
  return true;
}

function resolvePath(context: ExecutionContext, path: string): ExprValue {
  const parts = parsePath(path);
  let current: ExprValue = context as unknown as ExprValue;

  for (const part of parts) {
    if (current === null || current === undefined) return null;
    if (typeof current === 'object' && !Array.isArray(current) && !isExprError(current)) {
      current = (current as ExprObject)[part] ?? null;
    } else if (Array.isArray(current)) {
      const idx = Number(part);
      if (Number.isNaN(idx)) return null;
      current = current[idx] ?? null;
    } else {
      return null;
    }
  }

  return current;
}

function setPath(context: ExecutionContext, path: string, value: ExprValue): void {
  const parts = parsePath(path);
  let current: Record<string, ExprValue> = context as unknown as Record<string, ExprValue>;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]!;
    const next = current[part];
    if (typeof next === 'object' && next !== null && !Array.isArray(next)) {
      current = next as Record<string, ExprValue>;
    } else {
      return; // path doesn't exist
    }
  }

  const lastPart = parts[parts.length - 1]!;
  current[lastPart] = value;
}

function deletePath(context: ExecutionContext, path: string): void {
  const parts = parsePath(path);
  let current: Record<string, ExprValue> = context as unknown as Record<string, ExprValue>;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]!;
    const next = current[part];
    if (typeof next === 'object' && next !== null && !Array.isArray(next)) {
      current = next as Record<string, ExprValue>;
    } else {
      return;
    }
  }

  const lastPart = parts[parts.length - 1]!;
  delete current[lastPart];
}

function parsePath(path: string): string[] {
  const parts: string[] = [];
  let current = '';
  for (let i = 0; i < path.length; i++) {
    const ch = path[i]!;
    if (ch === '.') {
      if (current) parts.push(current);
      current = '';
    } else if (ch === '[') {
      if (current) parts.push(current);
      current = '';
    } else if (ch === ']') {
      if (current) parts.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  if (current) parts.push(current);
  return parts;
}
