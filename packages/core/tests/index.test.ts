import { describe, expect, test } from 'bun:test';
import {
  type ExecutionContext,
  type ExprError,
  type ExprValue,
  compile,
  compileExpr,
  evaluate,
  isExprError,
  parse,
  run,
  tokenize,
} from '../src/index.js';

describe('public API', () => {
  test('compileExpr produces a bytecode program', () => {
    const program = compileExpr('1 + 2');
    expect(program.version).toBe(1);
    expect(program.constants).toContain(1);
    expect(program.constants).toContain(2);
    expect(program.code.length).toBeGreaterThan(0);
  });

  test('run evaluates an expression', () => {
    const ctx: ExecutionContext = { state: {}, data: {}, env: {} };
    expect(run('1 + 2', ctx)).toBe(3);
  });

  test('individual pipeline exports work together', () => {
    const tokens = tokenize('3 * 4');
    const ast = parse(tokens);
    const program = compile(ast);
    const result = evaluate(program, { state: {}, data: {}, env: {} });
    expect(result).toBe(12);
  });

  test('isExprError identifies errors', () => {
    const ctx: ExecutionContext = { state: {}, data: {}, env: {} };
    const result = run('1 / 0', ctx);
    expect(isExprError(result)).toBe(true);
    expect((result as ExprError).error).toBe('DIVISION_BY_ZERO');
  });
});

