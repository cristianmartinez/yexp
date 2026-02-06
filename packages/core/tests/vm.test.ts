import { describe, expect, test } from 'bun:test';
import { compile } from '../src/compiler.js';
import { tokenize } from '../src/lexer.js';
import { parse } from '../src/parser.js';
import type { ExecutionContext, ExprError } from '../src/types.js';
import { evaluate } from '../src/vm.js';

function run(source: string, ctx?: Partial<ExecutionContext>) {
  const context: ExecutionContext = {
    state: {},
    data: {},
    env: {},
    ...ctx,
  };
  const program = compile(parse(tokenize(source)));
  return evaluate(program, context);
}

describe('vm', () => {
  describe('literals', () => {
    test('number', () => expect(run('42')).toBe(42));
    test('float', () => expect(run('3.14')).toBe(3.14));
    test('string', () => expect(run('"hello"')).toBe('hello'));
    test('true', () => expect(run('true')).toBe(true));
    test('false', () => expect(run('false')).toBe(false));
    test('null', () => expect(run('null')).toBe(null));
  });

  describe('arithmetic', () => {
    test('addition', () => expect(run('1 + 2')).toBe(3));
    test('subtraction', () => expect(run('5 - 3')).toBe(2));
    test('multiplication', () => expect(run('3 * 4')).toBe(12));
    test('division', () => expect(run('10 / 2')).toBe(5));
    test('modulo', () => expect(run('7 % 3')).toBe(1));
    test('negation', () => expect(run('-5')).toBe(-5));
    test('precedence', () => expect(run('2 + 3 * 4')).toBe(14));
    test('grouping', () => expect(run('(2 + 3) * 4')).toBe(20));
    test('string concatenation', () => expect(run('"hello" + " " + "world"')).toBe('hello world'));
  });

  describe('comparison', () => {
    test('equal', () => expect(run('1 == 1')).toBe(true));
    test('not equal', () => expect(run('1 != 2')).toBe(true));
    test('less than', () => expect(run('1 < 2')).toBe(true));
    test('greater than', () => expect(run('2 > 1')).toBe(true));
    test('less equal', () => expect(run('1 <= 1')).toBe(true));
    test('greater equal', () => expect(run('2 >= 2')).toBe(true));
    test('null equality', () => expect(run('null == null')).toBe(true));
  });

  describe('logical', () => {
    test('and true', () => expect(run('true && true')).toBe(true));
    test('and false', () => expect(run('true && false')).toBe(false));
    test('or true', () => expect(run('false || true')).toBe(true));
    test('or false', () => expect(run('false || false')).toBe(false));
    test('not', () => expect(run('!true')).toBe(false));
    test('short-circuit and', () => expect(run('false && (1 / 0)')).toBe(false));
    test('short-circuit or', () => expect(run('true || (1 / 0)')).toBe(true));
  });

  describe('paths', () => {
    test('simple path', () => {
      expect(run('state.count', { state: { count: 5 } })).toBe(5);
    });

    test('deep path', () => {
      expect(run('state.user.name', { state: { user: { name: 'Alice' } } })).toBe('Alice');
    });

    test('missing path returns null', () => {
      expect(run('state.missing', { state: {} })).toBe(null);
    });

    test('data path', () => {
      expect(run('data.items', { data: { items: [1, 2, 3] } })).toEqual([1, 2, 3]);
    });
  });

  describe('pipe', () => {
    test('toString', () => {
      expect(run('state.value |> toString', { state: { value: 42 } })).toBe('42');
    });

    test('chained pipes', () => {
      expect(run('state.value |> toString |> length', { state: { value: 42 } })).toBe(2);
    });

    test('pipe with args', () => {
      expect(run('state.value |> round(2)', { state: { value: Math.PI } })).toBe(3.14);
    });
  });

  describe('array literals', () => {
    test('empty array', () => expect(run('[]')).toEqual([]));
    test('simple array', () => expect(run('[1, 2, 3]')).toEqual([1, 2, 3]));
    test('array with expressions', () => {
      expect(run('[state.a, state.b]', { state: { a: 1, b: 2 } })).toEqual([1, 2]);
    });
  });

  describe('object literals', () => {
    test('empty object', () => expect(run('{}')).toEqual({}));
    test('simple object', () => {
      expect(run('{ name: "Alice", age: 30 }')).toEqual({ name: 'Alice', age: 30 });
    });
  });

  describe('template literals', () => {
    test('no interpolation', () => expect(run('`hello`')).toBe('hello'));
    test('with interpolation', () => {
      expect(run('`Hello, ${state.name}!`', { state: { name: 'Alice' } })).toBe('Hello, Alice!');
    });
    test('number interpolation', () => {
      expect(run('`Count: ${state.n}`', { state: { n: 42 } })).toBe('Count: 42');
    });
  });

  describe('mutations', () => {
    test('assignment', () => {
      const ctx: ExecutionContext = { state: { count: 0 }, data: {}, env: {} };
      run('state.count = 5', ctx);
      expect(ctx.state.count).toBe(5);
    });

    test('increment', () => {
      const ctx: ExecutionContext = { state: { count: 10 }, data: {}, env: {} };
      run('state.count++', ctx);
      expect(ctx.state.count).toBe(11);
    });

    test('decrement', () => {
      const ctx: ExecutionContext = { state: { count: 10 }, data: {}, env: {} };
      run('state.count--', ctx);
      expect(ctx.state.count).toBe(9);
    });

    test('append', () => {
      const ctx: ExecutionContext = { state: { items: [1, 2] }, data: {}, env: {} };
      run('state.items << 3', ctx);
      expect(ctx.state.items).toEqual([1, 2, 3]);
    });
  });

  describe('errors', () => {
    test('division by zero', () => {
      const result = run('1 / 0') as ExprError;
      expect(result.error).toBe('DIVISION_BY_ZERO');
    });

    test('type error on arithmetic', () => {
      const result = run('"a" - 1') as ExprError;
      expect(result.error).toBe('TYPE_ERROR');
    });

    test('type error on comparison', () => {
      const result = run('"a" < 1') as ExprError;
      expect(result.error).toBe('TYPE_ERROR');
    });

    test('unknown function', () => {
      const result = run('state.x |> unknownFn', { state: { x: 1 } }) as ExprError;
      expect(result.error).toBe('INVALID_INSTRUCTION');
    });
  });

  describe('built-in functions', () => {
    test('floor', () => expect(run('state.v |> floor', { state: { v: 3.7 } })).toBe(3));
    test('ceil', () => expect(run('state.v |> ceil', { state: { v: 3.2 } })).toBe(4));
    test('abs', () => expect(run('state.v |> abs', { state: { v: -5 } })).toBe(5));

    describe('type()', () => {
      test('number', () => expect(run('42 |> type')).toBe('number'));
      test('string', () => expect(run('"hello" |> type')).toBe('string'));
      test('boolean true', () => expect(run('true |> type')).toBe('boolean'));
      test('boolean false', () => expect(run('false |> type')).toBe('boolean'));
      test('null', () => expect(run('null |> type')).toBe('null'));
      test('array', () => expect(run('[1, 2, 3] |> type')).toBe('array'));
      test('object', () => expect(run('{ name: "Alice" } |> type')).toBe('object'));

      test('with comparison', () => {
        expect(run('state.v |> type == "number"', { state: { v: 42 } })).toBe(true);
      });

      test('filter by type', () => {
        const result = run('[1, "hello", 2, "world", 3] |> filter((x) => type(x) == "number")');
        expect(result).toEqual([1, 2, 3]);
      });
    });
  });
});
