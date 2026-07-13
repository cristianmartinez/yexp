import { readFileSync, statSync } from 'node:fs';
import { basename, extname, resolve } from 'node:path';
import type { BuiltinFn } from '@cristianmartinez/yexp';
import { makeError } from '@cristianmartinez/yexp';
import fg from 'fast-glob';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function makeFileEntry(filePath: string) {
  const abs = resolve(filePath);
  const stats = statSync(abs);
  return {
    path: abs,
    name: basename(abs),
    ext: extname(abs).slice(1),
    size: stats.size,
    modified: stats.mtimeMs,
    type: stats.isDirectory() ? 'directory' : stats.isSymbolicLink() ? 'symlink' : 'file',
  };
}

const glob: BuiltinFn = (pattern) => {
  if (typeof pattern !== 'string') {
    return makeError('TYPE_ERROR', 'glob requires a string pattern');
  }
  const paths = fg.sync(pattern, { dot: false, onlyFiles: false });
  return paths.map((p) => makeFileEntry(p));
};

const read: BuiltinFn = (path) => {
  if (typeof path !== 'string') {
    return makeError('TYPE_ERROR', 'read requires a string path');
  }
  try {
    return readFileSync(resolve(path), 'utf-8');
  } catch (error) {
    return makeError('TYPE_ERROR', `read failed: ${errorMessage(error)}`);
  }
};

const lines: BuiltinFn = (path) => {
  if (typeof path !== 'string') {
    return makeError('TYPE_ERROR', 'lines requires a string path');
  }
  try {
    const content = readFileSync(resolve(path), 'utf-8');
    return content.split('\n').map((text, i) => ({ num: i + 1, text }));
  } catch (error) {
    return makeError('TYPE_ERROR', `lines failed: ${errorMessage(error)}`);
  }
};

const grep: BuiltinFn = (pattern, pathGlob) => {
  if (typeof pattern !== 'string') {
    return makeError('TYPE_ERROR', 'grep requires a string pattern');
  }

  const globPattern = typeof pathGlob === 'string' ? pathGlob : '**/*';
  const files = fg.sync(globPattern, { dot: false, onlyFiles: true });

  let matcher: (line: string) => string | null;
  if (pattern.startsWith('/') && pattern.endsWith('/') && pattern.length > 2) {
    const regex = new RegExp(pattern.slice(1, -1));
    matcher = (line) => {
      const m = line.match(regex);
      return m ? m[0] : null;
    };
  } else {
    matcher = (line) => (line.includes(pattern) ? pattern : null);
  }

  const results: Array<{ path: string; line: string; num: number; match: string }> = [];
  for (const file of files) {
    try {
      const content = readFileSync(resolve(file), 'utf-8');
      const fileLines = content.split('\n');
      for (let i = 0; i < fileLines.length; i++) {
        const line = fileLines[i] ?? '';
        const match = matcher(line);
        if (match !== null) {
          results.push({
            path: resolve(file),
            line,
            num: i + 1,
            match,
          });
        }
      }
    } catch {
      // Skip unreadable files (binary, permissions, etc.)
    }
  }
  return results;
};

export const cliFunctions: Record<string, BuiltinFn> = {
  glob,
  read,
  lines,
  grep,
};
