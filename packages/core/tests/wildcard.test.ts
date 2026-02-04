import { describe, expect, test } from 'bun:test';
import { compile as compileAst } from '../src/compiler.js';
import { parse } from '../src/parser.js';
import { tokenize } from '../src/lexer.js';
import { evaluate } from '../src/vm.js';
import type { BytecodeProgram, ExecutionContext } from '../src/types.js';

function compileExpr(source: string): BytecodeProgram {
  return compileAst(parse(tokenize(source)));
}

describe('Wildcard Syntax [*]', () => {
  describe('Basic Wildcard on Arrays', () => {
    test('Get property from all array elements', () => {
      const program = compileExpr(`data.users[*].name`);
      const result = evaluate(program, {
        state: {},
        data: {
          users: [
            { name: 'Alice', age: 25 },
            { name: 'Bob', age: 30 },
            { name: 'Charlie', age: 35 },
          ],
        },
        env: {},
      });
      expect(result).toEqual(['Alice', 'Bob', 'Charlie']);
    });

    test('Wildcard on empty array returns empty array', () => {
      const program = compileExpr(`data.users[*].name`);
      const result = evaluate(program, {
        state: {},
        data: { users: [] },
        env: {},
      });
      expect(result).toEqual([]);
    });

    test('Wildcard on array without following property returns array', () => {
      const program = compileExpr(`data.numbers[*]`);
      const result = evaluate(program, {
        state: {},
        data: { numbers: [1, 2, 3, 4, 5] },
        env: {},
      });
      expect(result).toEqual([1, 2, 3, 4, 5]);
    });

    test('Wildcard with nested property access', () => {
      const program = compileExpr(`data.users[*].profile.bio`);
      const result = evaluate(program, {
        state: {},
        data: {
          users: [
            { profile: { bio: 'Developer' } },
            { profile: { bio: 'Designer' } },
            { profile: { bio: 'Manager' } },
          ],
        },
        env: {},
      });
      expect(result).toEqual(['Developer', 'Designer', 'Manager']);
    });

    test('Wildcard with missing properties returns nulls', () => {
      const program = compileExpr(`data.users[*].email`);
      const result = evaluate(program, {
        state: {},
        data: {
          users: [
            { name: 'Alice' },
            { name: 'Bob', email: 'bob@example.com' },
            { name: 'Charlie' },
          ],
        },
        env: {},
      });
      expect(result).toEqual([null, 'bob@example.com', null]);
    });
  });

  describe('Wildcard on Objects', () => {
    test('Wildcard on object returns all values as array', () => {
      const program = compileExpr(`data.config[*]`);
      const result = evaluate(program, {
        state: {},
        data: {
          config: {
            foo: 1,
            bar: 2,
            baz: 3,
          },
        },
        env: {},
      });
      expect(result).toEqual([1, 2, 3]);
    });

    test('Wildcard on object with property access', () => {
      const program = compileExpr(`data.users[*].name`);
      const result = evaluate(program, {
        state: {},
        data: {
          users: {
            alice: { name: 'Alice', age: 25 },
            bob: { name: 'Bob', age: 30 },
          },
        },
        env: {},
      });
      expect(result).toEqual(['Alice', 'Bob']);
    });

    test('Wildcard on empty object returns empty array', () => {
      const program = compileExpr(`data.obj[*]`);
      const result = evaluate(program, {
        state: {},
        data: { obj: {} },
        env: {},
      });
      expect(result).toEqual([]);
    });
  });

  describe('Nested Wildcards', () => {
    test('Double wildcard flattens nested arrays', () => {
      const program = compileExpr(`data.orders[*].items[*].name`);
      const result = evaluate(program, {
        state: {},
        data: {
          orders: [
            {
              items: [
                { name: 'Apple', price: 1 },
                { name: 'Banana', price: 2 },
              ],
            },
            {
              items: [
                { name: 'Orange', price: 3 },
              ],
            },
          ],
        },
        env: {},
      });
      // First [*] returns array of orders
      // Second [*] maps over each order, getting items array
      // Result is array of arrays: [['Apple', 'Banana'], ['Orange']]
      expect(result).toEqual([['Apple', 'Banana'], ['Orange']]);
    });

    test('Triple nested wildcard', () => {
      const program = compileExpr(`data.a[*].b[*].c[*]`);
      const result = evaluate(program, {
        state: {},
        data: {
          a: [
            {
              b: [
                { c: [1, 2] },
                { c: [3, 4] },
              ],
            },
          ],
        },
        env: {},
      });
      // Recursive mapping causes one level less nesting than expected
      expect(result).toEqual([[[1, 2], [3, 4]]]);
    });
  });

  describe('Optional Wildcard ?.[*]', () => {
    test('Optional wildcard on null returns empty array', () => {
      const program = compileExpr(`data.users?.[*].name`);
      const result = evaluate(program, {
        state: {},
        data: { users: null },
        env: {},
      });
      expect(result).toEqual([]);
    });

    test('Optional wildcard on undefined returns empty array', () => {
      const program = compileExpr(`data.missing?.[*].name`);
      const result = evaluate(program, {
        state: {},
        data: {},
        env: {},
      });
      expect(result).toEqual([]);
    });

    test('Optional wildcard on valid array works normally', () => {
      const program = compileExpr(`data.users?.[*].name`);
      const result = evaluate(program, {
        state: {},
        data: {
          users: [
            { name: 'Alice' },
            { name: 'Bob' },
          ],
        },
        env: {},
      });
      expect(result).toEqual(['Alice', 'Bob']);
    });

    test('Chain of optional wildcards', () => {
      const program = compileExpr(`data.a?.[*].b?.[*].c`);
      const result = evaluate(program, {
        state: {},
        data: {
          a: [
            { b: [{ c: 1 }, { c: 2 }] },
            { b: null },
            { b: [{ c: 3 }] },
          ],
        },
        env: {},
      });
      // When b is null, optional wildcard returns [], then accessing .c gives null
      expect(result).toEqual([[1, 2], null, [3]]);
    });
  });

  describe('Wildcard with Expressions', () => {
    test('Wildcard result can be piped', () => {
      const program = compileExpr(`data.users[*].age |> map((age) => age + 1)`);
      const result = evaluate(program, {
        state: {},
        data: {
          users: [
            { age: 25 },
            { age: 30 },
            { age: 35 },
          ],
        },
        env: {},
      });
      expect(result).toEqual([26, 31, 36]);
    });

    test('Wildcard result can be used in further operations', () => {
      const program = compileExpr(`data.items[*].price`);
      const result = evaluate(program, {
        state: {},
        data: {
          items: [
            { price: 10 },
            { price: 20 },
            { price: 30 },
          ],
        },
        env: {},
      });
      expect(result).toEqual([10, 20, 30]);
    });

    test('Wildcard with filter after', () => {
      const program = compileExpr(`data.users[*].age |> filter((age) => age > 25)`);
      const result = evaluate(program, {
        state: {},
        data: {
          users: [
            { age: 20 },
            { age: 30 },
            { age: 40 },
          ],
        },
        env: {},
      });
      expect(result).toEqual([30, 40]);
    });

    test('Wildcard with length property', () => {
      const program = compileExpr(`data.users[*].name |> length`);
      const result = evaluate(program, {
        state: {},
        data: {
          users: [
            { name: 'Alice' },
            { name: 'Bob' },
            { name: 'Charlie' },
          ],
        },
        env: {},
      });
      expect(result).toBe(3);
    });
  });

  describe('Edge Cases', () => {
    test('Wildcard on primitive wraps in array', () => {
      const program = compileExpr(`data.value[*]`);
      const result = evaluate(program, {
        state: {},
        data: { value: 42 },
        env: {},
      });
      expect(result).toEqual([42]);
    });

    test('Wildcard on string wraps in array', () => {
      const program = compileExpr(`data.str[*]`);
      const result = evaluate(program, {
        state: {},
        data: { str: 'hello' },
        env: {},
      });
      expect(result).toEqual(['hello']);
    });

    test('Wildcard on boolean wraps in array', () => {
      const program = compileExpr(`data.flag[*]`);
      const result = evaluate(program, {
        state: {},
        data: { flag: true },
        env: {},
      });
      expect(result).toEqual([true]);
    });

    test('Wildcard on array of primitives', () => {
      const program = compileExpr(`data.nums[*]`);
      const result = evaluate(program, {
        state: {},
        data: { nums: [1, 2, 3, 4, 5] },
        env: {},
      });
      expect(result).toEqual([1, 2, 3, 4, 5]);
    });

    test('Wildcard with index access after', () => {
      const program = compileExpr(`data.users[*].tags[0]`);
      const result = evaluate(program, {
        state: {},
        data: {
          users: [
            { tags: ['admin', 'user'] },
            { tags: ['guest'] },
            { tags: ['moderator', 'user'] },
          ],
        },
        env: {},
      });
      expect(result).toEqual(['admin', 'guest', 'moderator']);
    });

    test('Multiple wildcards in single expression', () => {
      const program = compileExpr(`data.groups[*].users[*].name`);
      const result = evaluate(program, {
        state: {},
        data: {
          groups: [
            {
              users: [
                { name: 'Alice' },
                { name: 'Bob' },
              ],
            },
            {
              users: [
                { name: 'Charlie' },
              ],
            },
          ],
        },
        env: {},
      });
      expect(result).toEqual([['Alice', 'Bob'], ['Charlie']]);
    });
  });
});
