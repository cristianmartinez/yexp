# Contributing to Yexp

Thanks for helping improve Yexp. Bug reports, language-design feedback, documentation fixes, tests, and implementation changes are welcome.

## Before you start

- Search existing issues before opening a new one.
- Discuss substantial language or bytecode changes in an issue before implementation.
- Keep portable core behavior separate from CLI-only or host-provided functions.
- Never include credentials, private datasets, or generated dependency artifacts in a pull request.

## Local setup

Install Bun 1.3.6 and a maintained Node.js LTS release (Node 22 or 24), then run:

```bash
git clone https://github.com/cristianmartinez/yexp.git
cd yexp
bun install --frozen-lockfile
bun run ci
```

The repository must remain buildable from a clean checkout. Do not rely on globally installed packages or untracked local configuration.

## Making changes

1. Create a focused branch.
2. Add or update tests for observable behavior.
3. Run `bun run ci`.
4. If package metadata changed, run `bun run release:pack`.
5. Open a pull request describing the behavior and its motivation.

For language changes, also:

- update [`docs/spec.md`](docs/spec.md);
- add cases to `packages/core/tests/language-spec.test.ts` or another focused conformance test;
- document portability and error behavior;
- avoid introducing host-specific semantics into the portable built-in registry.

## Commit messages

Use a Conventional Commit header:

```text
<type>: <imperative summary>
```

Allowed types are `feat`, `fix`, `core`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, and `revert`.

Examples:

```text
feat: add bounded query evaluation
docs: clarify selector ordering
test: cover parser recovery
```

Do not add generated-by, AI attribution, or co-author trailers unless a human contributor explicitly requests authorship credit.

## Pull requests

Pull requests should be small enough to review, explain user-visible impact, and include the relevant verification. Maintainers may ask for a design issue before accepting large grammar, bytecode, or public API changes.

By contributing, you agree that your contribution is licensed under the repository's MIT License.
