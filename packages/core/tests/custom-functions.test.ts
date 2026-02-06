import { describe, expect, test } from 'bun:test';
import { compile } from '../src/compiler.js';
import { tokenize } from '../src/lexer.js';
import { parse } from '../src/parser.js';
import type { BuiltinFn } from '../src/vm.js';
import { evaluate } from '../src/vm.js';
import type { ExprError } from '../src/types.js';

function run(
  source: string,
  input: any = null,
  options?: { functions?: Record<string, BuiltinFn> },
) {
  const program = compile(parse(tokenize(source)));
  return evaluate(program, input, options);
}

describe('custom function registry', () => {
  test('custom function is callable', () => {
    const result = run('greet("world")', null, {
      functions: { greet: (name) => `hello ${name}` },
    });
    expect(result).toBe('hello world');
  });

  test('custom function with multiple args', () => {
    const result = run('add(2, 3)', null, {
      functions: { add: (a, b) => (a as number) + (b as number) },
    });
    expect(result).toBe(5);
  });

  test('custom function works with pipe operator', () => {
    const result = run('"test.txt" |> getExt', null, {
      functions: {
        getExt: (path) =>
          typeof path === 'string' ? path.split('.').pop()! : null,
      },
    });
    expect(result).toBe('txt');
  });

  test('custom function overrides builtin', () => {
    const result = run('now()', null, {
      functions: { now: () => 12345 },
    });
    expect(result).toBe(12345);
  });

  test('builtins still work when custom registry is empty', () => {
    const result = run('length("abc")', null, { functions: {} });
    expect(result).toBe(3);
  });

  test('builtins still work when no custom registry provided', () => {
    const result = run('length("abc")');
    expect(result).toBe(3);
  });

  test('unknown function returns error', () => {
    const result = run('unknown()') as ExprError;
    expect(result.error).toBe('INVALID_INSTRUCTION');
    expect(result.message).toContain('Unknown function: unknown');
  });

  test('custom function receives input via pipe', () => {
    const result = run('$ |> double', 21, {
      functions: { double: (n) => (n as number) * 2 },
    });
    expect(result).toBe(42);
  });

  test('custom function composes with builtins', () => {
    const result = run(
      'words("hello world") |> length',
      null,
      {
        functions: {
          words: (s) => (typeof s === 'string' ? s.split(' ') : []),
        },
      },
    );
    expect(result).toBe(2);
  });
});