describe('integration', () => {
  const ctx = (
    state: Record<string, ExprValue> = {},
    data: Record<string, ExprValue> = {},
  ): ExecutionContext => ({
    state,
    data,
    env: {},
  });

  describe('value expressions', () => {
    test('arithmetic with paths', () => {
      expect(run('state.price * state.quantity', ctx({ price: 9.99, quantity: 3 }))).toBeCloseTo(
        29.97,
      );
    });

    test('string interpolation with paths', () => {
      expect(
        run(
          '`Hello, ${state.name}! You have ${state.count} items.`',
          ctx({ name: 'Bob', count: 5 }),
        ),
      ).toBe('Hello, Bob! You have 5 items.');
    });

    test('nested path access', () => {
      expect(run('state.user.address.city', ctx({ user: { address: { city: 'NYC' } } }))).toBe(
        'NYC',
      );
    });

    test('comparison chain', () => {
      expect(run('state.age >= 18 && state.age < 65', ctx({ age: 30 }))).toBe(true);
    });

    test('null coalescing pattern', () => {
      expect(run('state.value == null', ctx({}))).toBe(true);
      expect(run('state.value == null', ctx({ value: 42 }))).toBe(false);
    });

    test('array literal with expressions', () => {
      expect(run('[state.a, state.b, state.a + state.b]', ctx({ a: 1, b: 2 }))).toEqual([1, 2, 3]);
    });

    test('object literal with expressions', () => {
      expect(
        run(
          '{ total: state.price * state.qty, label: `${state.qty}x` }',
          ctx({ price: 10, qty: 3 }),
        ),
      ).toEqual({ total: 30, label: '3x' });
    });

    test('pipe chain', () => {
      expect(run('state.value |> abs |> toString', ctx({ value: -42 }))).toBe('42');
    });

    test('pipe with arguments', () => {
      expect(run('state.value |> round(2)', ctx({ value: Math.PI }))).toBe(3.14);
    });

    test('spread in array', () => {
      expect(run('[...state.items, 4]', ctx({ items: [1, 2, 3] }))).toEqual([1, 2, 3, 4]);
    });

    test('spread in object', () => {
      expect(
        run('{ ...state.base, color: "red" }', ctx({ base: { size: 10, shape: 'circle' } })),
      ).toEqual({ size: 10, shape: 'circle', color: 'red' });
    });

    test('data path is read-only accessible', () => {
      expect(run('data.items |> length', ctx({}, { items: [1, 2, 3] }))).toBe(3);
    });
  });

  describe('action expressions', () => {
    test('set state value', () => {
      const c = ctx({ count: 0 });
      run('state.count = 10', c);
      expect(c.state.count).toBe(10);
    });

    test('increment state value', () => {
      const c = ctx({ count: 5 });
      run('state.count++', c);
      expect(c.state.count).toBe(6);
    });

    test('decrement state value', () => {
      const c = ctx({ count: 5 });
      run('state.count--', c);
      expect(c.state.count).toBe(4);
    });

    test('append to array', () => {
      const c = ctx({ items: ['a', 'b'] });
      run('state.items << "c"', c);
      expect(c.state.items).toEqual(['a', 'b', 'c']);
    });

    test('set nested path', () => {
      const c = ctx({ user: { name: 'old' } });
      run('state.user.name = "new"', c);
      expect(c.state.user).toEqual({ name: 'new' });
    });

    test('assign expression result', () => {
      const c = ctx({ a: 3, b: 4, result: 0 });
      run('state.result = state.a + state.b', c);
      expect(c.state.result).toBe(7);
    });
  });

  describe('error handling', () => {
    test('division by zero returns error', () => {
      const result = run('state.a / state.b', ctx({ a: 10, b: 0 }));
      expect(isExprError(result)).toBe(true);
      expect((result as ExprError).error).toBe('DIVISION_BY_ZERO');
    });

    test('type error on invalid arithmetic', () => {
      const result = run('state.name - 1', ctx({ name: 'Alice' }));
      expect(isExprError(result)).toBe(true);
      expect((result as ExprError).error).toBe('TYPE_ERROR');
    });

    test('missing path returns null', () => {
      expect(run('state.nonexistent', ctx({}))).toBe(null);
    });

    test('deep missing path returns null', () => {
      expect(run('state.a.b.c', ctx({}))).toBe(null);
    });
  });

  describe('lambdas and higher-order functions', () => {
    test('filter with arrow lambda', () => {
      expect(
        run('data.items |> filter((x) => x > 3)', ctx({}, { items: [1, 2, 3, 4, 5] })),
      ).toEqual([4, 5]);
    });

    test('filter with dot shorthand', () => {
      expect(
        run(
          'data.items |> filter(.price > 100)',
          ctx({}, { items: [{ price: 50 }, { price: 150 }] }),
        ),
      ).toEqual([{ price: 150 }]);
    });

    test('map with arrow lambda', () => {
      expect(run('data.items |> map((x) => x * 2)', ctx({}, { items: [1, 2, 3] }))).toEqual([
        2, 4, 6,
      ]);
    });

    test('map with dot shorthand', () => {
      expect(
        run('data.items |> map(.name)', ctx({}, { items: [{ name: 'Alice' }, { name: 'Bob' }] })),
      ).toEqual(['Alice', 'Bob']);
    });

    test('find with lambda', () => {
      expect(
        run(
          'data.items |> find(.name == "Bob")',
          ctx({}, { items: [{ name: 'Alice' }, { name: 'Bob' }] }),
        ),
      ).toEqual({ name: 'Bob' });
    });

    test('reduce with lambda', () => {
      expect(
        run('data.items |> reduce((acc, x) => acc + x, 0)', ctx({}, { items: [1, 2, 3] })),
      ).toBe(6);
    });

    test('every with lambda', () => {
      expect(run('data.items |> every((x) => x > 0)', ctx({}, { items: [1, 2, 3] }))).toBe(true);
      expect(run('data.items |> every((x) => x > 2)', ctx({}, { items: [1, 2, 3] }))).toBe(false);
    });

    test('some with lambda', () => {
      expect(run('data.items |> some((x) => x > 2)', ctx({}, { items: [1, 2, 3] }))).toBe(true);
      expect(run('data.items |> some((x) => x > 5)', ctx({}, { items: [1, 2, 3] }))).toBe(false);
    });

    test('sort with lambda', () => {
      expect(run('data.items |> sort((a, b) => a - b)', ctx({}, { items: [3, 1, 2] }))).toEqual([
        1, 2, 3,
      ]);
    });

    test('sort without lambda', () => {
      expect(run('data.items |> sort', ctx({}, { items: [3, 1, 2] }))).toEqual([1, 2, 3]);
    });

    test('flatMap with lambda', () => {
      expect(run('data.items |> flatMap((x) => [x, x * 2])', ctx({}, { items: [1, 2] }))).toEqual([
        1, 2, 2, 4,
      ]);
    });

    test('chaining HOFs', () => {
      expect(
        run(
          'data.items |> filter(.active) |> map(.name)',
          ctx(
            {},
            {
              items: [
                { name: 'Alice', active: true },
                { name: 'Bob', active: false },
              ],
            },
          ),
        ),
      ).toEqual(['Alice']);
    });

    test('lambda with context access', () => {
      expect(
        run(
          'data.items |> filter((x) => x > state.threshold)',
          ctx({ threshold: 2 }, { items: [1, 2, 3, 4] }),
        ),
      ).toEqual([3, 4]);
    });
  });
});
