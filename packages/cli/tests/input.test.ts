import { describe, expect, test } from 'bun:test';
import { InputError, parseJsonLineStream, parseJsonValues, parseRawLines } from '../src/input.js';

async function collectStream(lines: string[]) {
  async function* source() {
    for (const line of lines) yield line;
  }
  const values = [];
  for await (const value of parseJsonLineStream(source())) values.push(value);
  return values;
}

describe('CLI input framing', () => {
  test('parses multiple JSON and NDJSON values', () => {
    expect(parseJsonValues('{"id":1}\n{"id":2} true [3]\n')).toEqual([
      { id: 1 },
      { id: 2 },
      true,
      [3],
    ]);
  });

  test('keeps braces inside strings from closing containers', () => {
    expect(parseJsonValues('{"text":"not } closed"}')).toEqual([{ text: 'not } closed' }]);
  });

  test('streams NDJSON values without collecting the source', async () => {
    expect(await collectStream(['{"id":1}', '{"id":2}'])).toEqual([{ id: 1 }, { id: 2 }]);
  });

  test('streams multiple JSON values from one line', async () => {
    expect(await collectStream(['{"id":1} {"id":2}'])).toEqual([{ id: 1 }, { id: 2 }]);
  });

  test('streams pretty-printed JSON as one value', async () => {
    expect(await collectStream(['{', '  "items": [1, 2]', '}'])).toEqual([{ items: [1, 2] }]);
  });

  test('reports malformed input with a location', () => {
    expect(() => parseJsonValues('{"id":', 'bad.json')).toThrow(InputError);
    expect(() => parseJsonValues('{"id":', 'bad.json')).toThrow('bad.json:line 1, column 1');
  });

  test('parses raw input by line without adding a trailing empty value', () => {
    expect(parseRawLines('one\ntwo\n')).toEqual(['one', 'two']);
  });
});
