# Security policy

## Supported versions

Yexp is currently pre-1.0. Security fixes are applied to the latest published version of `@cristianmartinez/yexp` and `@cristianmartinez/yexp-cli`. Older pre-1.0 releases may not receive patches.

## Reporting a vulnerability

Please do not open a public issue for a suspected vulnerability.

Use GitHub's private vulnerability reporting for this repository. If that is unavailable, email `dev.cmartinez@gmail.com` with:

- the affected version and component;
- reproduction steps or a minimal proof of concept;
- the expected impact;
- any suggested mitigation.

You should receive an acknowledgement within seven days. Confirmed issues will be coordinated privately until a fix and advisory are ready.

## Security boundary

The portable core runtime does not expose JavaScript globals, Node.js APIs, the filesystem, the network, `eval()`, or `Function()`. Object construction and traversal block prototype-boundary keys such as `__proto__`, `constructor`, and `prototype` where they could escape the data model.

Yexp is not a complete resource-isolation sandbox. Collection size, expression complexity, nested transformations, and host functions can consume CPU or memory. Applications evaluating expressions from untrusted users must apply limits and isolation appropriate to their environment.

Host functions expand the evaluator's authority. The CLI intentionally provides filesystem functions including `glob`, `read`, `lines`, and `grep`; these are not part of the portable core language and must not be treated as sandboxed operations.

## Security development requirements

- Every security fix requires a regression test.
- Changes to path traversal, object construction, host functions, or execution limits require explicit security review.
- Dependencies are audited in CI with `bun audit --production`.
- Published packages are built and verified from a clean, locked dependency graph.
