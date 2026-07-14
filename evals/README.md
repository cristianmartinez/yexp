# Yexp LLM evaluation experiments

This directory contains optional research tooling for measuring how reliably language models generate valid Yexp expressions. It is not part of the root workspace, published packages, release pipeline, or required contributor setup.

## Setup

```bash
cd evals
bun install --frozen-lockfile
cp .envrc.example .envrc
```

Set only the provider credentials required by the experiment you intend to run. Never commit `.envrc` or other credential files.

## Commands

```bash
bun run eval
bun run optimize
bun run report
bun run dataset:generate
bun run test:validation
```

The experiments consume the published `@cristianmartinez/yexp` package so their dependency graph stays isolated from the product workspace.

## Artifacts

`dataset-with-results.json` is the checked-in evaluation corpus. Model responses, progress snapshots, reports, and optimized prompts are generated artifacts and are ignored under `results/`. Publish a reproducible summary in a pull request instead of committing raw provider output.

## Scope

Evaluation scores are research signals, not compatibility guarantees. The canonical language contract remains [`../docs/spec.md`](../docs/spec.md) and the executable conformance coverage remains under `packages/core/tests`.
