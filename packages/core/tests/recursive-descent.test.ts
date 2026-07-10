import { describe, expect, test } from 'bun:test';
import { compileAst } from '../src/compiler.js';
import { tokenize } from '../src/lexer.js';
import { parse } from '../src/parser.js';
import type { BytecodeProgram } from '../src/types.js';
import { evaluate } from '../src/vm.js';

function compileSource(source: string): BytecodeProgram {
  return compileAst(parse(tokenize(source)));
}

describe('Recursive Descent Operator (..)', () => {
  describe('Basic recursive descent', () => {
    test('Find property at multiple depths', () => {
      const program = compileSource('data..name');
      const result = evaluate(program, {
        state: {},
        data: {
          users: [
            { name: 'Alice', profile: { name: 'Alice Admin' } },
            { name: 'Bob', posts: [{ name: 'Post 1' }] },
          ],
          config: { settings: { name: 'App Settings' } },
        },
        env: {},
      });
      // Should find all "name" properties at any depth
      expect(result).toEqual(['Alice', 'Alice Admin', 'Bob', 'Post 1', 'App Settings']);
    });

    test('Find property in nested objects', () => {
      const program = compileSource('data..email');
      const result = evaluate(program, {
        state: {},
        data: {
          user: {
            email: 'alice@example.com',
            profile: {
              email: 'alice.profile@example.com',
            },
          },
        },
        env: {},
      });
      expect(result).toEqual(['alice@example.com', 'alice.profile@example.com']);
    });

    test('Find property in array elements', () => {
      const program = compileSource('data..price');
      const result = evaluate(program, {
        state: {},
        data: {
          items: [
            { price: 10, name: 'Item 1' },
            { price: 20, name: 'Item 2' },
          ],
        },
        env: {},
      });
      expect(result).toEqual([10, 20]);
    });

    test('Empty result when property not found', () => {
      const program = compileSource('data..nonexistent');
      const result = evaluate(program, {
        state: {},
        data: {
          users: [{ name: 'Alice' }, { name: 'Bob' }],
        },
        env: {},
      });
      expect(result).toEqual([]);
    });

    test('Property exists at root level', () => {
      const program = compileSource('data..name');
      const result = evaluate(program, {
        state: {},
        data: {
          name: 'Root',
          child: { name: 'Child' },
        },
        env: {},
      });
      expect(result).toEqual(['Root', 'Child']);
    });
  });

  describe('Complex nesting', () => {
    test('Mixed arrays and objects', () => {
      const program = compileSource('data..id');
      const result = evaluate(program, {
        state: {},
        data: {
          id: 1,
          users: [
            { id: 2, posts: [{ id: 3 }, { id: 4 }] },
            { id: 5, comments: { latest: { id: 6 } } },
          ],
        },
        env: {},
      });
      expect(result).toEqual([1, 2, 3, 4, 5, 6]);
    });

    test('Multiple occurrences at different depths', () => {
      const program = compileSource('data..value');
      const result = evaluate(program, {
        state: {},
        data: {
          value: 'level1',
          a: {
            value: 'level2a',
            b: {
              value: 'level3',
            },
          },
          c: {
            value: 'level2c',
          },
        },
        env: {},
      });
      expect(result).toEqual(['level1', 'level2a', 'level3', 'level2c']);
    });

    test('Deep nesting (near limit)', () => {
      // Create deeply nested structure
      let deepObj: any = { value: 'deep' };
      for (let i = 0; i < 90; i++) {
        deepObj = { nested: deepObj };
      }
      deepObj = { value: 'surface', deep: deepObj };

      const program = compileSource('data..value');
      const result = evaluate(program, {
        state: {},
        data: deepObj,
        env: {},
      });
      // Should find both values (one at surface, one deep)
      expect(result).toEqual(['surface', 'deep']);
    });

    test('Very deep nesting exceeds limit', () => {
      // Create structure exceeding depth limit (>100)
      let deepObj: any = { value: 'too deep' };
      for (let i = 0; i < 110; i++) {
        deepObj = { nested: deepObj };
      }
      deepObj = { value: 'surface', deep: deepObj };

      const program = compileSource('data..value');
      const result = evaluate(program, {
        state: {},
        data: deepObj,
        env: {},
      });
      // Should only find surface value, not the one beyond depth limit
      expect(result).toEqual(['surface']);
    });
  });

  describe('Integration with chaining', () => {
    test('Recursive descent + wildcard', () => {
      const program = compileSource('data..users[*].email');
      const result = evaluate(program, {
        state: {},
        data: {
          group1: {
            users: [{ email: 'alice@example.com' }, { email: 'bob@example.com' }],
          },
          group2: {
            users: [{ email: 'charlie@example.com' }],
          },
        },
        env: {},
      });
      expect(result).toEqual([['alice@example.com', 'bob@example.com'], ['charlie@example.com']]);
    });

    test('Recursive descent + predicate', () => {
      const program = compileSource('data..items[.price > 15]');
      const result = evaluate(program, {
        state: {},
        data: {
          store1: {
            items: [
              { name: 'Item A', price: 10 },
              { name: 'Item B', price: 20 },
            ],
          },
          store2: {
            items: [{ name: 'Item C', price: 25 }],
          },
        },
        env: {},
      });
      // Recursive descent finds two "items" arrays, returned as array of arrays
      // Predicate doesn't filter because arrays don't have .price property
      expect(result).toEqual([
        [
          { name: 'Item A', price: 10 },
          { name: 'Item B', price: 20 },
        ],
        [{ name: 'Item C', price: 25 }],
      ]);
    });

    test('Recursive descent + property access', () => {
      const program = compileSource('data..user.name');
      const result = evaluate(program, {
        state: {},
        data: {
          post1: { user: { name: 'Alice' } },
          post2: { user: { name: 'Bob' } },
        },
        env: {},
      });
      expect(result).toEqual(['Alice', 'Bob']);
    });

    test('Multiple recursive descents', () => {
      const program = compileSource('data..groups..name');
      const result = evaluate(program, {
        state: {},
        data: {
          dept1: {
            groups: [{ name: 'Group A', members: [{ name: 'Alice' }] }, { name: 'Group B' }],
          },
          dept2: {
            groups: [{ name: 'Group C', members: [{ name: 'Bob' }] }],
          },
        },
        env: {},
      });
      // First .. finds all "groups" arrays, second .. finds all "name" within entire result
      expect(result).toEqual(['Group A', 'Alice', 'Group B', 'Group C', 'Bob']);
    });

    test('Recursive descent within specific path', () => {
      const program = compileSource('data.config..setting');
      const result = evaluate(program, {
        state: {},
        data: {
          config: {
            theme: { setting: 'dark' },
            layout: { setting: 'compact', nested: { setting: 'advanced' } },
          },
          other: {
            setting: 'ignored',
          },
        },
        env: {},
      });
      // Should only search within data.config, not data.other
      expect(result).toEqual(['dark', 'compact', 'advanced']);
    });
  });

  describe('Optional variant (?..))', () => {
    test('Returns empty array on null', () => {
      const program = compileSource('data?..name');
      const result = evaluate(program, {
        state: {},
        data: null as any,
        env: {},
      });
      expect(result).toEqual([]);
    });

    test('Returns empty array on undefined path', () => {
      const program = compileSource('data.missing?..name');
      const result = evaluate(program, {
        state: {},
        data: {},
        env: {},
      });
      expect(result).toEqual([]);
    });

    test('Works normally on valid object', () => {
      const program = compileSource('data?..name');
      const result = evaluate(program, {
        state: {},
        data: {
          user: { name: 'Alice' },
        },
        env: {},
      });
      expect(result).toEqual(['Alice']);
    });

    test('Optional chaining before recursive descent', () => {
      const program = compileSource('data.config?..setting');
      const result = evaluate(program, {
        state: {},
        data: {},
        env: {},
      });
      expect(result).toEqual([]);
    });
  });

  describe('Security', () => {
    test('Prevents prototype pollution via __proto__', () => {
      const program = compileSource('data..dangerous');
      const result = evaluate(program, {
        state: {},
        data: {
          __proto__: { dangerous: 'polluted' },
          safe: { dangerous: 'safe value' },
        },
        env: {},
      });
      // Should not traverse __proto__
      expect(result).toEqual(['safe value']);
    });

    test('Prevents access to constructor', () => {
      const program = compileSource('data..prop');
      const result = evaluate(program, {
        state: {},
        data: {
          constructor: { prop: 'dangerous' },
          normal: { prop: 'safe' },
        },
        env: {},
      });
      // Should not traverse constructor
      expect(result).toEqual(['safe']);
    });

    test('Handles circular references', () => {
      const obj: any = { name: 'Root' };
      const child: any = { name: 'Child', parent: obj };
      obj.child = child;

      const program = compileSource('data..name');
      const result = evaluate(program, {
        state: {},
        data: obj,
        env: {},
      });
      // Should find both names without infinite loop
      expect(result).toEqual(['Root', 'Child']);
    });

    test('Enforces maximum depth limit', () => {
      // Create structure with depth > 100
      let deepObj: any = { found: 'value' };
      for (let i = 0; i < 110; i++) {
        deepObj = { level: i, nested: deepObj };
      }

      const program = compileSource('data..found');
      const result = evaluate(program, {
        state: {},
        data: deepObj,
        env: {},
      });
      // Should not find value beyond depth limit
      expect(result).toEqual([]);
    });

    test('Handles self-referencing arrays', () => {
      const arr: any[] = [{ name: 'Item 1' }];
      arr.push(arr); // Creates circular reference

      const program = compileSource('data..name');
      const result = evaluate(program, {
        state: {},
        data: { items: arr },
        env: {},
      });
      // Should handle gracefully
      expect(result).toEqual(['Item 1']);
    });
  });

  describe('Edge cases', () => {
    test('Primitives return empty array', () => {
      const program = compileSource('data..name');
      const result = evaluate(program, {
        state: {},
        data: 42 as any,
        env: {},
      });
      expect(result).toEqual([]);
    });

    test('Empty objects return empty array', () => {
      const program = compileSource('data..name');
      const result = evaluate(program, {
        state: {},
        data: {},
        env: {},
      });
      expect(result).toEqual([]);
    });

    test('Empty arrays return empty array', () => {
      const program = compileSource('data..name');
      const result = evaluate(program, {
        state: {},
        data: [] as any,
        env: {},
      });
      expect(result).toEqual([]);
    });

    test('Arrays do not have properties themselves', () => {
      const program = compileSource('data..length');
      const result = evaluate(program, {
        state: {},
        data: {
          items: [1, 2, 3],
          nested: { items: [4, 5] },
        },
        env: {},
      });
      // Should not find "length" property on arrays
      expect(result).toEqual([]);
    });

    test('Null values in arrays', () => {
      const program = compileSource('data..name');
      const result = evaluate(program, {
        state: {},
        data: {
          users: [{ name: 'Alice' }, null, { name: 'Bob' }],
        },
        env: {},
      });
      expect(result).toEqual(['Alice', 'Bob']);
    });

    test('Property with null value is collected', () => {
      const program = compileSource('data..value');
      const result = evaluate(program, {
        state: {},
        data: {
          a: { value: null },
          b: { value: 'not null' },
        },
        env: {},
      });
      expect(result).toEqual([null, 'not null']);
    });

    test('Recursive descent on string returns empty', () => {
      const program = compileSource('data..x');
      const result = evaluate(program, {
        state: {},
        data: 'string value' as any,
        env: {},
      });
      expect(result).toEqual([]);
    });

    test('Recursive descent on boolean returns empty', () => {
      const program = compileSource('data..x');
      const result = evaluate(program, {
        state: {},
        data: true as any,
        env: {},
      });
      expect(result).toEqual([]);
    });
  });
});
