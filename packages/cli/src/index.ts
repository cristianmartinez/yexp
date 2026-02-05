#!/usr/bin/env node

/**
 * Jext CLI - JSON expression evaluation tool
 *
 * Usage:
 *   echo '{"name": "Alice"}' | jext 'name'
 *   jext 'users[0].name' data.json
 *   cat data.json | jext 'users.filter(u => u.age > 25)'
 */

import { readFileSync } from 'fs';
import { tokenize, parse, compile, evaluate } from '@jext/core';
import type { ExecutionContext } from '@jext/core';

interface Options {
  compact?: boolean;
  raw?: boolean;
  help?: boolean;
  version?: boolean;
  file?: string;
}

function parseArgs(args: string[]): { expression?: string; options: Options } {
  const options: Options = {};
  let expression: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '-h' || arg === '--help') {
      options.help = true;
    } else if (arg === '-v' || arg === '--version') {
      options.version = true;
    } else if (arg === '-c' || arg === '--compact') {
      options.compact = true;
    } else if (arg === '-r' || arg === '--raw') {
      options.raw = true;
    } else if (arg === '-f' || arg === '--file') {
      options.file = args[++i];
    } else if (!expression) {
      expression = arg;
    } else {
      // Assume it's a file path
      options.file = arg;
    }
  }

  return { expression, options };
}

function showHelp() {
  console.log(`
Jext - Fast JSON expression evaluation

USAGE:
  jext [OPTIONS] <expression> [file]

ARGUMENTS:
  <expression>    Jext expression to evaluate
  [file]          JSON file to read (stdin if not provided)

OPTIONS:
  -c, --compact   Compact output (no pretty-printing)
  -r, --raw       Raw output (no JSON encoding for strings)
  -h, --help      Show this help message
  -v, --version   Show version

EXAMPLES:
  # Property access
  echo '{"name": "Alice", "age": 30}' | jext 'name'
  # Output: "Alice"

  # Array operations
  echo '{"users": [{"name": "Alice"}, {"name": "Bob"}]}' | jext 'users[0].name'
  # Output: "Alice"

  # Filter and map
  jext 'users.filter(u => u.age > 25).map(u => u.name)' data.json

  # Arithmetic
  echo '{"price": 100}' | jext 'price * 1.1'
  # Output: 110

  # Template strings
  echo '{"name": "Alice"}' | jext '\`Hello, \${name}!\`'
  # Output: "Hello, Alice!"

PERFORMANCE:
  Jext is optimized for speed (2-6x faster than JSONata)
  Uses compiled bytecode for efficient evaluation

MORE INFO:
  https://github.com/yourusername/jext
`);
}

function showVersion() {
  console.log('jext 0.0.1');
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];

  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks).toString('utf-8');
}

function formatOutput(value: any, options: Options): string {
  if (options.raw && typeof value === 'string') {
    return value;
  }

  if (options.compact) {
    return JSON.stringify(value);
  }

  return JSON.stringify(value, null, 2);
}

async function main() {
  const args = process.argv.slice(2);
  const { expression, options } = parseArgs(args);

  // Handle help/version
  if (options.help) {
    showHelp();
    process.exit(0);
  }

  if (options.version) {
    showVersion();
    process.exit(0);
  }

  // Validate expression
  if (!expression) {
    console.error('Error: Expression required');
    console.error('Run "jext --help" for usage information');
    process.exit(1);
  }

  try {
    // Read input JSON
    let inputJson: string;
    if (options.file) {
      inputJson = readFileSync(options.file, 'utf-8');
    } else {
      // Check if stdin is a TTY (interactive terminal)
      if (process.stdin.isTTY) {
        console.error('Error: No input provided');
        console.error('Provide JSON via stdin or use -f/--file option');
        process.exit(1);
      }
      inputJson = await readStdin();
    }

    // Parse JSON
    const inputData = JSON.parse(inputJson);

    // CLI mode: automatically prepend 'data.' if expression doesn't use it
    // This makes `name` work like jq instead of requiring `data.name`
    let finalExpression = expression;
    const needsDataPrefix =
      !expression.startsWith('data.') &&
      !expression.startsWith('data[') &&
      !expression.startsWith('state.') &&
      !expression.startsWith('env.') &&
      !expression.startsWith('`') && // Template string
      !expression.startsWith('[') && // Array literal or index
      !expression.startsWith('{') && // Object literal
      !/^[\d\-]/.test(expression); // Number literal

    if (needsDataPrefix) {
      finalExpression = `data.${expression}`;
    }

    // Compile and evaluate expression
    const tokens = tokenize(finalExpression);
    const ast = parse(tokens);
    const program = compile(ast);

    const context: ExecutionContext = {
      data: inputData,
      state: {},
      env: {},
    };

    const result = evaluate(program, context);

    // Output result
    console.log(formatOutput(result, options));
    process.exit(0);
  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
