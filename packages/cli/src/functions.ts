import { readFileSync, statSync } from 'node:fs';
import { resolve, basename, extname } from 'node:path';
import type { BuiltinFn } from '@jext/core';
import { makeError } from '@jext/core';
import fg from 'fast-glob';

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
  } catch (err: any) {
    return makeError('TYPE_ERROR', `read failed: ${err.message}`);
  }
};

const lines: BuiltinFn = (path) => {
  if (typeof path !== 'string') {
    return makeError('TYPE_ERROR', 'lines requires a string path');
  }
  try {
    const content = readFileSync(resolve(path), 'utf-8');
    return content.split('\n').map((text, i) => ({ num: i + 1, text }));
  } catch (err: any) {
    return makeError('TYPE_ERROR', `lines failed: ${err.message}`);
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

  const results: any[] = [];
  for (const file of files) {
    try {
      const content = readFileSync(resolve(file), 'utf-8');
      const fileLines = content.split('\n');
      for (let i = 0; i < fileLines.length; i++) {
        const match = matcher(fileLines[i]!);
        if (match !== null) {
          results.push({
            path: resolve(file),
            line: fileLines[i],
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
