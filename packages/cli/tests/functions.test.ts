import { describe, expect, test } from 'bun:test';
import { cliFunctions } from '../src/functions.js';

const { glob, read, lines, grep } = cliFunctions;

describe('CLI functions', () => {
  describe('glob', () => {
    test('returns file entries matching pattern', () => {
      const result = glob!('packages/cli/src/*.ts') as any[];
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('path');
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('ext', 'ts');
      expect(result[0]).toHaveProperty('size');
      expect(result[0]).toHaveProperty('modified');
      expect(result[0]).toHaveProperty('type', 'file');
    });

    test('returns empty array for no matches', () => {
      const result = glob!('nonexistent/**/*.xyz') as any[];
      expect(result).toEqual([]);
    });

    test('errors on non-string pattern', () => {
      const result = glob!(42 as any) as any;
      expect(result.error).toBe('TYPE_ERROR');
    });
  });

  describe('read', () => {
    test('reads file contents', () => {
      const result = read!('packages/cli/package.json');
      expect(typeof result).toBe('string');
      expect(result as string).toContain('@jext/cli');
    });

    test('errors on non-existent file', () => {
      const result = read!('/nonexistent/file.txt') as any;
      expect(result.error).toBe('TYPE_ERROR');
    });

    test('errors on non-string path', () => {
      const result = read!(123 as any) as any;
      expect(result.error).toBe('TYPE_ERROR');
    });
  });

  describe('lines', () => {
    test('returns array of {num, text} objects', () => {
      const result = lines!('packages/cli/package.json') as any[];
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('num', 1);
      expect(result[0]).toHaveProperty('text');
    });

    test('line numbers start at 1', () => {
      const result = lines!('packages/cli/package.json') as any[];
      expect(result[0].num).toBe(1);
      expect(result[1].num).toBe(2);
    });

    test('errors on non-existent file', () => {
      const result = lines!('/nonexistent/file.txt') as any;
      expect(result.error).toBe('TYPE_ERROR');
    });
  });

  describe('grep', () => {
    test('finds literal string matches', () => {
      const result = grep!('@jext/cli', 'packages/cli/package.json') as any[];
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('path');
      expect(result[0]).toHaveProperty('line');
      expect(result[0]).toHaveProperty('num');
      expect(result[0].match).toBe('@jext/cli');
    });

    test('supports regex patterns', () => {
      const result = grep!('/export\\s+const/', 'packages/cli/src/*.ts') as any[];
      expect(Array.isArray(result)).toBe(true);
    });

    test('returns empty array for no matches', () => {
      const result = grep!('ZZZZNOTFOUNDZZZ', 'packages/cli/src/*.ts') as any[];
      expect(result).toEqual([]);
    });

    test('errors on non-string pattern', () => {
      const result = grep!(42 as any) as any;
      expect(result.error).toBe('TYPE_ERROR');
    });
  });
});
