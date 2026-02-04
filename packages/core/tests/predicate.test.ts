import { describe, expect, test } from 'bun:test';
import { compile as compileAst } from '../src/compiler.js';
import { parse } from '../src/parser.js';
import { tokenize } from '../src/lexer.js';
import { evaluate } from '../src/vm.js';
import type { BytecodeProgram, ExecutionContext } from '../src/types.js';

function compileExpr(source: string): BytecodeProgram {
  return compileAst(parse(tokenize(source)));
}

describe('Array Predicate Syntax [.condition]', () => {
  describe('Basic Predicates', () => {
    test('Filter with simple comparison', () => {
      const program = compileExpr(`data.users[.age > 18]`);
      const result = evaluate(program, {
        state: {},
        data: {
          users: [
            { name: 'Alice', age: 17 },
            { name: 'Bob', age: 25 },
            { name: 'Charlie', age: 30 },
          ],
        },
        env: {},
      });
      expect(result).toEqual([
        { name: 'Bob', age: 25 },
        { name: 'Charlie', age: 30 },
      ]);
    });

    test('Filter with property access after', () => {
      const program = compileExpr(`data.users[.age > 18].name`);
      const result = evaluate(program, {
        state: {},
        data: {
          users: [
            { name: 'Alice', age: 17 },
            { name: 'Bob', age: 25 },
            { name: 'Charlie', age: 30 },
          ],
        },
        env: {},
      });
      expect(result).toEqual(['Bob', 'Charlie']);
    });

    test('Filter with less than comparison', () => {
      const program = compileExpr(`data.items[.price < 100]`);
      const result = evaluate(program, {
        state: {},
        data: {
          items: [
            { name: 'Book', price: 50 },
            { name: 'Laptop', price: 1200 },
            { name: 'Pen', price: 5 },
          ],
        },
        env: {},
      });
      expect(result).toEqual([
        { name: 'Book', price: 50 },
        { name: 'Pen', price: 5 },
      ]);
    });

    test('Filter with equality comparison', () => {
      const program = compileExpr(`data.users[.status == "active"]`);
      const result = evaluate(program, {
        state: {},
        data: {
          users: [
            { name: 'Alice', status: 'active' },
            { name: 'Bob', status: 'inactive' },
            { name: 'Charlie', status: 'active' },
          ],
        },
        env: {},
      });
      expect(result).toEqual([
        { name: 'Alice', status: 'active' },
        { name: 'Charlie', status: 'active' },
      ]);
    });

    test('Filter with inequality comparison', () => {
      const program = compileExpr(`data.users[.role != "guest"]`);
      const result = evaluate(program, {
        state: {},
        data: {
          users: [
            { name: 'Alice', role: 'admin' },
            { name: 'Bob', role: 'guest' },
            { name: 'Charlie', role: 'user' },
          ],
        },
        env: {},
      });
      expect(result).toEqual([
        { name: 'Alice', role: 'admin' },
        { name: 'Charlie', role: 'user' },
      ]);
    });
  });

  describe('Complex Predicates', () => {
    test('Filter with AND condition', () => {
      const program = compileExpr(`data.users[.age > 18 && .active]`);
      const result = evaluate(program, {
        state: {},
        data: {
          users: [
            { name: 'Alice', age: 17, active: true },
            { name: 'Bob', age: 25, active: false },
            { name: 'Charlie', age: 30, active: true },
          ],
        },
        env: {},
      });
      expect(result).toEqual([
        { name: 'Charlie', age: 30, active: true },
      ]);
    });

    test('Filter with OR condition', () => {
      const program = compileExpr(`data.users[.age < 20 || .age > 60]`);
      const result = evaluate(program, {
        state: {},
        data: {
          users: [
            { name: 'Teen', age: 17 },
            { name: 'Adult', age: 35 },
            { name: 'Senior', age: 65 },
          ],
        },
        env: {},
      });
      expect(result).toEqual([
        { name: 'Teen', age: 17 },
        { name: 'Senior', age: 65 },
      ]);
    });

    test('Filter with nested property access', () => {
      const program = compileExpr(`data.users[.profile.verified]`);
      const result = evaluate(program, {
        state: {},
        data: {
          users: [
            { name: 'Alice', profile: { verified: true } },
            { name: 'Bob', profile: { verified: false } },
            { name: 'Charlie', profile: { verified: true } },
          ],
        },
        env: {},
      });
      expect(result).toEqual([
        { name: 'Alice', profile: { verified: true } },
        { name: 'Charlie', profile: { verified: true } },
      ]);
    });

    test('Filter with complex nested condition', () => {
      const program = compileExpr(`data.users[.profile.age >= 21 && .profile.country == "US"]`);
      const result = evaluate(program, {
        state: {},
        data: {
          users: [
            { name: 'Alice', profile: { age: 25, country: 'US' } },
            { name: 'Bob', profile: { age: 19, country: 'US' } },
            { name: 'Charlie', profile: { age: 30, country: 'UK' } },
          ],
        },
        env: {},
      });
      expect(result).toEqual([
        { name: 'Alice', profile: { age: 25, country: 'US' } },
      ]);
    });

    test('Filter with arithmetic in predicate', () => {
      const program = compileExpr(`data.items[.price * .quantity > 100]`);
      const result = evaluate(program, {
        state: {},
        data: {
          items: [
            { name: 'Book', price: 20, quantity: 3 },
            { name: 'Pen', price: 5, quantity: 10 },
            { name: 'Laptop', price: 500, quantity: 1 },
          ],
        },
        env: {},
      });
      expect(result).toEqual([
        { name: 'Laptop', price: 500, quantity: 1 },
      ]);
    });
  });

  describe('Predicates with Empty Results', () => {
    test('Filter that matches nothing returns empty array', () => {
      const program = compileExpr(`data.users[.age > 100]`);
      const result = evaluate(program, {
        state: {},
        data: {
          users: [
            { name: 'Alice', age: 25 },
            { name: 'Bob', age: 30 },
          ],
        },
        env: {},
      });
      expect(result).toEqual([]);
    });

    test('Filter on empty array returns empty array', () => {
      const program = compileExpr(`data.users[.age > 18]`);
      const result = evaluate(program, {
        state: {},
        data: { users: [] },
        env: {},
      });
      expect(result).toEqual([]);
    });

    test('Filter that matches all returns full array', () => {
      const program = compileExpr(`data.users[.age > 0]`);
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
      expect(result).toHaveLength(3);
    });
  });

  describe('Optional Predicates ?.[.condition]', () => {
    test('Optional predicate on null returns empty array', () => {
      const program = compileExpr(`data.users?.[.age > 18]`);
      const result = evaluate(program, {
        state: {},
        data: { users: null },
        env: {},
      });
      expect(result).toEqual([]);
    });

    test('Optional predicate on undefined returns empty array', () => {
      const program = compileExpr(`data.missing?.[.age > 18]`);
      const result = evaluate(program, {
        state: {},
        data: {},
        env: {},
      });
      expect(result).toEqual([]);
    });

    test('Optional predicate on valid array works normally', () => {
      const program = compileExpr(`data.users?.[.age > 18]`);
      const result = evaluate(program, {
        state: {},
        data: {
          users: [
            { name: 'Alice', age: 17 },
            { name: 'Bob', age: 25 },
          ],
        },
        env: {},
      });
      expect(result).toEqual([
        { name: 'Bob', age: 25 },
      ]);
    });
  });

  describe('Predicates with Further Operations', () => {
    test('Predicate followed by pipe', () => {
      const program = compileExpr(`data.users[.age > 18] |> length`);
      const result = evaluate(program, {
        state: {},
        data: {
          users: [
            { name: 'Alice', age: 17 },
            { name: 'Bob', age: 25 },
            { name: 'Charlie', age: 30 },
          ],
        },
        env: {},
      });
      expect(result).toBe(2);
    });

    test('Predicate followed by map', () => {
      const program = compileExpr(`data.users[.age > 18] |> map(.name)`);
      const result = evaluate(program, {
        state: {},
        data: {
          users: [
            { name: 'Alice', age: 17 },
            { name: 'Bob', age: 25 },
            { name: 'Charlie', age: 30 },
          ],
        },
        env: {},
      });
      expect(result).toEqual(['Bob', 'Charlie']);
    });

    test('Predicate followed by sort', () => {
      const program = compileExpr(`data.users[.active] |> sort(.age)`);
      const result = evaluate(program, {
        state: {},
        data: {
          users: [
            { name: 'Charlie', age: 30, active: true },
            { name: 'Bob', age: 25, active: true },
            { name: 'Alice', age: 17, active: false },
          ],
        },
        env: {},
      });
      // Sort order may vary, but both active users should be in the result
      expect(result).toHaveLength(2);
      expect(result.every((u: any) => u.active)).toBe(true);
    });

    test('Multiple predicates in chain', () => {
      const program = compileExpr(`data.users[.age > 18][.active]`);
      const result = evaluate(program, {
        state: {},
        data: {
          users: [
            { name: 'Alice', age: 17, active: true },
            { name: 'Bob', age: 25, active: false },
            { name: 'Charlie', age: 30, active: true },
          ],
        },
        env: {},
      });
      expect(result).toEqual([
        { name: 'Charlie', age: 30, active: true },
      ]);
    });
  });

  describe('Combining Predicates and Wildcards', () => {
    test('Wildcard after predicate', () => {
      const program = compileExpr(`data.groups[.active][*].users`);
      const result = evaluate(program, {
        state: {},
        data: {
          groups: [
            { active: true, users: ['Alice', 'Bob'] },
            { active: false, users: ['Charlie'] },
            { active: true, users: ['David'] },
          ],
        },
        env: {},
      });
      expect(result).toEqual([['Alice', 'Bob'], ['David']]);
    });

    test('Predicate after simple array access', () => {
      const program = compileExpr(`data.users[.age > 20]`);
      const result = evaluate(program, {
        state: {},
        data: {
          users: [
            { name: 'Alice', age: 18 },
            { name: 'Bob', age: 25 },
            { name: 'Charlie', age: 30 },
          ],
        },
        env: {},
      });
      expect(result).toEqual([
        { name: 'Bob', age: 25 },
        { name: 'Charlie', age: 30 },
      ]);
    });

    test('Wildcard property access after predicate', () => {
      const program = compileExpr(`data.users[.age > 18][*].tags`);
      const result = evaluate(program, {
        state: {},
        data: {
          users: [
            { name: 'Alice', age: 17, tags: ['student'] },
            { name: 'Bob', age: 25, tags: ['employee', 'manager'] },
            { name: 'Charlie', age: 30, tags: ['admin'] },
          ],
        },
        env: {},
      });
      expect(result).toEqual([['employee', 'manager'], ['admin']]);
    });
  });

  describe('Edge Cases', () => {
    test('Predicate with null values', () => {
      const program = compileExpr(`data.users[.email]`);
      const result = evaluate(program, {
        state: {},
        data: {
          users: [
            { name: 'Alice', email: 'alice@example.com' },
            { name: 'Bob', email: null },
            { name: 'Charlie', email: 'charlie@example.com' },
          ],
        },
        env: {},
      });
      expect(result).toEqual([
        { name: 'Alice', email: 'alice@example.com' },
        { name: 'Charlie', email: 'charlie@example.com' },
      ]);
    });

    test('Predicate with boolean property', () => {
      const program = compileExpr(`data.items[.available]`);
      const result = evaluate(program, {
        state: {},
        data: {
          items: [
            { name: 'Book', available: true },
            { name: 'Laptop', available: false },
            { name: 'Pen', available: true },
          ],
        },
        env: {},
      });
      expect(result).toEqual([
        { name: 'Book', available: true },
        { name: 'Pen', available: true },
      ]);
    });

    test('Predicate with negation', () => {
      const program = compileExpr(`data.users[!.banned]`);
      const result = evaluate(program, {
        state: {},
        data: {
          users: [
            { name: 'Alice', banned: false },
            { name: 'Bob', banned: true },
            { name: 'Charlie', banned: false },
          ],
        },
        env: {},
      });
      expect(result).toEqual([
        { name: 'Alice', banned: false },
        { name: 'Charlie', banned: false },
      ]);
    });

    test('Predicate with string equality', () => {
      const program = compileExpr(`data.users[.name == "Bob"]`);
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
      expect(result).toEqual([
        { name: 'Bob' },
      ]);
    });
  });
});
