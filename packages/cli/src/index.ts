#!/usr/bin/env node

import { once } from 'node:events';
import { createReadStream } from 'node:fs';
import { readFile } from 'node:fs/promises';
import type { Readable } from 'node:stream';
import { StringDecoder } from 'node:string_decoder';
import {
  type BytecodeProgram,
  type ExprValue,
  compile,
  evaluate,
  isExprError,
} from '@cristianmartinez/yexp';
import packageJson from '../package.json' with { type: 'json' };
import { type CliConfig, type CliOptions, parseArgs } from './args.js';
import { formatOutput } from './format.js';
import { cliFunctions } from './functions.js';
import { InputError, parseJsonLineStream } from './input.js';

const EXIT = {
  success: 0,
  falseOrNull: 1,
  usage: 2,
  compile: 3,
  input: 4,
  runtime: 5,
} as const;

const HELP = `yexp - query and transform JSON with familiar expressions

USAGE
  yexp [OPTIONS] <expression> [file ...]
  npx @cristianmartinez/yexp-cli [OPTIONS] <expression> [file ...]

INPUT
  Reads JSON values from files or stdin. Multiple values and NDJSON are supported.
  Use --null-input to run without input, or --raw-input to read lines as strings.

OPTIONS
  -c, --compact-output      Write compact JSON
  -r, --raw-output          Write strings without JSON quotes
  -R, --raw-input           Read each input line as a string
  -s, --slurp               Collect all inputs into one array
  -n, --null-input          Evaluate once with null input
  -e, --exit-status         Exit 1 when the last result is false or null
  -j, --join-output         Do not write a newline after each result
  -M, --monochrome-output   Disable color output
  -f, --file <path>         Read an input file (positional files are preferred)
  -h, --help                Show help
  -v, --version             Show version

EXAMPLES
  printf '{"name":"Ada"}\n' | yexp '.name'
  yexp '.users.filter(user => user.active)' data.json
  printf '{"id":1}\n{"id":2}\n' | yexp -c '.id'
  printf 'one\ntwo\n' | yexp -Rr '$'
  npx @cristianmartinez/yexp-cli '.items.map(item => item.price) |> add' order.json

EXIT STATUS
  0 success, 1 false/null with -e, 2 usage, 3 compile, 4 input, 5 runtime

MORE INFO
  https://github.com/cristianmartinez/yexp
`;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8');
}

async function* readLines(input: Readable): AsyncGenerator<string> {
  const decoder = new StringDecoder('utf8');
  let fragments: string[] = [];

  const finishLine = (tail: string): string => {
    if (fragments.length === 0) return tail.endsWith('\r') ? tail.slice(0, -1) : tail;
    fragments.push(tail);
    const line = fragments.join('');
    fragments = [];
    return line.endsWith('\r') ? line.slice(0, -1) : line;
  };

  for await (const chunk of input) {
    const text = typeof chunk === 'string' ? chunk : decoder.write(chunk);
    let start = 0;
    let newline = text.indexOf('\n', start);
    while (newline !== -1) {
      yield finishLine(text.slice(start, newline));
      start = newline + 1;
      newline = text.indexOf('\n', start);
    }
    if (start < text.length) fragments.push(text.slice(start));
  }

  const finalText = decoder.end();
  if (finalText.length > 0) fragments.push(finalText);
  if (fragments.length > 0) yield finishLine('');
}

async function readSources(files: string[]): Promise<Array<{ name: string; content: string }>> {
  if (files.length === 0) return [{ name: '<stdin>', content: await readStdin() }];

  const sources: Array<{ name: string; content: string }> = [];
  for (const file of files) {
    try {
      sources.push({ name: file, content: await readFile(file, 'utf8') });
    } catch (error) {
      throw new InputError(`${file}: ${errorMessage(error)}`);
    }
  }
  return sources;
}

