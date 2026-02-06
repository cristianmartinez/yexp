const ansi = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

function colorizeJson(value: any, indent: number = 0): string {
  const pad = '  '.repeat(indent);
  const padInner = '  '.repeat(indent + 1);

  if (value === null) return `${ansi.dim}null${ansi.reset}`;
  if (typeof value === 'boolean') return `${ansi.cyan}${value}${ansi.reset}`;
  if (typeof value === 'number') return `${ansi.yellow}${value}${ansi.reset}`;
  if (typeof value === 'string') return `${ansi.green}"${JSON.stringify(value).slice(1, -1)}"${ansi.reset}`;

  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    const items = value.map((v) => `${padInner}${colorizeJson(v, indent + 1)}`);
    return `[\n${items.join(',\n')}\n${pad}]`;
  }

  if (typeof value === 'object') {
    const keys = Object.keys(value);
    if (keys.length === 0) return '{}';
    const entries = keys.map(
      (k) => `${padInner}${ansi.bold}${ansi.white}"${k}"${ansi.reset}: ${colorizeJson(value[k], indent + 1)}`,
    );
    return `{\n${entries.join(',\n')}\n${pad}}`;
  }

  return String(value);
}

export interface FormatOptions {
  compact?: boolean;
  raw?: boolean;
  noColor?: boolean;
}

export function formatOutput(value: any, options: FormatOptions): string {
  if (options.raw && typeof value === 'string') {
    return value;
  }

  if (options.compact) {
    return JSON.stringify(value);
  }

  const useColor = !options.noColor && !process.env.NO_COLOR && process.stdout.isTTY;
  if (useColor) {
    return colorizeJson(value);
  }

  return JSON.stringify(value, null, 2);
}
