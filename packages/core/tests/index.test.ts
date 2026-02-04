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

    test('array.length property access', () => {
      expect(run('data.items.length', ctx({}, { items: [1, 2, 3] }))).toBe(3);
      expect(run('data.items.length', ctx({}, { items: [] }))).toBe(0);
      expect(
        run('data.users.length', ctx({}, { users: [{ name: 'Alice' }, { name: 'Bob' }] })),
      ).toBe(2);
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

    test('single-parameter arrow function without parens', () => {
      expect(run('data.items |> map(x => x * 2)', ctx({}, { items: [1, 2, 3] }))).toEqual([
        2, 4, 6,
      ]);
      expect(run('data.items |> filter(x => x > 2)', ctx({}, { items: [1, 2, 3, 4] }))).toEqual([
        3, 4,
      ]);
    });

    test('single-parameter arrow with member access', () => {
      expect(
        run(
          'data.items |> map(x => x.name) |> filter(x => x.length > 3)',
          ctx({}, { items: [{ name: 'Alice' }, { name: 'Bob' }, { name: 'Charlie' }] }),
        ),
      ).toEqual(['Alice', 'Charlie']);
    });

    test('single-parameter arrow in regular function call', () => {
      expect(run('map(data.items, x => x * 2)', ctx({}, { items: [1, 2, 3] }))).toEqual([2, 4, 6]);
      expect(run('filter(data.items, x => x > 2)', ctx({}, { items: [1, 2, 3, 4] }))).toEqual([
        3, 4,
      ]);
    });
  });

  describe('array functions', () => {
    test('add sums numbers', () => {
      expect(run('data.items |> add', ctx({}, { items: [1, 2, 3] }))).toBe(6);
    });

    test('add concatenates strings', () => {
      expect(run('data.items |> add', ctx({}, { items: ['a', 'b', 'c'] }))).toBe('abc');
    });

    test('add returns null for empty array', () => {
      expect(run('data.items |> add', ctx({}, { items: [] }))).toBe(null);
    });

    test('unique removes duplicates', () => {
      expect(run('data.items |> unique', ctx({}, { items: [1, 2, 2, 3, 1] }))).toEqual([1, 2, 3]);
    });

    test('reverse reverses array', () => {
      expect(run('data.items |> reverse', ctx({}, { items: [1, 2, 3] }))).toEqual([3, 2, 1]);
    });

    test('flatten flattens nested arrays', () => {
      expect(
        run(
          'data.items |> flatten',
          ctx(
            {},
            {
              items: [
                [1, 2],
                [3, 4],
              ],
            },
          ),
        ),
      ).toEqual([1, 2, 3, 4]);
    });

    test('flatten with depth', () => {
      expect(run('data.items |> flatten(1)', ctx({}, { items: [[[1]], [[2]]] }))).toEqual([
        [1],
        [2],
      ]);
    });

    test('groupBy with dot shorthand', () => {
      expect(
        run(
          'data.items |> groupBy(.category)',
          ctx(
            {},
            {
              items: [
                { name: 'apple', category: 'fruit' },
                { name: 'carrot', category: 'vegetable' },
                { name: 'banana', category: 'fruit' },
              ],
            },
          ),
        ),
      ).toEqual({
        fruit: [
          { name: 'apple', category: 'fruit' },
          { name: 'banana', category: 'fruit' },
        ],
        vegetable: [{ name: 'carrot', category: 'vegetable' }],
      });
    });

    test('uniqueBy with dot shorthand', () => {
      expect(
        run(
          'data.items |> uniqueBy(.id)',
          ctx(
            {},
            {
              items: [
                { id: 1, name: 'a' },
                { id: 2, name: 'b' },
                { id: 1, name: 'c' },
              ],
            },
          ),
        ),
      ).toEqual([
        { id: 1, name: 'a' },
        { id: 2, name: 'b' },
      ]);
    });

    test('minBy with dot shorthand', () => {
      expect(
        run(
          'data.items |> minBy(.price)',
          ctx(
            {},
            {
              items: [
                { name: 'apple', price: 1.5 },
                { name: 'banana', price: 0.5 },
                { name: 'orange', price: 2.0 },
              ],
            },
          ),
        ),
      ).toEqual({ name: 'banana', price: 0.5 });
    });

    test('maxBy with dot shorthand', () => {
      expect(
        run(
          'data.items |> maxBy(.score)',
          ctx(
            {},
            {
              items: [
                { name: 'Alice', score: 85 },
                { name: 'Bob', score: 92 },
                { name: 'Charlie', score: 78 },
              ],
            },
          ),
        ),
      ).toEqual({ name: 'Bob', score: 92 });
    });

    test('minBy returns null for empty array', () => {
      expect(run('data.items |> minBy(.x)', ctx({}, { items: [] }))).toBe(null);
    });

    test('maxBy returns null for empty array', () => {
      expect(run('data.items |> maxBy(.x)', ctx({}, { items: [] }))).toBe(null);
    });
  });

  describe('object functions', () => {
    test('entries converts object to key-value pairs', () => {
      expect(run('data.obj |> entries', ctx({}, { obj: { a: 1, b: 2 } }))).toEqual([
        { key: 'a', value: 1 },
        { key: 'b', value: 2 },
      ]);
    });

    test('fromEntries converts key-value pairs to object', () => {
      expect(
        run(
          'data.entries |> fromEntries',
          ctx(
            {},
            {
              entries: [
                { key: 'a', value: 1 },
                { key: 'b', value: 2 },
              ],
            },
          ),
        ),
      ).toEqual({ a: 1, b: 2 });
    });

    test('mapEntries transforms object entries', () => {
      expect(
        run(
          'data.obj |> mapEntries((entry) => {key: entry.key, value: entry.value * 2})',
          ctx({}, { obj: { a: 1, b: 2 } }),
        ),
      ).toEqual({ a: 2, b: 4 });
    });

    test('del removes a key', () => {
      expect(run('data.obj |> del("a")', ctx({}, { obj: { a: 1, b: 2, c: 3 } }))).toEqual({
        b: 2,
        c: 3,
      });
    });

    test('pick selects specific fields', () => {
      expect(
        run(
          'data.obj |> pick(["name", "email"])',
          ctx({}, { obj: { name: 'Alice', email: 'alice@example.com', age: 30 } }),
        ),
      ).toEqual({ name: 'Alice', email: 'alice@example.com' });
    });

    test('has checks key existence - true', () => {
      expect(run('data.obj |> has("name")', ctx({}, { obj: { name: 'Alice', age: 30 } }))).toBe(
        true,
      );
    });

    test('has checks key existence - false', () => {
      expect(run('data.obj |> has("email")', ctx({}, { obj: { name: 'Alice', age: 30 } }))).toBe(
        false,
      );
    });
  });

  describe('string functions', () => {
    test('single quote strings work', () => {
      expect(run("'hello world'", ctx())).toBe('hello world');
    });

    test('single and double quotes are equivalent', () => {
      expect(run("'hello'", ctx())).toBe(run('"hello"', ctx()));
    });

    test('join with separator', () => {
      expect(run('data.items |> join(", ")', ctx({}, { items: ['a', 'b', 'c'] }))).toBe('a, b, c');
    });

    test('join without separator', () => {
      expect(run('data.items |> join', ctx({}, { items: ['a', 'b', 'c'] }))).toBe('abc');
    });

    test('startsWith returns true', () => {
      expect(run('"hello world" |> startsWith("hello")', ctx())).toBe(true);
    });

    test('startsWith returns false', () => {
      expect(run('"hello world" |> startsWith("world")', ctx())).toBe(false);
    });

    test('endsWith returns true', () => {
      expect(run('"hello world" |> endsWith("world")', ctx())).toBe(true);
    });

    test('endsWith returns false', () => {
      expect(run('"hello world" |> endsWith("hello")', ctx())).toBe(false);
    });

    test('trimPrefix removes prefix', () => {
      expect(run('"hello world" |> trimPrefix("hello ")', ctx())).toBe('world');
    });

    test('trimPrefix when prefix not found', () => {
      expect(run('"hello world" |> trimPrefix("foo")', ctx())).toBe('hello world');
    });

    test('trimSuffix removes suffix', () => {
      expect(run('"hello world" |> trimSuffix(" world")', ctx())).toBe('hello');
    });

    test('trimSuffix when suffix not found', () => {
      expect(run('"hello world" |> trimSuffix("foo")', ctx())).toBe('hello world');
    });

    test('toLowerCase converts to lowercase', () => {
      expect(run('"Hello WORLD" |> toLowerCase', ctx())).toBe('hello world');
    });

    test('toUpperCase converts to uppercase', () => {
      expect(run('"Hello world" |> toUpperCase', ctx())).toBe('HELLO WORLD');
    });

    test('index finds substring position', () => {
      expect(run('"hello world" |> index("world")', ctx())).toBe(6);
    });

    test('index returns null when not found', () => {
      expect(run('"hello world" |> index("foo")', ctx())).toBe(null);
    });

    test('rindex finds last substring position', () => {
      expect(run('"hello world hello" |> rindex("hello")', ctx())).toBe(12);
    });

    test('rindex returns null when not found', () => {
      expect(run('"hello world" |> rindex("foo")', ctx())).toBe(null);
    });

    test('split splits string by delimiter', () => {
      expect(run('"a,b,c" |> split(",")', ctx())).toEqual(['a', 'b', 'c']);
    });

    test('split with space delimiter', () => {
      expect(run('"hello world test" |> split(" ")', ctx())).toEqual(['hello', 'world', 'test']);
    });

    test('replace replaces first occurrence', () => {
      expect(run('"hello world hello" |> replace("hello", "hi")', ctx())).toBe('hi world hello');
    });

    test('replaceAll replaces all occurrences', () => {
      expect(run('"hello world hello" |> replaceAll("hello", "hi")', ctx())).toBe('hi world hi');
    });

    test('slice extracts substring', () => {
      expect(run('"hello world" |> slice(0, 5)', ctx())).toBe('hello');
    });

    test('slice with negative indices', () => {
      expect(run('"hello world" |> slice(-5)', ctx())).toBe('world');
    });

    test('slice works on arrays', () => {
      expect(run('data.items |> slice(1, 3)', ctx({}, { items: [1, 2, 3, 4, 5] }))).toEqual([2, 3]);
    });

    test('substring extracts substring', () => {
      expect(run('"hello world" |> substring(6, 11)', ctx())).toBe('world');
    });

    test('substring with only start', () => {
      expect(run('"hello world" |> substring(6)', ctx())).toBe('world');
    });

    test('trim removes whitespace', () => {
      expect(run('"  hello  " |> trim', ctx())).toBe('hello');
    });

    test('trimStart removes leading whitespace', () => {
      expect(run('"  hello  " |> trimStart', ctx())).toBe('hello  ');
    });

    test('trimEnd removes trailing whitespace', () => {
      expect(run('"  hello  " |> trimEnd', ctx())).toBe('  hello');
    });

    test('padStart pads string to length', () => {
      expect(run('"5" |> padStart(3, "0")', ctx())).toBe('005');
    });

    test('padStart with default fill character', () => {
      expect(run('"hi" |> padStart(5)', ctx())).toBe('   hi');
    });

    test('padEnd pads string to length', () => {
      expect(run('"5" |> padEnd(3, "0")', ctx())).toBe('500');
    });

    test('padEnd with default fill character', () => {
      expect(run('"hi" |> padEnd(5)', ctx())).toBe('hi   ');
    });

    test('repeat repeats string n times', () => {
      expect(run('"abc" |> repeat(3)', ctx())).toBe('abcabcabc');
    });

    test('repeat with zero count', () => {
      expect(run('"abc" |> repeat(0)', ctx())).toBe('');
    });
  });

  describe('utility functions', () => {
    test('first returns first element', () => {
      expect(run('data.items |> first', ctx({}, { items: [1, 2, 3] }))).toBe(1);
    });

    test('first returns null for empty array', () => {
      expect(run('data.items |> first', ctx({}, { items: [] }))).toBe(null);
    });

    test('last returns last element', () => {
      expect(run('data.items |> last', ctx({}, { items: [1, 2, 3] }))).toBe(3);
    });

    test('last returns null for empty array', () => {
      expect(run('data.items |> last', ctx({}, { items: [] }))).toBe(null);
    });

    test('limit takes first n elements', () => {
      expect(run('data.items |> limit(2)', ctx({}, { items: [1, 2, 3, 4, 5] }))).toEqual([1, 2]);
    });

    test('limit with n greater than length', () => {
      expect(run('data.items |> limit(10)', ctx({}, { items: [1, 2, 3] }))).toEqual([1, 2, 3]);
    });

    test('select filters value by condition', () => {
      expect(run('data.value |> select(.active)', ctx({}, { value: { active: true } }))).toEqual({
        active: true,
      });
    });

    test('select returns null when condition false', () => {
      expect(run('data.value |> select(.active)', ctx({}, { value: { active: false } }))).toBe(
        null,
      );
    });
  });

  describe('ternary operator', () => {
    test('returns consequent when condition is true', () => {
      expect(run('true ? 1 : 2', ctx())).toBe(1);
    });

    test('returns alternate when condition is false', () => {
      expect(run('false ? 1 : 2', ctx())).toBe(2);
    });

    test('evaluates condition from data', () => {
      expect(run('data.age >= 18 ? "adult" : "minor"', ctx({}, { age: 20 }))).toBe('adult');
      expect(run('data.age >= 18 ? "adult" : "minor"', ctx({}, { age: 15 }))).toBe('minor');
    });

    test('nested ternary operators', () => {
      expect(
        run('data.score > 90 ? "A" : data.score > 80 ? "B" : "C"', ctx({}, { score: 95 })),
      ).toBe('A');
      expect(
        run('data.score > 90 ? "A" : data.score > 80 ? "B" : "C"', ctx({}, { score: 85 })),
      ).toBe('B');
      expect(
        run('data.score > 90 ? "A" : data.score > 80 ? "B" : "C"', ctx({}, { score: 70 })),
      ).toBe('C');
    });

    test('with complex expressions', () => {
      expect(run('data.x > 0 ? data.x * 2 : data.x * -1', ctx({}, { x: 5 }))).toBe(10);
      expect(run('data.x > 0 ? data.x * 2 : data.x * -1', ctx({}, { x: -5 }))).toBe(5);
    });
  });

  describe('null coalescing operator', () => {
    test('returns left when not null', () => {
      expect(run('data.value ?? 42', ctx({}, { value: 10 }))).toBe(10);
    });

    test('returns right when left is null', () => {
      expect(run('data.value ?? 42', ctx({}, { value: null }))).toBe(42);
    });

    test('with string values', () => {
      expect(run('data.name ?? "anonymous"', ctx({}, { name: 'Alice' }))).toBe('Alice');
      expect(run('data.name ?? "anonymous"', ctx({}, { name: null }))).toBe('anonymous');
    });

    test('chained null coalescing', () => {
      expect(run('data.a ?? data.b ?? data.c', ctx({}, { a: null, b: 20, c: 30 }))).toBe(20);
      expect(run('data.a ?? data.b ?? data.c', ctx({}, { a: null, b: null, c: 30 }))).toBe(30);
      expect(run('data.a ?? data.b ?? data.c', ctx({}, { a: 10, b: null, c: null }))).toBe(10);
    });

    test('with zero and empty string (should return them, not fallback)', () => {
      expect(run('data.value ?? 42', ctx({}, { value: 0 }))).toBe(0);
      expect(run('data.value ?? "default"', ctx({}, { value: '' }))).toBe('');
      expect(run('data.value ?? true', ctx({}, { value: false }))).toBe(false);
    });
  });

  describe('optional chaining', () => {
    test('member access with non-null object', () => {
      expect(run('data.user?.name', ctx({}, { user: { name: 'Alice' } }))).toBe('Alice');
    });

    test('member access with null object returns null', () => {
      expect(run('data.user?.name', ctx({}, { user: null }))).toBe(null);
    });

    test('chained optional member access', () => {
      expect(run('data.user?.address?.city', ctx({}, { user: { address: { city: 'NYC' } } }))).toBe(
        'NYC',
      );
      expect(run('data.user?.address?.city', ctx({}, { user: { address: null } }))).toBe(null);
      expect(run('data.user?.address?.city', ctx({}, { user: null }))).toBe(null);
    });

    test('optional index access with non-null array', () => {
      expect(run('data.items?.[0]', ctx({}, { items: [1, 2, 3] }))).toBe(1);
    });

    test('optional index access with null array returns null', () => {
      expect(run('data.items?.[0]', ctx({}, { items: null }))).toBe(null);
    });

    test('mixed optional chaining with member and index access', () => {
      expect(
        run('data.users?.[0]?.name', ctx({}, { users: [{ name: 'Alice' }, { name: 'Bob' }] })),
      ).toBe('Alice');
      expect(run('data.users?.[0]?.name', ctx({}, { users: null }))).toBe(null);
      expect(run('data.users?.[0]?.name', ctx({}, { users: [] }))).toBe(null);
    });

    test('optional chaining with null coalescing', () => {
      expect(run('data.user?.name ?? "anonymous"', ctx({}, { user: { name: 'Alice' } }))).toBe(
        'Alice',
      );
      expect(run('data.user?.name ?? "anonymous"', ctx({}, { user: null }))).toBe('anonymous');
    });
  });

  describe('Math functions', () => {
    test('random returns number between 0 and 1', () => {
      const result = run('random()', ctx());
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThan(1);
    });

    test('sqrt computes square root', () => {
      expect(run('sqrt(4)', ctx())).toBe(2);
      expect(run('sqrt(9)', ctx())).toBe(3);
      expect(run('sqrt(2)', ctx())).toBeCloseTo(1.414, 3);
    });

    test('sqrt with data path', () => {
      expect(run('data.value |> sqrt', ctx({}, { value: 16 }))).toBe(4);
    });

    test('pow computes power', () => {
      expect(run('pow(2, 3)', ctx())).toBe(8);
      expect(run('pow(5, 2)', ctx())).toBe(25);
      expect(run('pow(10, 0)', ctx())).toBe(1);
    });

    test('pow with data paths', () => {
      expect(run('data.base |> pow(data.exp)', ctx({}, { base: 3, exp: 4 }))).toBe(81);
    });

    test('sin computes sine', () => {
      expect(run('sin(0)', ctx())).toBe(0);
      expect(run('sin(3.14159265359 / 2)', ctx())).toBeCloseTo(1, 5);
    });

    test('cos computes cosine', () => {
      expect(run('cos(0)', ctx())).toBe(1);
      expect(run('cos(3.14159265359)', ctx())).toBeCloseTo(-1, 5);
    });

    test('tan computes tangent', () => {
      expect(run('tan(0)', ctx())).toBe(0);
      expect(run('tan(3.14159265359 / 4)', ctx())).toBeCloseTo(1, 5);
    });

    test('log computes natural logarithm', () => {
      expect(run('log(1)', ctx())).toBe(0);
      expect(run('log(2.718281828459045)', ctx())).toBeCloseTo(1, 5);
    });

    test('log10 computes base-10 logarithm', () => {
      expect(run('log10(1)', ctx())).toBe(0);
      expect(run('log10(10)', ctx())).toBe(1);
      expect(run('log10(100)', ctx())).toBe(2);
    });

    test('log2 computes base-2 logarithm', () => {
      expect(run('log2(1)', ctx())).toBe(0);
      expect(run('log2(2)', ctx())).toBe(1);
      expect(run('log2(8)', ctx())).toBe(3);
    });

    test('exp computes exponential (e^x)', () => {
      expect(run('exp(0)', ctx())).toBe(1);
      expect(run('exp(1)', ctx())).toBeCloseTo(2.718281828459045, 5);
      expect(run('exp(2)', ctx())).toBeCloseTo(7.389, 3);
    });

    test('chaining Math functions', () => {
      expect(run('data.value |> sqrt |> round(2)', ctx({}, { value: 2 }))).toBeCloseTo(1.41, 2);
    });
  });

  describe('Date functions', () => {
    test('now returns current timestamp', () => {
      const before = Date.now();
      const result = run('now()', ctx());
      const after = Date.now();
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(before);
      expect(result).toBeLessThanOrEqual(after);
    });

    test('parseDate parses ISO 8601 date string', () => {
      const dateStr = '2024-01-15T10:30:00.000Z';
      const result = run(`parseDate("${dateStr}")`, ctx());
      expect(result).toBe(Date.parse(dateStr));
    });

    test('parseDate with data path', () => {
      const dateStr = '2024-01-15T10:30:00.000Z';
      const result = run('data.date |> parseDate', ctx({}, { date: dateStr }));
      expect(result).toBe(Date.parse(dateStr));
    });

    test('parseDate with invalid date returns error', () => {
      const result = run('parseDate("not a date")', ctx());
      expect(isExprError(result)).toBe(true);
      expect((result as ExprError).error).toBe('TYPE_ERROR');
    });

    test('toISOString converts timestamp to ISO 8601 string', () => {
      const timestamp = 1705314600000;
      const result = run(`toISOString(${timestamp})`, ctx());
      expect(result).toBe(new Date(timestamp).toISOString());
    });

    test('toISOString with data path', () => {
      const timestamp = 1705314600000;
      const result = run('data.timestamp |> toISOString', ctx({}, { timestamp }));
      expect(result).toBe(new Date(timestamp).toISOString());
    });

    test('round-trip date conversion', () => {
      const dateStr = '2024-01-15T10:30:00.000Z';
      const result = run(`"${dateStr}" |> parseDate |> toISOString`, ctx());
      expect(result).toBe(dateStr);
    });

    test('now with date conversion', () => {
      const result = run('now() |> toISOString', ctx());
      expect(typeof result).toBe('string');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });
});
