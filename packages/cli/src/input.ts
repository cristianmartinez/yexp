import type { ExprValue } from '@cristianmartinez/yexp';

export class InputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InputError';
  }
}

function locationAt(source: string, index: number): string {
  const before = source.slice(0, index);
  const lines = before.split('\n');
  return `line ${lines.length}, column ${(lines.at(-1)?.length ?? 0) + 1}`;
}

function fail(sourceName: string, source: string, index: number, message: string): never {
  throw new InputError(`${sourceName}:${locationAt(source, index)}: ${message}`);
}

function parseSlice(sourceName: string, source: string, start: number, end: number): ExprValue {
  try {
    return JSON.parse(source.slice(start, end)) as ExprValue;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'invalid JSON';
    return fail(sourceName, source, start, message);
  }
}

function scanString(sourceName: string, source: string, start: number): number {
  let escaped = false;
  for (let index = start + 1; index < source.length; index++) {
    const char = source.charAt(index);
    if (escaped) {
      escaped = false;
    } else if (char === '\\') {
      escaped = true;
    } else if (char === '"') {
      return index + 1;
    }
  }
  return fail(sourceName, source, start, 'unterminated JSON string');
}

function scanContainer(sourceName: string, source: string, start: number): number {
  const stack: string[] = [];
  let inString = false;
  let escaped = false;

  for (let index = start; index < source.length; index++) {
    const char = source.charAt(index);
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }

    if (char === '"') {
      inString = true;
    } else if (char === '{') {
      stack.push('}');
    } else if (char === '[') {
      stack.push(']');
    } else if (char === '}' || char === ']') {
      const expected = stack.pop();
      if (expected !== char) return fail(sourceName, source, index, `unexpected ${char}`);
      if (stack.length === 0) return index + 1;
    }
  }

  return fail(sourceName, source, start, 'unterminated JSON value');
}

/** Parse one or more whitespace-separated JSON values, including NDJSON input. */
export function parseJsonValues(source: string, sourceName = '<stdin>'): ExprValue[] {
  // The overwhelmingly common case is one complete JSON document. Let the
  // native parser handle it directly instead of scanning the document once to
  // find its boundary and then parsing the same bytes a second time.
  try {
    return [JSON.parse(source) as ExprValue];
  } catch {
    // Multiple values, NDJSON, and malformed input are handled by the framing
    // parser below so they retain the CLI's location-aware errors.
  }

  if (!/\S/.test(source)) return [];

  const values: ExprValue[] = [];
  let index = 0;

  while (index < source.length) {
    while (/\s/.test(source[index] ?? '')) index++;
    if (index >= source.length) break;

    const start = index;
    const char = source.charAt(index);
    if (char === '{' || char === '[') {
      index = scanContainer(sourceName, source, start);
    } else if (char === '"') {
      index = scanString(sourceName, source, start);
    } else if (source.startsWith('true', start)) {
      index += 4;
    } else if (source.startsWith('false', start)) {
      index += 5;
    } else if (source.startsWith('null', start)) {
      index += 4;
    } else {
      const number = source.slice(start).match(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/);
      if (!number) fail(sourceName, source, start, 'expected a JSON value');
      index += number[0].length;
    }

    values.push(parseSlice(sourceName, source, start, index));
  }

  return values;
}

/**
 * Incrementally frame JSON from a line-oriented source.
 *
 * Minified documents and NDJSON take the native JSON.parse fast path one line
 * at a time. Pretty-printed or multiple whitespace-separated values accumulate
 * only until they form a complete frame.
 */
export async function* parseJsonLineStream(
  lines: AsyncIterable<string>,
  sourceName = '<stdin>',
): AsyncGenerator<ExprValue> {
  let pending = '';

  for await (const line of lines) {
    pending += `${line}\n`;
    if (!/\S/.test(pending)) {
      pending = '';
      continue;
    }

    try {
      const values = parseJsonValues(pending, sourceName);
      for (const value of values) yield value;
      pending = '';
    } catch {
      // The frame may be a pretty-printed document that continues on the next
      // line. A final parse below reports malformed or incomplete input.
    }
  }

  if (/\S/.test(pending)) {
    const values = parseJsonValues(pending, sourceName);
    for (const value of values) yield value;
  }
}

/** Match jq -R behavior: each input line becomes a string with its line ending removed. */
export function parseRawLines(source: string): string[] {
  if (source.length === 0) return [];
  const lines = source.split(/\r?\n/);
  if (/\r?\n$/.test(source)) lines.pop();
  return lines;
}
