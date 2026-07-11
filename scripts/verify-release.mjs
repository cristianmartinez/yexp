import { readFile } from 'node:fs/promises';

const readPackage = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));

const core = await readPackage('../packages/core/package.json');
const cli = await readPackage('../packages/cli/package.json');
const requestedTag = process.argv[2] ?? process.env.GITHUB_REF_NAME;

const failures = [];

if (core.name !== 'yexp') failures.push(`expected core package name yexp, received ${core.name}`);
if (cli.name !== 'yexp-cli') failures.push(`expected CLI package name yexp-cli, received ${cli.name}`);
if (core.version !== cli.version) {
  failures.push(`package versions differ: yexp=${core.version}, yexp-cli=${cli.version}`);
}
if (cli.dependencies?.yexp !== `^${core.version}`) {
  failures.push(`yexp-cli must depend on yexp@^${core.version}`);
}

if (requestedTag) {
  const expectedTag = `v${core.version}`;
  if (requestedTag !== expectedTag) {
    failures.push(`release tag must be ${expectedTag}, received ${requestedTag}`);
  }
}

if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'));
  process.exit(1);
}

console.log(`release metadata valid for yexp ${core.version}`);
