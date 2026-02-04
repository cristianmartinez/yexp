import { describe, expect, test } from 'bun:test';
import { tokenize } from '../src/lexer.js';
import { parse } from '../src/parser.js';
import type { ASTNode } from '../src/types.js';

function p(source: string): ASTNode {
  return parse(tokenize(source));
}

describe('parser', () => {
  describe('literals', () => {
    test('number', () => {
      expect(p('42')).toEqual({ type: 'Literal', value: 42, raw: '42' });
    });

    test('float', () => {
      expect(p('3.14')).toEqual({ type: 'Literal', value: 3.14, raw: '3.14' });
    });

    test('string', () => {
      expect(p('"hello"')).toEqual({ type: 'Literal', value: 'hello', raw: '"hello"' });
    });

    test('boolean', () => {
      expect(p('true')).toEqual({ type: 'Literal', value: true, raw: 'true' });
      expect(p('false')).toEqual({ type: 'Literal', value: false, raw: 'false' });
    });

    test('null', () => {
      expect(p('null')).toEqual({ type: 'Literal', value: null, raw: 'null' });
    });
  });

  describe('paths', () => {
    test('simple identifier', () => {
      expect(p('state')).toEqual({ type: 'Identifier', name: 'state' });
    });

    test('member access', () => {
      const result = p('state.count');
      expect(result).toEqual({
        type: 'MemberAccess',
        object: { type: 'Identifier', name: 'state' },
        property: 'count',
      });
    });

    test('deep path', () => {
      const result = p('state.user.name');
      expect(result.type).toBe('MemberAccess');
    });

    test('index access', () => {
      const result = p('data.items[0]');
      expect(result.type).toBe('IndexAccess');
    });
  });

  describe('binary operators', () => {
    test('arithmetic', () => {
      const result = p('1 + 2');
      expect(result).toEqual({
        type: 'BinaryOp',
        operator: '+',
        left: { type: 'Literal', value: 1, raw: '1' },
        right: { type: 'Literal', value: 2, raw: '2' },
      });
    });

    test('precedence: * before +', () => {
      const result = p('1 + 2 * 3') as any;
      expect(result.type).toBe('BinaryOp');
      expect(result.operator).toBe('+');
      expect(result.right.operator).toBe('*');
    });

    test('comparison', () => {
      const result = p('state.count > 0') as any;
      expect(result.type).toBe('BinaryOp');
      expect(result.operator).toBe('>');
    });
  });

  describe('unary operators', () => {
    test('negation', () => {
      expect(p('-1')).toEqual({
        type: 'UnaryOp',
        operator: '-',
        operand: { type: 'Literal', value: 1, raw: '1' },
      });
    });

    test('logical not', () => {
      const result = p('!state.active') as any;
      expect(result.type).toBe('UnaryOp');
      expect(result.operator).toBe('!');
    });
  });

  describe('logical operators', () => {
    test('and', () => {
      const result = p('true && false') as any;
      expect(result.type).toBe('LogicalOp');
      expect(result.operator).toBe('&&');
    });

    test('or', () => {
      const result = p('true || false') as any;
      expect(result.type).toBe('LogicalOp');
      expect(result.operator).toBe('||');
    });

    test('precedence: && before ||', () => {
      const result = p('a || b && c') as any;
      expect(result.operator).toBe('||');
      expect(result.right.operator).toBe('&&');
    });
  });

  describe('pipe operator', () => {
    test('simple pipe', () => {
      const result = p('state.value |> toString') as any;
      expect(result.type).toBe('Pipe');
      expect(result.callee).toBe('toString');
    });

    test('chained pipes', () => {
      const result = p('state.value |> toString |> length') as any;
      expect(result.type).toBe('Pipe');
      expect(result.callee).toBe('length');
      expect(result.value.type).toBe('Pipe');
      expect(result.value.callee).toBe('toString');
    });

    test('pipe with args', () => {
      const result = p('state.value |> round(2)') as any;
      expect(result.type).toBe('Pipe');
      expect(result.callee).toBe('round');
      expect(result.args).toHaveLength(1);
    });
  });

  describe('array literals', () => {
    test('empty array', () => {
      expect(p('[]')).toEqual({ type: 'ArrayLiteral', elements: [] });
    });

    test('array with elements', () => {
      const result = p('[1, 2, 3]') as any;
      expect(result.type).toBe('ArrayLiteral');
      expect(result.elements).toHaveLength(3);
    });

    test('array with spread', () => {
      const result = p('[...data.items, 1]') as any;
      expect(result.elements[0].type).toBe('SpreadElement');
    });
  });

  describe('object literals', () => {
    test('empty object', () => {
      expect(p('{}')).toEqual({ type: 'ObjectLiteral', properties: [] });
    });

    test('object with properties', () => {
      const result = p('{ name: "Alice", age: 30 }') as any;
      expect(result.type).toBe('ObjectLiteral');
      expect(result.properties).toHaveLength(2);
      expect(result.properties[0].key).toBe('name');
      expect(result.properties[0].shorthand).toBe(false);
    });

    test('shorthand properties', () => {
      const result = p('{ name, age }') as any;
      expect(result.properties[0].shorthand).toBe(true);
      expect(result.properties[0].key).toBe('name');
    });

    test('object with spread', () => {
      const result = p('{ ...state.user, name: "Bob" }') as any;
      expect(result.properties[0].value.type).toBe('SpreadElement');
    });
  });

  describe('template literals', () => {
    test('no interpolation', () => {
      const result = p('`hello`') as any;
      expect(result.type).toBe('TemplateLiteral');
      expect(result.parts).toHaveLength(1);
      expect(result.parts[0]).toEqual({ type: 'string', value: 'hello' });
    });

    test('with interpolation', () => {
      const result = p('`hello ${name}!`') as any;
      expect(result.type).toBe('TemplateLiteral');
      expect(result.parts).toHaveLength(3);
      expect(result.parts[0]).toEqual({ type: 'string', value: 'hello ' });
      expect(result.parts[1].type).toBe('expression');
      expect(result.parts[2]).toEqual({ type: 'string', value: '!' });
    });
  });

  describe('action expressions', () => {
    test('assignment', () => {
      const result = p('state.count = 5') as any;
      expect(result.type).toBe('Assignment');
      expect(result.target.type).toBe('MemberAccess');
    });

    test('increment', () => {
      const result = p('state.count++') as any;
      expect(result.type).toBe('Update');
      expect(result.operator).toBe('++');
    });

    test('append', () => {
      const result = p('state.items << 1') as any;
      expect(result.type).toBe('Append');
    });
  });

  describe('grouping', () => {
    test('parentheses override precedence', () => {
      const result = p('(1 + 2) * 3') as any;
      expect(result.operator).toBe('*');
      expect(result.left.operator).toBe('+');
    });
  });

  describe('function calls', () => {
    test('simple call', () => {
      const result = p('toString(42)') as any;
      expect(result.type).toBe('Call');
      expect(result.callee).toBe('toString');
      expect(result.args).toHaveLength(1);
    });

    test('multiple args', () => {
      const result = p('slice(0, 5)') as any;
      expect(result.type).toBe('Call');
      expect(result.args).toHaveLength(2);
    });
  });
});
