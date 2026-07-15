# Yexp roadmap

The roadmap tracks product direction rather than duplicating the language specification. Observable behavior is defined by [`spec.md`](spec.md) and the conformance tests.

## Stabilize language version 0.1

- Convert the current behavioral tests into a reusable cross-runtime conformance corpus.
- Resolve the legacy `state`/`data`/`env` host-overload ambiguity.
- Define explicit evaluation budgets for instructions, collection growth, recursion, and host calls.
- Freeze selector ordering, error categories, and bytecode compatibility rules for 0.1.

## Improve the application and CLI experience

- Add structured diagnostics with stable source spans and machine-readable output.
- Expand streaming transforms without introducing generator semantics accidentally.
- Make the playground a complete environment for examples, debugging, and shareable queries.
- Add performance gates with reproducible hardware-independent thresholds where possible.

## Portable runtimes

- Publish a normalized semantic IR and shared fixtures before creating platform-specific ports.
- Build direct native runtimes only after the conformance suite can prove observable parity.
- Treat WebAssembly as an optional deployment target, not the semantic source of truth.

## Non-goals for 0.1

- General-purpose scripting or statement execution.
- Implicit network or filesystem authority in the portable core.
- Compatibility claims with jq beyond explicitly documented overlapping workflows.
