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
  [
    'add',
    (v) => {
      if (!Array.isArray(v)) return makeError('TYPE_ERROR', 'add requires an array');
      if (v.length === 0) return null;
      const first = v[0];
      if (typeof first === 'number') {
        let sum = 0;
        for (const item of v) {
          if (typeof item !== 'number') {
            return makeError(
              'TYPE_ERROR',
              'add requires all elements to be numbers or all strings',
            );
          }
          sum += item;
        }
        return sum;
      }
      if (typeof first === 'string') {
        let result = '';
        for (const item of v) {
          if (typeof item !== 'string') {
            return makeError(
              'TYPE_ERROR',
              'add requires all elements to be numbers or all strings',
            );
          }
          result += item;
        }
        return result;
      }
      return makeError('TYPE_ERROR', 'add requires array of numbers or strings');
    },
  ],
  [
    'unique',
    (v) => {
      if (!Array.isArray(v)) return makeError('TYPE_ERROR', 'unique requires an array');
      return Array.from(new Set(v));
    },
  ],
  [
    'reverse',
    (v) => {
      if (!Array.isArray(v)) return makeError('TYPE_ERROR', 'reverse requires an array');
      return [...v].reverse();
    },
  ],
  [
    'flatten',
    (v, depth) => {
      if (!Array.isArray(v)) return makeError('TYPE_ERROR', 'flatten requires an array');
      const d = typeof depth === 'number' ? depth : Number.POSITIVE_INFINITY;
      const flattenHelper = (arr: ExprValue[], currentDepth: number): ExprValue[] => {
        const result: ExprValue[] = [];
        for (const item of arr) {
          if (Array.isArray(item) && currentDepth > 0) {
            result.push(...flattenHelper(item, currentDepth - 1));
          } else {
            result.push(item);
          }
        }
        return result;
      };
      return flattenHelper(v, d);
    },
  ],
  [
    'entries',
    (v) => {
      if (typeof v !== 'object' || v === null || Array.isArray(v)) {
        return makeError('TYPE_ERROR', 'entries requires an object');
      }
      const obj = v as ExprObject;
      const entries: ExprValue[] = [];
      for (const [key, value] of Object.entries(obj)) {
        entries.push({ key, value } as ExprObject);
      }
      return entries;
    },
  ],
  [
    'fromEntries',
    (v) => {
      if (!Array.isArray(v)) return makeError('TYPE_ERROR', 'fromEntries requires an array');
      const result: ExprObject = {};
      for (const item of v) {
        if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
          const entry = item as ExprObject;
          const key = entry.key;
          const value = entry.value;
          if (typeof key === 'string') {
            result[key] = value ?? null;
          }
        }
      }
      return result;
    },
  ],
  [
    'del',
    (v, key) => {
      if (typeof v !== 'object' || v === null || Array.isArray(v)) {
        return makeError('TYPE_ERROR', 'del requires an object');
      }
      if (typeof key !== 'string') {
        return makeError('TYPE_ERROR', 'del requires a string key');
      }
      const obj = v as ExprObject;
      const result = { ...obj };
      delete result[key];
      return result;
    },
  ],
  [
    'pick',
    (v, keys) => {
      if (typeof v !== 'object' || v === null || Array.isArray(v)) {
        return makeError('TYPE_ERROR', 'pick requires an object');
      }
      if (!Array.isArray(keys)) {
        return makeError('TYPE_ERROR', 'pick requires an array of keys');
      }
      const obj = v as ExprObject;
      const result: ExprObject = {};
      for (const key of keys) {
        if (typeof key === 'string' && key in obj) {
          result[key] = obj[key]!;
        }
      }
      return result;
    },
  ],
  [
    'has',
    (v, key) => {
      if (typeof v !== 'object' || v === null || Array.isArray(v)) {
        return makeError('TYPE_ERROR', 'has requires an object');
      }
      if (typeof key !== 'string') {
        return makeError('TYPE_ERROR', 'has requires a string key');
      }
      const obj = v as ExprObject;
      return key in obj;
    },
  ],
  [
    'join',
    (v, separator) => {
      if (!Array.isArray(v)) return makeError('TYPE_ERROR', 'join requires an array');
      const sep = typeof separator === 'string' ? separator : '';
      return v.map((item) => String(item)).join(sep);
    },
  ],
  [
    'startsWith',
    (v, prefix) => {
      if (typeof v !== 'string') return makeError('TYPE_ERROR', 'startsWith requires a string');
      if (typeof prefix !== 'string') {
        return makeError('TYPE_ERROR', 'startsWith requires a string prefix');
      }
      return v.startsWith(prefix);
    },
  ],
  [
    'endsWith',
    (v, suffix) => {
      if (typeof v !== 'string') return makeError('TYPE_ERROR', 'endsWith requires a string');
      if (typeof suffix !== 'string') {
        return makeError('TYPE_ERROR', 'endsWith requires a string suffix');
      }
      return v.endsWith(suffix);
    },
  ],
  [
    'trimPrefix',
    (v, prefix) => {
      if (typeof v !== 'string') return makeError('TYPE_ERROR', 'trimPrefix requires a string');
      if (typeof prefix !== 'string') {
        return makeError('TYPE_ERROR', 'trimPrefix requires a string prefix');
      }
      return v.startsWith(prefix) ? v.slice(prefix.length) : v;
    },
  ],
  [
    'trimSuffix',
    (v, suffix) => {
      if (typeof v !== 'string') return makeError('TYPE_ERROR', 'trimSuffix requires a string');
      if (typeof suffix !== 'string') {
        return makeError('TYPE_ERROR', 'trimSuffix requires a string suffix');
      }
      return v.endsWith(suffix) ? v.slice(0, -suffix.length) : v;
    },
  ],
  [
    'toLowerCase',
    (v) => {
      if (typeof v !== 'string') {
        return makeError('TYPE_ERROR', 'toLowerCase requires a string');
      }
      return v.toLowerCase();
    },
  ],
  [
    'toUpperCase',
    (v) => {
      if (typeof v !== 'string') return makeError('TYPE_ERROR', 'toUpperCase requires a string');
      return v.toUpperCase();
    },
  ],
  [
    'index',
    (v, substring) => {
      if (typeof v !== 'string') return makeError('TYPE_ERROR', 'index requires a string');
      if (typeof substring !== 'string') {
        return makeError('TYPE_ERROR', 'index requires a string argument');
      }
      const idx = v.indexOf(substring);
      return idx === -1 ? null : idx;
    },
  ],
  [
    'rindex',
    (v, substring) => {
      if (typeof v !== 'string') return makeError('TYPE_ERROR', 'rindex requires a string');
      if (typeof substring !== 'string') {
        return makeError('TYPE_ERROR', 'rindex requires a string argument');
      }
      const idx = v.lastIndexOf(substring);
      return idx === -1 ? null : idx;
    },
  ],
  [
    'first',
    (v) => {
      if (!Array.isArray(v)) return makeError('TYPE_ERROR', 'first requires an array');
      return v.length > 0 ? v[0]! : null;
    },
  ],
  [
    'last',
    (v) => {
      if (!Array.isArray(v)) return makeError('TYPE_ERROR', 'last requires an array');
      return v.length > 0 ? v[v.length - 1]! : null;
    },
  ],
  [
    'limit',
    (v, n) => {
      if (!Array.isArray(v)) return makeError('TYPE_ERROR', 'limit requires an array');
      if (typeof n !== 'number') return makeError('TYPE_ERROR', 'limit requires a number');
      return v.slice(0, n);
    },
  ],
  // Math functions
  [
    'random',
    () => {
      return Math.random();
    },
  ],
  [
    'sqrt',
    (v) => {
      if (typeof v !== 'number') return makeError('TYPE_ERROR', 'sqrt requires a number');
      return Math.sqrt(v);
    },
  ],
  [
    'pow',
    (v, exp) => {
      if (typeof v !== 'number') return makeError('TYPE_ERROR', 'pow requires a number');
      if (typeof exp !== 'number') return makeError('TYPE_ERROR', 'pow exponent must be a number');
      return Math.pow(v, exp);
    },
  ],
  [
    'sin',
    (v) => {
      if (typeof v !== 'number') return makeError('TYPE_ERROR', 'sin requires a number');
      return Math.sin(v);
    },
  ],
  [
    'cos',
    (v) => {
      if (typeof v !== 'number') return makeError('TYPE_ERROR', 'cos requires a number');
      return Math.cos(v);
    },
  ],
  [
    'tan',
    (v) => {
      if (typeof v !== 'number') return makeError('TYPE_ERROR', 'tan requires a number');
      return Math.tan(v);
    },
  ],
  [
    'log',
    (v) => {
      if (typeof v !== 'number') return makeError('TYPE_ERROR', 'log requires a number');
      return Math.log(v);
    },
  ],
  [
    'log10',
    (v) => {
      if (typeof v !== 'number') return makeError('TYPE_ERROR', 'log10 requires a number');
      return Math.log10(v);
    },
  ],
  [
    'log2',
    (v) => {
      if (typeof v !== 'number') return makeError('TYPE_ERROR', 'log2 requires a number');
      return Math.log2(v);
    },
  ],
  [
    'exp',
    (v) => {
      if (typeof v !== 'number') return makeError('TYPE_ERROR', 'exp requires a number');
      return Math.exp(v);
    },
  ],
  // Date functions
  [
    'now',
    () => {
      return Date.now();
    },
  ],
  [
    'parseDate',
    (v) => {
      if (typeof v !== 'string') {
        return makeError('TYPE_ERROR', 'parseDate requires a string');
      }
      const timestamp = Date.parse(v);
      if (Number.isNaN(timestamp)) {
        return makeError('TYPE_ERROR', 'parseDate requires a valid ISO 8601 date string');
      }
      return timestamp;
    },
  ],
  [
    'toISOString',
    (v) => {
      if (typeof v !== 'number') {
        return makeError('TYPE_ERROR', 'toISOString requires a number (timestamp)');
      }
      return new Date(v).toISOString();
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
  [
    'groupBy',
    (ctx, collection, lambda) => {
      if (!Array.isArray(collection)) return makeError('TYPE_ERROR', 'groupBy requires an array');
      if (!isLambdaValue(lambda)) return makeError('TYPE_ERROR', 'groupBy requires a lambda');
      const groups = new Map<string, ExprValue[]>();
      for (const item of collection) {
        const key = invokeLambda(lambda, ctx, [item]);
        const keyStr = String(key);
        if (!groups.has(keyStr)) {
          groups.set(keyStr, []);
        }
        groups.get(keyStr)!.push(item);
      }
      const result: ExprObject = {};
      for (const [key, value] of groups.entries()) {
        result[key] = value;
      }
      return result;
    },
  ],
  [
    'uniqueBy',
    (ctx, collection, lambda) => {
      if (!Array.isArray(collection)) return makeError('TYPE_ERROR', 'uniqueBy requires an array');
      if (!isLambdaValue(lambda)) return makeError('TYPE_ERROR', 'uniqueBy requires a lambda');
      const seen = new Set<string>();
      const result: ExprValue[] = [];
      for (const item of collection) {
        const key = invokeLambda(lambda, ctx, [item]);
        const keyStr = String(key);
        if (!seen.has(keyStr)) {
          seen.add(keyStr);
          result.push(item);
        }
      }
      return result;
    },
  ],
  [
    'minBy',
    (ctx, collection, lambda) => {
      if (!Array.isArray(collection)) return makeError('TYPE_ERROR', 'minBy requires an array');
      if (!isLambdaValue(lambda)) return makeError('TYPE_ERROR', 'minBy requires a lambda');
      if (collection.length === 0) return null;
      let minItem = collection[0]!;
      let minValue = invokeLambda(lambda, ctx, [minItem]);
      for (let i = 1; i < collection.length; i++) {
        const item = collection[i]!;
        const value = invokeLambda(lambda, ctx, [item]);
        if (typeof value === 'number' && typeof minValue === 'number' && value < minValue) {
          minValue = value;
          minItem = item;
        }
      }
      return minItem;
    },
  ],
  [
    'maxBy',
    (ctx, collection, lambda) => {
      if (!Array.isArray(collection)) return makeError('TYPE_ERROR', 'maxBy requires an array');
      if (!isLambdaValue(lambda)) return makeError('TYPE_ERROR', 'maxBy requires a lambda');
      if (collection.length === 0) return null;
      let maxItem = collection[0]!;
      let maxValue = invokeLambda(lambda, ctx, [maxItem]);
      for (let i = 1; i < collection.length; i++) {
        const item = collection[i]!;
        const value = invokeLambda(lambda, ctx, [item]);
        if (typeof value === 'number' && typeof maxValue === 'number' && value > maxValue) {
          maxValue = value;
          maxItem = item;
        }
      }
      return maxItem;
    },
  ],
  [
    'mapEntries',
    (ctx, v, lambda) => {
      if (typeof v !== 'object' || v === null || Array.isArray(v)) {
        return makeError('TYPE_ERROR', 'mapEntries requires an object');
      }
      if (!isLambdaValue(lambda)) {
        return makeError('TYPE_ERROR', 'mapEntries requires a lambda');
      }
      const obj = v as ExprObject;
      const result: ExprObject = {};
      for (const [key, value] of Object.entries(obj)) {
        const entry = { key, value } as ExprObject;
        const transformed = invokeLambda(lambda, ctx, [entry]);
        if (
          typeof transformed === 'object' &&
          transformed !== null &&
          !Array.isArray(transformed)
        ) {
          const newEntry = transformed as ExprObject;
          const newKey = newEntry.key;
          const newValue = newEntry.value;
          if (typeof newKey === 'string') {
            result[newKey] = newValue ?? null;
          }
        }
      }
      return result;
    },
  ],
  [
    'select',
    (ctx, v, lambda) => {
      if (!isLambdaValue(lambda)) return makeError('TYPE_ERROR', 'select requires a lambda');
      const result = invokeLambda(lambda, ctx, [v]);
      return isTruthy(result) ? v : null;
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
        const staticIdx = instruction[1] as number;
        let obj: ExprValue;
        let idx: ExprValue;

        // If staticIdx is -1, index is dynamic (pop from stack)
        if (staticIdx === -1) {
          idx = pop();
          if (isExprError(idx)) return idx;
          obj = pop();
          if (isExprError(obj)) return obj;
        } else {
          obj = pop();
          if (isExprError(obj)) return obj;
          idx = staticIdx;
        }

        // Handle array indexing
        if (Array.isArray(obj)) {
          if (typeof idx !== 'number') {
            return makeError('TYPE_ERROR', 'Array index must be a number');
          }
          if (idx < 0 || idx >= obj.length) {
            return makeError(
              'INDEX_OUT_OF_BOUNDS',
              `Index ${idx} out of bounds (length ${obj.length})`,
            );
          }
          push(obj[idx]!);
          break;
        }

        // Handle object property access
        if (typeof obj === 'object' && obj !== null && !isExprError(obj) && !isLambdaValue(obj)) {
          if (typeof idx === 'string' || typeof idx === 'number') {
            const key = String(idx);
            const result = (obj as ExprObject)[key];
            push(result !== undefined ? result : null);
            break;
          }
          return makeError('TYPE_ERROR', 'Object key must be a string or number');
        }

        return makeError('TYPE_ERROR', 'Cannot index non-object/non-array');
      }

      case Opcode.OPTIONAL_INDEX: {
        const staticIdx = instruction[1] as number;
        let obj: ExprValue;
        let idx: ExprValue;

        // If staticIdx is -1, index is dynamic (pop from stack)
        if (staticIdx === -1) {
          idx = pop();
          if (isExprError(idx)) {
            push(null);
            break;
          }
          obj = pop();
          if (isExprError(obj)) {
            push(null);
            break;
          }
        } else {
          obj = pop();
          if (isExprError(obj)) {
            push(null);
            break;
          }
          idx = staticIdx;
        }

        // Handle array indexing - return null on out-of-bounds
        if (Array.isArray(obj)) {
          if (typeof idx !== 'number') {
            push(null);
            break;
          }
          if (idx < 0 || idx >= obj.length) {
            push(null);
            break;
          }
          push(obj[idx]!);
          break;
        }

        // Handle object property access - return null if property doesn't exist
        if (typeof obj === 'object' && obj !== null && !isExprError(obj) && !isLambdaValue(obj)) {
          if (typeof idx === 'string' || typeof idx === 'number') {
            const key = String(idx);
            const result = (obj as ExprObject)[key];
            push(result !== undefined ? result : null);
            break;
          }
          push(null);
          break;
        }

        // Not an object or array - return null
        push(null);
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
