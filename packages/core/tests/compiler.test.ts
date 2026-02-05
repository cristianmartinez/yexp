import { describe, expect, test } from 'bun:test';
import { compile } from '../src/compiler.js';
import { tokenize } from '../src/lexer.js';
import { parse } from '../src/parser.js';
import { Opcode } from '../src/types.js';

function c(source: string) {
  return compile(parse(tokenize(source)));
}

function opcodes(source: string): Opcode[] {
  return c(source).code.map((i) => i[0]);
}

describe('compiler', () => {
  describe('literals', () => {
    test('number', () => {
      const program = c('42');
      expect(program.constants).toContain(42);
      expect(opcodes('42')).toEqual([Opcode.CONST, Opcode.RETURN]);
    });

    test('string', () => {
      const program = c('"hello"');
      expect(program.constants).toContain('hello');
    });

    test('boolean', () => {
      expect(c('true').constants).toContain(true);
    });

    test('null', () => {
      expect(c('null').constants).toContain(null);
    });
  });

  describe('paths', () => {
    test('simple path creates slot', () => {
      const program = c('state.count');
      expect(program.slots).toEqual(['state.count']);
      expect(opcodes('state.count')).toEqual([Opcode.LOAD, Opcode.RETURN]);
    });

    test('deep path', () => {
      const program = c('state.user.name');
      expect(program.slots).toEqual(['state.user.name']);
    });

    test('multiple paths deduplicate', () => {
      const program = c('state.a + state.a');
      expect(program.slots).toEqual(['state.a']);
    });
  });

  describe('arithmetic', () => {
    test('addition', () => {
      expect(opcodes('1 + 2')).toEqual([Opcode.CONST, Opcode.CONST, Opcode.ADD, Opcode.RETURN]);
    });

    test('all operators', () => {
      expect(opcodes('1 - 2')).toContain(Opcode.SUB);
      expect(opcodes('1 * 2')).toContain(Opcode.MUL);
      expect(opcodes('1 / 2')).toContain(Opcode.DIV);
      expect(opcodes('1 % 2')).toContain(Opcode.MOD);
    });
  });

  describe('comparison', () => {
    test('all comparison operators', () => {
      expect(opcodes('1 == 2')).toContain(Opcode.EQ);
      expect(opcodes('1 != 2')).toContain(Opcode.NEQ);
      expect(opcodes('1 < 2')).toContain(Opcode.LT);
      expect(opcodes('1 > 2')).toContain(Opcode.GT);
      expect(opcodes('1 <= 2')).toContain(Opcode.LTE);
      expect(opcodes('1 >= 2')).toContain(Opcode.GTE);
    });
  });

  describe('unary', () => {
    test('negation', () => {
      expect(opcodes('-1')).toContain(Opcode.NEG);
    });

    test('logical not', () => {
      expect(opcodes('!true')).toContain(Opcode.NOT);
    });
  });

  describe('logical (short-circuit)', () => {
    test('and produces jumps', () => {
      const ops = opcodes('true && false');
      expect(ops).toContain(Opcode.JUMP_IF_FALSE);
      expect(ops).toContain(Opcode.JUMP);
    });

    test('or produces jumps', () => {
      const ops = opcodes('true || false');
      expect(ops).toContain(Opcode.JUMP_IF_TRUE);
    });
  });

  describe('pipe', () => {
    test('simple pipe compiles to CALL', () => {
      const program = c('state.value |> toString');
      expect(opcodes('state.value |> toString')).toContain(Opcode.CALL);
      expect(program.code.find((i) => i[0] === Opcode.CALL)).toEqual([Opcode.CALL, 'toString', 1]);
    });

    test('pipe with args', () => {
      const program = c('state.value |> round(2)');
      const call = program.code.find((i) => i[0] === Opcode.CALL);
      expect(call).toEqual([Opcode.CALL, 'round', 2]);
    });
  });

  describe('array literal', () => {
    test('creates MAKE_ARRAY', () => {
      const ops = opcodes('[1, 2, 3]');
      expect(ops).toContain(Opcode.MAKE_ARRAY);
    });

    test('with spread', () => {
      const ops = opcodes('[...state.items, 1]');
      expect(ops).toContain(Opcode.SPREAD);
      expect(ops).toContain(Opcode.MAKE_ARRAY);
    });
  });

  describe('object literal', () => {
    test('creates MAKE_OBJ', () => {
      const ops = opcodes('{ name: "Alice" }');
      expect(ops).toContain(Opcode.MAKE_OBJ);
    });
  });

  describe('template literal', () => {
    test('no interpolation', () => {
      const program = c('`hello`');
      expect(program.constants).toContain('hello');
    });

    test('with interpolation', () => {
      const ops = opcodes('`hello ${state.name}!`');
      expect(ops).toContain(Opcode.TO_STRING);
      expect(ops).toContain(Opcode.ADD);
    });
  });

  describe('mutations', () => {
    test('assignment', () => {
      const ops = opcodes('state.count = 5');
      expect(ops).toContain(Opcode.SET_PATH);
    });

    test('increment', () => {
      const ops = opcodes('state.count++');
      expect(ops).toContain(Opcode.INC_PATH);
    });

    test('decrement', () => {
      const ops = opcodes('state.count--');
      expect(ops).toContain(Opcode.DEC_PATH);
    });

    test('append', () => {
      const ops = opcodes('state.items << 1');
      expect(ops).toContain(Opcode.APPEND_PATH);
    });
  });

  describe('bytecode format', () => {
    test('has version 1', () => {
      expect(c('42').version).toBe(1);
    });

    test('ends with RETURN', () => {
      const program = c('42');
      const last = program.code[program.code.length - 1];
      expect(last?.[0]).toBe(Opcode.RETURN);
    });
  });
});
