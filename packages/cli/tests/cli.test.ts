import { describe, expect, test } from 'bun:test';
import { join } from 'node:path';

const cli = join(import.meta.dir, '..', 'dist', 'index.js');

async function runCli(args: string[], stdin = '') {
  const process = Bun.spawn(['node', cli, ...args], {
    stdin: 'pipe',
    stdout: 'pipe',
    stderr: 'pipe',
  });
  process.stdin.write(stdin);
  process.stdin.end();

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(process.stdout).text(),
    new Response(process.stderr).text(),
    process.exited,
  ]);
  return { stdout, stderr, exitCode };
}

describe('yexp binary', () => {
  test('keeps stdout clean for shell pipelines', async () => {
    const result = await runCli(['-r', '.name'], '{"name":"Ada"}\n');

    expect(result).toEqual({ stdout: 'Ada\n', stderr: '', exitCode: 0 });
  });

  test('evaluates each value from an NDJSON stream', async () => {
    const result = await runCli(['-c', '.id'], '{"id":1}\n{"id":2}\n');

    expect(result).toEqual({ stdout: '1\n2\n', stderr: '', exitCode: 0 });
  });

  test('supports raw input and slurping', async () => {
    const result = await runCli(['-Rs', 'length($)'], 'one\ntwo\n');

    expect(result).toEqual({ stdout: '8\n', stderr: '', exitCode: 0 });
  });

  test('uses a stable compile-error exit code', async () => {
    const result = await runCli(['1 +'], 'null\n');

    expect(result.exitCode).toBe(3);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('yexp: compile error:');
  });

  test('uses a stable input-error exit code', async () => {
    const result = await runCli(['.'], 'not-json\n');

    expect(result.exitCode).toBe(4);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('yexp: input error:');
  });

  test('flushes completed stream results before a later input error', async () => {
    const result = await runCli(['-c', '.id'], '{"id":1}\nnot-json\n');

    expect(result.exitCode).toBe(4);
    expect(result.stdout).toBe('1\n');
    expect(result.stderr).toContain('yexp: input error:');
  });

  test('uses a stable runtime-error exit code', async () => {
    const result = await runCli(['1 / 0'], 'null\n');

    expect(result.exitCode).toBe(5);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('DIVISION_BY_ZERO');
  });

  test('supports jq-style truthy exit status', async () => {
    const result = await runCli(['-e', '.active'], '{"active":false}\n');

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe('false\n');
  });
});
