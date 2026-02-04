import { describe, expect, test } from 'bun:test';
import { VERSION } from '../src/index.js';

describe('core', () => {
  test('exports version', () => {
    expect(VERSION).toBe('0.0.1');
  });
});
