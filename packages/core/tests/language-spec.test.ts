import { describe, expect, test } from 'bun:test';
import { compile, evaluate } from '../src/index.js';
import type { EvaluateOptions, ExprValue } from '../src/index.js';

function query(source: string, input: ExprValue, options?: EvaluateOptions): ExprValue {
  return evaluate(compile(source), input, options);
}

describe('language specification examples', () => {
  test('progresses from arithmetic to explicit input roots', () => {
    expect(query('1 + 2 * 3', null)).toBe(7);
    expect(query('$.user.name', { user: { name: 'Ada' } })).toBe('Ada');
    expect(
      query(
        '$.price * (1 + $context.taxRate) * $env.currencyScale',
        { price: 100 },
        {
          context: { taxRate: 0.21 },
          env: { currencyScale: 1 },
        },
      ),
    ).toBeCloseTo(121);
  });

  test('uses null for missing values and coalesces without falsy coercion', () => {
    expect(query('$.user.profile?.displayName ?? "Anonymous"', { user: { profile: null } })).toBe(
      'Anonymous',
    );
    expect(query('$.count ?? 10', { count: 0 })).toBe(0);
    expect(query('$.label ?? "fallback"', { label: '' })).toBe('');
  });

  test('never coerces equality operands', () => {
    expect(query('1 == "1"', null)).toBe(false);
    expect(query('1 === "1"', null)).toBe(false);
    expect(query('1 == 1', null)).toBe(true);
  });

  test('uses Yexp truthiness while logical operators select operands', () => {
    expect(query('0 && true', null)).toBe(true);
    expect(query('null || 0', null)).toBe(0);
    expect(query('![]', null)).toBe(false);
  });

  test('supports negative indices and query selectors', () => {
    const input = {
      products: [
        { name: 'Mouse', price: 25, inStock: true },
        { name: 'Keyboard', price: 75, inStock: true },
        { name: 'Laptop', price: 999, inStock: false },
      ],
    };

    expect(query('$.products[-1].name', input)).toBe('Laptop');
    expect(query('$.products[.inStock && .price < 100][*].name', input)).toEqual([
      'Mouse',
      'Keyboard',
    ]);
  });

  test('keeps arrow, shorthand, selector, method, and pipe forms aligned', () => {
    const input = {
      products: [
        { name: 'Mouse', inStock: true },
        { name: 'Laptop', inStock: false },
      ],
    };

    const expected = [{ name: 'Mouse', inStock: true }];
    expect(query('$.products.filter(product => product.inStock)', input)).toEqual(expected);
    expect(query('$.products.filter(.inStock)', input)).toEqual(expected);
    expect(query('$.products[.inStock]', input)).toEqual(expected);
    expect(query('$.products |> filter(.inStock)', input)).toEqual(expected);
  });

  test('finds recursively nested properties in discovery order', () => {
    const input = {
      email: 'root@example.com',
      team: [{ email: 'ada@example.com' }, { profile: { email: 'linus@example.com' } }],
    };

    expect(query('$..email', input)).toEqual([
      'root@example.com',
      'ada@example.com',
      'linus@example.com',
    ]);
  });

  test('builds the advanced grouped report from the guide', () => {
    const input = {
      orders: [
        { customer: 'Ada', status: 'paid', amount: 25 },
        { customer: 'Ada', status: 'paid', amount: 75 },
        { customer: 'Linus', status: 'pending', amount: 10 },
        { customer: 'Linus', status: 'paid', amount: 50 },
      ],
    };
    const source = `
      $.orders[.status == "paid"]
        |> groupBy(.customer)
        |> mapEntries(entry => {
          key: entry.key,
          value: {
            orders: entry.value |> length,
            total: entry.value |> map(.amount) |> add
          }
        })
    `;

    expect(query(source, input)).toEqual({
      Ada: { orders: 2, total: 100 },
      Linus: { orders: 1, total: 50 },
    });
  });
});
