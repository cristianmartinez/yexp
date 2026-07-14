import { spawnSync } from 'node:child_process';

const packages = [
  {
    directory: 'packages/core',
    name: '@cristianmartinez/yexp',
    required: ['LICENSE', 'README.md', 'dist/index.js', 'dist/index.d.ts'],
  },
  {
    directory: 'packages/cli',
    name: '@cristianmartinez/yexp-cli',
    required: ['LICENSE', 'README.md', 'dist/index.js'],
  },
];

const failures = [];

for (const packageConfig of packages) {
  const result = spawnSync('npm', ['pack', '--dry-run', '--json'], {
    cwd: packageConfig.directory,
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    failures.push(`${packageConfig.name}: npm pack failed: ${result.stderr.trim()}`);
    continue;
  }

  const [pack] = JSON.parse(result.stdout);
  if (pack.name !== packageConfig.name) {
    failures.push(
      `${packageConfig.directory}: expected ${packageConfig.name}, received ${pack.name}`,
    );
  }

  const files = new Set(pack.files.map((file) => file.path));
  for (const required of packageConfig.required) {
    if (!files.has(required)) {
      failures.push(`${packageConfig.name}: package is missing ${required}`);
    }
  }

  console.log(
    `${pack.name}@${pack.version}: ${pack.entryCount} files, ${pack.unpackedSize} bytes unpacked`,
  );
}

if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'));
  process.exit(1);
}
