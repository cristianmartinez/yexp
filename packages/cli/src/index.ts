#!/usr/bin/env node

/**
 * Yexp CLI - JSON expression evaluation tool
 *
 * Usage:
 *   echo '{"name": "Alice"}' | yexp 'name'
 *   yexp 'users[0].name' data.json
 *   cat data.json | yexp 'users.filter(u => u.age > 25)'
 */

import { readFileSync } from 'fs';
import { compile, evaluate } from 'yexp';
import { cliFunctions } from './functions.js';
import { formatOutput } from './format.js';

interface Options {
  compact?: boolean;
  raw?: boolean;
  noColor?: boolean;
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
    } else if (arg === '--no-color') {
      options.noColor = true;
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
Yexp - Fast JSON expression evaluation

USAGE:
  yexp [OPTIONS] <expression> [file]

ARGUMENTS:
  <expression>    Yexp expression to evaluate
  [file]          JSON file to read (stdin if not provided)

OPTIONS:
  -c, --compact   Compact output (no pretty-printing)
  -r, --raw       Raw output (no JSON encoding for strings)
  --no-color      Disable colorized output
  -h, --help      Show this help message
  -v, --version   Show version

EXAMPLES:
  # Property access (jq-style with '.')
  echo '{"name": "Alice", "age": 30}' | yexp '.name'
  # Output: "Alice"

  # Array operations
  echo '{"users": [{"name": "Alice"}, {"name": "Bob"}]}' | yexp '.users[0].name'
  # Output: "Alice"

  # Filter and map
  yexp '.users.filter(u => u.age > 25).map(u => u.name)' data.json

  # Arithmetic
  echo '{"price": 100}' | yexp '.price * 1.1'
  # Output: 110

  # Template strings (use '$' to access input)
  echo '{"name": "Alice"}' | yexp '\`Hello, \${$.name}!\`'
  # Output: "Hello, Alice!"

  # Access input explicitly with '$'
  echo '{"name": "Alice"}' | yexp '$.name'
  # Output: "Alice"

PERFORMANCE:
  Yexp is optimized for speed (2-6x faster than JSONata)
  Uses compiled bytecode for efficient evaluation

MORE INFO:
  https://github.com/yourusername/yexp
`);
}

function showVersion() {
  console.log('yexp 0.0.1');
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];

  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks).toString('utf-8');
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
    console.error('Run "yexp --help" for usage information');
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

    if (!expression) {
      throw new Error('Expression is required');
    }

    // CLI mode: Support jq-style '.' prefix as alias for root ($)
    // This makes '.name' work like jq: transform to '$.name'
    let finalExpression = expression;
    if (expression.startsWith('.')) {
      finalExpression = `$${expression}`;
    }

    // Compile and evaluate expression
    const program = compile(finalExpression);

    // Use new API: pass input directly instead of wrapping in context
    const result = evaluate(program, inputData, { functions: cliFunctions });

    // Output result
    console.log(formatOutput(result, options));
    process.exit(0);
  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
