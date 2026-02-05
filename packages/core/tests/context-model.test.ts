import { describe, expect, test } from 'bun:test';
import { compile } from '../src/compiler.js';
import { tokenize } from '../src/lexer.js';
import { parse } from '../src/parser.js';
import { evaluate } from '../src/vm.js';

/**
 * Tests for the new unified context model where:
 * - $ maps to root input (like a lambda parameter)
 * - $context maps to auxiliary context data
 * - $env maps to environment variables
 * - All use the same virtual slot system
 */

function run(source: string, input: any, options?: { context?: any; env?: any }) {
  const program = compile(parse(tokenize(source)));
  return evaluate(program, input, options);
}

describe('New Context Model', () => {
  describe('$ - root input access', () => {
    test('$', () => {
      expect(run('$', { name: 'Alice', age: 30 })).toEqual({ name: 'Alice', age: 30 });
    });

    test('$.property', () => {
      expect(run('$.name', { name: 'Alice', age: 30 })).toBe('Alice');
    });

    test('$.nested.property', () => {
      expect(run('$.user.name', { user: { name: 'Bob', age: 25 } })).toBe('Bob');
    });

    test('$[index]', () => {
      expect(run('$[0]', [1, 2, 3])).toBe(1);
    });

    test('$.array[index]', () => {
      expect(
        run('$.users[1].name', {
          users: [{ name: 'Alice' }, { name: 'Bob' }],
        }),
      ).toBe('Bob');
    });

    test('arithmetic with $', () => {
      expect(run('$.price * 1.1', { price: 100 })).toBeCloseTo(110);
    });

    test('string operations with $', () => {
      expect(
        run('$.firstName + " " + $.lastName', {
          firstName: 'John',
          lastName: 'Doe',
        }),
      ).toBe('John Doe');
    });

    test('$ in array literal', () => {
      expect(run('[$.a, $.b, $.c]', { a: 1, b: 2, c: 3 })).toEqual([1, 2, 3]);
    });

    test('$ in object literal', () => {
      expect(
        run('{name: $.name, doubled: $.value * 2}', {
          name: 'test',
          value: 5,
        }),
      ).toEqual({ name: 'test', doubled: 10 });
    });
  });

  describe('$context - auxiliary context', () => {
    test('$context', () => {
      expect(run('$context', {}, { context: { taxRate: 0.1 } })).toEqual({ taxRate: 0.1 });
    });

    test('$context.property', () => {
      expect(run('$context.taxRate', {}, { context: { taxRate: 0.1 } })).toBe(0.1);
    });

    test('combining $ and $context', () => {
      expect(
        run(
          '$.price * (1 + $context.taxRate)',
          { price: 100 },
          {
            context: { taxRate: 0.1 },
          },
        ),
      ).toBeCloseTo(110);
    });

    test('$context with nested data', () => {
      expect(
        run(
          '$context.config.theme',
          {},
          {
            context: { config: { theme: 'dark', lang: 'en' } },
          },
        ),
      ).toBe('dark');
    });

    test('$context is null when not provided', () => {
      expect(run('$context', {})).toBe(null);
    });

    test('$context.property is null when context not provided', () => {
      expect(run('$context.taxRate', {})).toBe(null);
    });
  });

  describe('$env - environment variables', () => {
    test('$env', () => {
      expect(run('$env', {}, { env: { API_URL: 'https://api.example.com' } })).toEqual({
        API_URL: 'https://api.example.com',
      });
    });

    test('$env.property', () => {
      expect(
        run(
          '$env.API_URL',
          {},
          {
            env: { API_URL: 'https://api.example.com' },
          },
        ),
      ).toBe('https://api.example.com');
    });

    test('combining $, $context, and $env', () => {
      expect(
        run(
          '$.base + $context.offset + $env.adjustment',
          { base: 10 },
          {
            context: { offset: 5 },
            env: { adjustment: 3 },
          },
        ),
      ).toBe(18);
    });

    test('$env is null when not provided', () => {
      expect(run('$env', {})).toBe(null);
    });

    test('$env.property is null when env not provided', () => {
      expect(run('$env.API_URL', {})).toBe(null);
    });
  });

  describe('Lambdas with unified model', () => {
    // Note: Lambda parameters use descriptive names (u, v, item, etc.)
    // We can't use $ as a parameter name because it's reserved for the root virtual slot
    // $ always refers to context.root, while lambda parameters are regular context properties

    test('lambda parameter works with root $ access', () => {
      expect(
        run('$.users.map(u => u.name)', {
          users: [{ name: 'Alice' }, { name: 'Bob' }],
        }),
      ).toEqual(['Alice', 'Bob']);
    });

    test('lambda with root $ and $context access', () => {
      expect(
        run(
          '$.items.filter(i => i.price > $context.minPrice).map(i => i.name)',
          {
            items: [
              { name: 'cheap', price: 5 },
              { name: 'expensive', price: 15 },
            ],
          },
          {
            context: { minPrice: 10 },
          },
        ),
      ).toEqual(['expensive']);
    });

    test('nested lambdas with descriptive params', () => {
      expect(
        run('$.matrix.map(row => row.map(v => v * 2))', {
          matrix: [
            [1, 2],
            [3, 4],
          ],
        }),
      ).toEqual([
        [2, 4],
        [6, 8],
      ]);
    });

    test('reduce with named parameters', () => {
      expect(
        run('$.values.reduce((sum, v) => sum + v, 0)', {
          values: [1, 2, 3, 4, 5],
        }),
      ).toBe(15);
    });

    test('nested lambda accessing root $ from inner scope', () => {
      // Inner lambda can access root $ even when nested
      expect(
        run('$.items.map(item => item.values.map(v => v * $.multiplier))', {
          multiplier: 10,
          items: [
            { name: 'A', values: [1, 2] },
            { name: 'B', values: [3, 4] },
          ],
        }),
      ).toEqual([
        [10, 20],
        [30, 40],
      ]);
    });

    test('nested lambda accessing $context from inner scope', () => {
      expect(
        run(
          '$.groups.map(g => g.items.filter(i => i.price > $context.threshold))',
          {
            groups: [
              { name: 'Group1', items: [{ price: 5 }, { price: 15 }] },
              { name: 'Group2', items: [{ price: 8 }, { price: 20 }] },
            ],
          },
          {
            context: { threshold: 10 },
          },
        ),
      ).toEqual([[{ price: 15 }], [{ price: 20 }]]);
    });

    test('deeply nested lambdas with root $ access', () => {
      expect(
        run(
          '$.items.map(item => item.values.map(v => v.score * $.multiplier).filter(score => score > 150))',
          {
            multiplier: 2,
            items: [
              { values: [{ score: 80 }, { score: 90 }] },
              { values: [{ score: 85 }, { score: 95 }] },
            ],
          },
        ),
      ).toEqual([
        [160, 180],
        [170, 190],
      ]);
    });

    test('nested lambda with $env access', () => {
      expect(
        run(
          '$.users.map(u => u.scores.map(s => s + $env.BONUS))',
          {
            users: [
              { name: 'Alice', scores: [10, 20] },
              { name: 'Bob', scores: [15, 25] },
            ],
          },
          {
            env: { BONUS: 5 },
          },
        ),
      ).toEqual([
        [15, 25],
        [20, 30],
      ]);
    });

    test('nested reduce with outer lambda parameter', () => {
      expect(
        run('$.groups.map(g => g.values.reduce((sum, v) => sum + v + g.offset, 0))', {
          groups: [
            { name: 'A', offset: 100, values: [1, 2, 3] },
            { name: 'B', offset: 200, values: [4, 5] },
          ],
        }),
      ).toEqual([306, 409]); // A: 1+100 + 2+100 + 3+100 = 306, B: 4+200 + 5+200 = 409
    });

    test('jq-style dot shorthand with nested filters', () => {
      // $.users.filter(.posts.filter(.published))
      // Equivalent to: $.users.filter($it => $it.posts.filter($it => $it.published))
      // Filters users who have posts, and for each user, filters their published posts
      expect(
        run('$.users.filter(.posts.filter(.published))', {
          users: [
            {
              name: 'Alice',
              posts: [
                { title: 'Post 1', published: true },
                { title: 'Post 2', published: false },
              ],
            },
            {
              name: 'Bob',
              posts: [{ title: 'Post 3', published: false }],
            },
            {
              name: 'Charlie',
              posts: [
                { title: 'Post 4', published: true },
                { title: 'Post 5', published: true },
              ],
            },
          ],
        }),
      ).toEqual([
        // Returns all users because filter checks truthiness of the result array
        // An array (even empty) is truthy, so all users with posts arrays pass
        {
          name: 'Alice',
          posts: [
            { title: 'Post 1', published: true },
            { title: 'Post 2', published: false },
          ],
        },
        {
          name: 'Bob',
          posts: [{ title: 'Post 3', published: false }],
        },
        {
          name: 'Charlie',
          posts: [
            { title: 'Post 4', published: true },
            { title: 'Post 5', published: true },
          ],
        },
      ]);
    });

    test('jq-style to get published posts per user', () => {
      // Use map instead of filter to get published posts for each user
      expect(
        run('$.users.map(u => {name: u.name, publishedPosts: u.posts.filter(.published)})', {
          users: [
            {
              name: 'Alice',
              posts: [
                { title: 'Post 1', published: true },
                { title: 'Post 2', published: false },
              ],
            },
            {
              name: 'Bob',
              posts: [{ title: 'Post 3', published: false }],
            },
            {
              name: 'Charlie',
              posts: [
                { title: 'Post 4', published: true },
                { title: 'Post 5', published: true },
              ],
            },
          ],
        }),
      ).toEqual([
        {
          name: 'Alice',
          publishedPosts: [{ title: 'Post 1', published: true }],
        },
        {
          name: 'Bob',
          publishedPosts: [],
        },
        {
          name: 'Charlie',
          publishedPosts: [
            { title: 'Post 4', published: true },
            { title: 'Post 5', published: true },
          ],
        },
      ]);
    });
  });

  describe('Backward compatibility', () => {
    test('old API with data namespace still works', () => {
      const program = compile(parse(tokenize('data.name')));
      const result = evaluate(program, { data: { name: 'Alice' }, state: {}, env: {} });
      expect(result).toBe('Alice');
    });

    test('old API with env namespace still works', () => {
      const program = compile(parse(tokenize('env.URL')));
      const result = evaluate(program, { data: {}, state: {}, env: { URL: 'test.com' } });
      expect(result).toBe('test.com');
    });
  });

  describe('Edge cases', () => {
    test('$ with null input', () => {
      expect(run('$', null)).toBe(null);
    });

    test('$ with undefined', () => {
      expect(run('$', undefined)).toBeUndefined();
    });

    test('$.property on null returns null', () => {
      expect(run('$.name', null)).toBe(null);
    });

    test('$ with primitive input', () => {
      expect(run('$', 42)).toBe(42);
      expect(run('$', 'hello')).toBe('hello');
      expect(run('$', true)).toBe(true);
    });

    test('$ with array input', () => {
      expect(run('$', [1, 2, 3])).toEqual([1, 2, 3]);
      expect(run('$.length', [1, 2, 3])).toBe(3);
    });
  });

  describe('Real-world scenarios', () => {
    test('tax calculation with context', () => {
      const result = run(
        '$.items.map(i => {price: i.price, total: i.price * (1 + $context.taxRate)})',
        {
          items: [
            { name: 'Book', price: 10 },
            { name: 'Pen', price: 2 },
          ],
        },
        {
          context: { taxRate: 0.08 },
        },
      );
      expect(result).toEqual([
        { price: 10, total: 10.8 },
        { price: 2, total: 2.16 },
      ]);
    });

    test('API URL construction with env', () => {
      const result = run(
        '$env.API_URL + "/users/" + toString($.userId)',
        { userId: 123 },
        { env: { API_URL: 'https://api.example.com' } },
      );
      expect(result).toBe('https://api.example.com/users/123');
    });

    test('feature flags with context', () => {
      const result = run(
        '$context.features.darkMode ? "dark-theme" : "light-theme"',
        {},
        { context: { features: { darkMode: true } } },
      );
      expect(result).toBe('dark-theme');
    });

    test('complex nested access', () => {
      const result = run(
        '$.users.filter(u => u.age >= $context.minAge && u.country == $env.DEFAULT_COUNTRY).map(u => u.name)',
        {
          users: [
            { name: 'Alice', age: 30, country: 'US' },
            { name: 'Bob', age: 25, country: 'US' },
            { name: 'Charlie', age: 35, country: 'UK' },
          ],
        },
        {
          context: { minAge: 28 },
          env: { DEFAULT_COUNTRY: 'US' },
        },
      );
      expect(result).toEqual(['Alice']);
    });
  });
});
