/**
 * JIT (Just-In-Time) Compilation Example for Jext
 *
 * This demonstrates how to compile Jext bytecode to native JavaScript functions
 * for dramatically faster execution.
 */

import type { Program, ExecutionContext, Opcode } from '../../src/types';

// Cache for compiled functions
const jitCache = new Map<string, Function>();

/**
 * JIT compiler - converts bytecode to native JavaScript function
 */
export function compileToJS(program: Program): Function {
  const cacheKey = JSON.stringify(program);

  if (jitCache.has(cacheKey)) {
    return jitCache.get(cacheKey)!;
  }

  // Generate JavaScript code from bytecode
  const jsCode = generateJSCode(program);

  // Compile to native function
  const compiledFn = new Function('context', 'constants', jsCode);

  jitCache.set(cacheKey, compiledFn);
  return compiledFn;
}

/**
 * Generate JavaScript code from bytecode
 */
function generateJSCode(program: Program): string {
  const lines: string[] = [];
  const { code, constants } = program;

  // Stack simulation in JS
  lines.push('const stack = [];');
  lines.push('let a, b, result;');
  lines.push('');

  for (let i = 0; i < code.length; i++) {
    const instruction = code[i];
    const [opcode, ...args] = instruction as [Opcode, ...any[]];

    lines.push(`// Instruction ${i}: ${instruction.join(' ')}`);

    switch (opcode) {
      case 'LOAD_CONST':
        lines.push(`stack.push(constants[${args[0]}]);`);
        break;

      case 'LOAD_DATA':
        lines.push(`stack.push(context.data);`);
        break;

      case 'LOAD_STATE':
        lines.push(`stack.push(context.state);`);
        break;

      case 'LOAD_ENV':
        lines.push(`stack.push(context.env);`);
        break;

      case 'GET_PROP':
        lines.push(`result = stack.pop();`);
        lines.push(`stack.push(result?.[constants[${args[0]}]]);`);
        break;

      case 'GET_INDEX':
        lines.push(`b = stack.pop();`); // index
        lines.push(`a = stack.pop();`); // array/object
        lines.push(`stack.push(a?.[b]);`);
        break;

      case 'ADD':
        lines.push(`b = stack.pop();`);
        lines.push(`a = stack.pop();`);
        lines.push(`stack.push(a + b);`);
        break;

      case 'SUB':
        lines.push(`b = stack.pop();`);
        lines.push(`a = stack.pop();`);
        lines.push(`stack.push(a - b);`);
        break;

      case 'MUL':
        lines.push(`b = stack.pop();`);
        lines.push(`a = stack.pop();`);
        lines.push(`stack.push(a * b);`);
        break;

      case 'DIV':
        lines.push(`b = stack.pop();`);
        lines.push(`a = stack.pop();`);
        lines.push(`stack.push(a / b);`);
        break;

      case 'MOD':
        lines.push(`b = stack.pop();`);
        lines.push(`a = stack.pop();`);
        lines.push(`stack.push(a % b);`);
        break;

      case 'EQ':
        lines.push(`b = stack.pop();`);
        lines.push(`a = stack.pop();`);
        lines.push(`stack.push(a == b);`);
        break;

      case 'NEQ':
        lines.push(`b = stack.pop();`);
        lines.push(`a = stack.pop();`);
        lines.push(`stack.push(a != b);`);
        break;

      case 'LT':
        lines.push(`b = stack.pop();`);
        lines.push(`a = stack.pop();`);
        lines.push(`stack.push(a < b);`);
        break;

      case 'GT':
        lines.push(`b = stack.pop();`);
        lines.push(`a = stack.pop();`);
        lines.push(`stack.push(a > b);`);
        break;

      case 'LTE':
        lines.push(`b = stack.pop();`);
        lines.push(`a = stack.pop();`);
        lines.push(`stack.push(a <= b);`);
        break;

      case 'GTE':
        lines.push(`b = stack.pop();`);
        lines.push(`a = stack.pop();`);
        lines.push(`stack.push(a >= b);`);
        break;

      case 'AND':
        lines.push(`b = stack.pop();`);
        lines.push(`a = stack.pop();`);
        lines.push(`stack.push(a && b);`);
        break;

      case 'OR':
        lines.push(`b = stack.pop();`);
        lines.push(`a = stack.pop();`);
        lines.push(`stack.push(a || b);`);
        break;

      case 'NOT':
        lines.push(`stack.push(!stack.pop());`);
        break;

      case 'CALL':
        const argCount = args[0];
        lines.push(`const callArgs = stack.splice(-${argCount});`);
        lines.push(`const fn = stack.pop();`);
        lines.push(`stack.push(fn(...callArgs));`);
        break;

      case 'RETURN':
        lines.push(`return stack.pop();`);
        break;

      default:
        lines.push(`throw new Error('Unsupported opcode: ${opcode}');`);
    }

    lines.push('');
  }

  // Default return
  lines.push('return stack.pop();');

  return lines.join('\n');
}

/**
 * JIT-powered evaluation function
 */
export function evaluateJIT(program: Program, context: ExecutionContext): any {
  const compiledFn = compileToJS(program);
  return compiledFn(context, program.constants);
}

/**
 * Advanced: Optimizing JIT compiler
 *
 * This version generates even faster code by:
 * - Eliminating stack operations when possible
 * - Inlining constants
 * - Using direct property access chains
 */
export function compileToOptimizedJS(program: Program): Function {
  const jsExpr = optimizeToExpression(program);
  return new Function('context', `return ${jsExpr}`);
}

function optimizeToExpression(program: Program): string {
  const { code, constants } = program;
  const stack: string[] = [];

  for (const instruction of code) {
    const [opcode, ...args] = instruction as [Opcode, ...any[]];

    switch (opcode) {
      case 'LOAD_CONST':
        stack.push(JSON.stringify(constants[args[0]]));
        break;

      case 'LOAD_DATA':
        stack.push('context.data');
        break;

      case 'LOAD_STATE':
        stack.push('context.state');
        break;

      case 'LOAD_ENV':
        stack.push('context.env');
        break;

      case 'GET_PROP': {
        const obj = stack.pop()!;
        const prop = constants[args[0]];
        stack.push(`${obj}?.${prop}`);
        break;
      }

      case 'GET_INDEX': {
        const index = stack.pop()!;
        const obj = stack.pop()!;
        stack.push(`${obj}?.[${index}]`);
        break;
      }

      case 'ADD': {
        const b = stack.pop()!;
        const a = stack.pop()!;
        stack.push(`(${a} + ${b})`);
        break;
      }

      case 'SUB': {
        const b = stack.pop()!;
        const a = stack.pop()!;
        stack.push(`(${a} - ${b})`);
        break;
      }

      case 'MUL': {
        const b = stack.pop()!;
        const a = stack.pop()!;
        stack.push(`(${a} * ${b})`);
        break;
      }

      case 'DIV': {
        const b = stack.pop()!;
        const a = stack.pop()!;
        stack.push(`(${a} / ${b})`);
        break;
      }

      case 'EQ': {
        const b = stack.pop()!;
        const a = stack.pop()!;
        stack.push(`(${a} == ${b})`);
        break;
      }

      case 'LT': {
        const b = stack.pop()!;
        const a = stack.pop()!;
        stack.push(`(${a} < ${b})`);
        break;
      }

      case 'GT': {
        const b = stack.pop()!;
        const a = stack.pop()!;
        stack.push(`(${a} > ${b})`);
        break;
      }

      case 'RETURN':
        return stack.pop()!;

      default:
        // Fallback for complex operations
        return 'undefined';
    }
  }

  return stack.pop() || 'undefined';
}
