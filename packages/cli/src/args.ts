export interface CliOptions {
  compact: boolean;
  rawOutput: boolean;
  rawInput: boolean;
  slurp: boolean;
  nullInput: boolean;
  exitStatus: boolean;
  joinOutput: boolean;
  noColor: boolean;
  help: boolean;
  version: boolean;
}

export interface CliConfig {
  expression?: string;
  inputFiles: string[];
  options: CliOptions;
}

export class UsageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UsageError';
  }
}

const SHORT_FLAGS: Record<string, keyof CliOptions> = {
  c: 'compact',
  r: 'rawOutput',
  R: 'rawInput',
  s: 'slurp',
  n: 'nullInput',
  e: 'exitStatus',
  j: 'joinOutput',
  M: 'noColor',
  h: 'help',
  v: 'version',
};

const LONG_FLAGS: Record<string, keyof CliOptions> = {
  '--compact': 'compact',
  '--compact-output': 'compact',
  '--raw': 'rawOutput',
  '--raw-output': 'rawOutput',
  '--raw-input': 'rawInput',
  '--slurp': 'slurp',
  '--null-input': 'nullInput',
  '--exit-status': 'exitStatus',
  '--join-output': 'joinOutput',
  '--no-color': 'noColor',
  '--monochrome-output': 'noColor',
  '--help': 'help',
  '--version': 'version',
};

export function parseArgs(args: string[]): CliConfig {
  const options: CliOptions = {
    compact: false,
    rawOutput: false,
    rawInput: false,
    slurp: false,
    nullInput: false,
    exitStatus: false,
    joinOutput: false,
    noColor: false,
    help: false,
    version: false,
  };
  const inputFiles: string[] = [];
  let expression: string | undefined;
  let positionalOnly = false;

  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === undefined) break;

    if (!positionalOnly && arg === '--') {
      positionalOnly = true;
      continue;
    }

    if (!positionalOnly && (arg === '-f' || arg === '--file')) {
      const file = args[++index];
      if (!file) throw new UsageError(`${arg} requires a file path`);
      inputFiles.push(file);
      continue;
    }

    if (!positionalOnly && arg.startsWith('--file=')) {
      const file = arg.slice('--file='.length);
      if (!file) throw new UsageError('--file requires a file path');
      inputFiles.push(file);
      continue;
    }

    if (!positionalOnly && arg.startsWith('--')) {
      const option = LONG_FLAGS[arg];
      if (!option) throw new UsageError(`unknown option: ${arg}`);
      options[option] = true;
      continue;
    }

    if (!positionalOnly && arg.startsWith('-') && arg !== '-') {
      for (const flag of arg.slice(1)) {
        const option = SHORT_FLAGS[flag];
        if (!option) throw new UsageError(`unknown option: -${flag}`);
        options[option] = true;
      }
      continue;
    }

    if (expression === undefined) expression = arg;
    else inputFiles.push(arg);
  }

  if (options.nullInput && inputFiles.length > 0) {
    throw new UsageError('--null-input cannot be combined with input files');
  }

  return { expression, inputFiles, options };
}
