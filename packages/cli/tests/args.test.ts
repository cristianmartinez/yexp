import { describe, expect, test } from 'bun:test';
import { UsageError, parseArgs } from '../src/args.js';

describe('CLI arguments', () => {
  test('supports jq-style grouped short flags', () => {
    const config = parseArgs(['-cRr', '$', 'input.txt']);

    expect(config.expression).toBe('$');
    expect(config.inputFiles).toEqual(['input.txt']);
    expect(config.options.compact).toBe(true);
    expect(config.options.rawInput).toBe(true);
    expect(config.options.rawOutput).toBe(true);
  });

  test('supports expressions beginning with a dash after --', () => {
    expect(parseArgs(['--', '-1 + 2']).expression).toBe('-1 + 2');
  });

  test('rejects unknown options', () => {
    expect(() => parseArgs(['--wat', '.'])).toThrow(UsageError);
  });

  test('rejects a missing file path', () => {
    expect(() => parseArgs(['.', '--file'])).toThrow(UsageError);
  });
});