async function* readInputSource(
  name: string,
  input: Readable,
  rawInput: boolean,
): AsyncGenerator<ExprValue> {
  try {
    const lines = readLines(input);
    if (rawInput) {
      for await (const line of lines) yield line;
      return;
    }

    yield* parseJsonLineStream(lines, name);
  } catch (error) {
    if (error instanceof InputError) throw error;
    throw new InputError(`${name}: ${errorMessage(error)}`);
  }
}

async function* streamInputs(files: string[], rawInput: boolean): AsyncGenerator<ExprValue> {
  if (files.length === 0) {
    yield* readInputSource('<stdin>', process.stdin, rawInput);
    return;
  }

  for (const file of files) {
    yield* readInputSource(file, createReadStream(file, { encoding: 'utf8' }), rawInput);
  }
}

async function* collectInputs(files: string[], options: CliOptions): AsyncGenerator<ExprValue> {
  if (!options.slurp) {
    yield* streamInputs(files, options.rawInput);
    return;
  }

  if (options.rawInput) {
    const sources = await readSources(files);
    yield sources.map(({ content }) => content).join('');
    return;
  }

  const values: ExprValue[] = [];
  for await (const value of streamInputs(files, false)) values.push(value);
  yield values;
}

const OUTPUT_BUFFER_SIZE = 64 * 1024;

class BufferedOutput {
  private buffer = '';

  async write(value: ExprValue, options: CliOptions): Promise<void> {
    this.buffer += formatOutput(value, options);
    if (!options.joinOutput) this.buffer += '\n';
    if (this.buffer.length >= OUTPUT_BUFFER_SIZE) await this.flush();
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;
    const chunk = this.buffer;
    this.buffer = '';
    if (!process.stdout.write(chunk)) await once(process.stdout, 'drain');
  }
}

function normalizeExpression(expression: string): string {
  if (expression === '.') return '$';
  return expression.startsWith('.') ? `$${expression}` : expression;
}

function writeError(kind: string, message: string) {
  process.stderr.write(`yexp: ${kind}: ${message}\n`);
}

export async function run(args = process.argv.slice(2)): Promise<number> {
  let config: CliConfig;
  try {
    config = parseArgs(args);
  } catch (error) {
    writeError('usage error', errorMessage(error));
    process.stderr.write('Run "yexp --help" for usage.\n');
    return EXIT.usage;
  }

  const { expression, inputFiles, options } = config;
  if (options.help) {
    process.stdout.write(HELP);
    return EXIT.success;
  }
  if (options.version) {
    process.stdout.write(`yexp ${packageJson.version}\n`);
    return EXIT.success;
  }
  if (!expression) {
    writeError('usage error', 'expression required');
    process.stderr.write('Run "yexp --help" for usage.\n');
    return EXIT.usage;
  }

  let program: BytecodeProgram;
  try {
    program = compile(normalizeExpression(expression));
  } catch (error) {
    writeError('compile error', errorMessage(error));
    return EXIT.compile;
  }

  let lastResult: ExprValue | undefined;
  const output = new BufferedOutput();
  try {
    const inputs = options.nullInput
      ? (async function* () {
          yield null;
        })()
      : collectInputs(inputFiles, options);

    for await (const input of inputs) {
      const result = evaluate(program, input, { functions: cliFunctions });
      if (isExprError(result)) {
        await output.flush();
        writeError('runtime error', `${result.error}: ${result.message}`);
        return EXIT.runtime;
      }
      lastResult = result;
      await output.write(result, options);
    }
  } catch (error) {
    await output.flush();
    writeError('input error', errorMessage(error));
    return error instanceof InputError ? EXIT.input : EXIT.usage;
  }
  await output.flush();

  if (!options.exitStatus) return EXIT.success;
  if (lastResult === undefined) return EXIT.input;
  return lastResult === false || lastResult === null ? EXIT.falseOrNull : EXIT.success;
}

process.stdout.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EPIPE') process.exit(EXIT.success);
  throw error;
});

run()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    writeError('internal error', errorMessage(error));
    process.exitCode = EXIT.usage;
  });
