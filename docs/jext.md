# Portable JSON UI + Expression Engine

## Goal

Design a **performant, portable UI system** where:

* Layout is defined in pure JSON (JSX‑like, but no JS)
* Conditions and actions are expressed declaratively
* Logic runs **identically** on frontend and backend
* Everything is **serializable, deterministic, and safe**

This document describes the architecture that satisfies those constraints.

---

## Core Principles

1. **No arbitrary JavaScript in serialized data**
2. **One source of truth for authoring, one derived runtime artifact**
3. **Explicit execution model (no hidden semantics)**
4. **Bounded, analyzable, non‑Turing‑complete logic**
5. **Same artifacts run everywhere**

---

## High‑Level Architecture

The system is built as a pipeline with clear phase separation:

```
Authoring (JSON / strings)
        ↓
AST (semantic structure)
        ↓
Lowered IR (decisions removed)
        ↓
Bytecode / Instruction Stack (execution plan)
        ↓
Evaluator (frontend / backend)
```

Each phase removes ambiguity and runtime cost.

---

## Layout Definition (JSX‑like, but JSON)

The layout is a **UI AST**:

```json
{
  "type": "Button",
  "props": { "label": "Increment" },
  "on": {
    "click": { "type": "action", "program": "incCounter" }
  }
}
```

Characteristics:

* Closed set of component types
* Strict prop schemas
* No executable code
* Fully serializable

---

## Expressions: Authoring vs Runtime

### Authoring Form (Source of Truth)

Human‑friendly, editable, debuggable:

```json
{
  "and": [
    { "jext": "state.value > 1" },
    { "jext": "state.value < 10" }
  ]
}
```

Used for:

* Editing
* Validation
* Error reporting
* Diffing & history

### Compiled Form (Derived Artifact)

Execution‑only, cached, portable:

```json
{
  "bytecodeVersion": 1,
  "slots": ["state.value"],
  "code": [
    ["LOAD", 0],
    ["CONST", 1],
    ["GT"],
    ["JUMP_IF_FALSE", 8],

    ["LOAD", 0],
    ["CONST", 10],
    ["LT"],
    ["RETURN"],

    ["CONST", false],
    ["RETURN"]
  ]
}
```

Rules:

* Never edited by hand
* Can be regenerated at any time
* Always versioned

---

## AST vs Instruction Stack

* **AST**: represents *meaning*

  * Good for validation and transformation
  * Bad for hot execution

* **Instruction Stack / Bytecode**: represents *execution*

  * Flat, linear, cache‑friendly
  * Predictable control flow
  * Ideal for repeated evaluation over large data

The AST is an intermediate tool. The instruction stack is the runtime truth.

---

## Path Resolution & Slots

Dynamic paths like:

```
state.user.profile.age
```

Are lowered at compile time into slot access:

```
LOAD slot_3 → LOAD slot_1 → LOAD slot_4 → LOAD slot_2
```

Benefits:

* No string lookups at runtime
* Stable memory access
* Faster repeated evaluation

---

## Conditions and Control Flow

Logical operators are **control structures**, not expressions.

### AND semantics:

* Evaluate left to right
* Short‑circuit on first false

Lowered into explicit jumps:

```
EVAL A
JUMP_IF_FALSE end
EVAL B
JUMP_IF_FALSE end
RETURN true
end:
RETURN false
```

This avoids wasted work and keeps runtime predictable.

---

## Actions & State Mutation

State changes are **explicit instructions**, never implicit side effects.

Examples:

* `SET_PATH`
* `INC_PATH`
* `APPEND_PATH`

This enables:

* Safety
* Determinism
* Undo / redo
* Time‑travel debugging

Conditions may not include mutation ops.

---

## Function Calls (Without Functions)

No user‑defined functions, closures, or lambdas.

Instead:

* A **fixed registry of built‑in operations**
* Pure, deterministic, versioned

### Example

Authoring:

```
state.value.toString().length
```

Lowered (desugared):

```
length(toString(state.value))
```

Bytecode:

```
LOAD state.value
CALL toString 1
CALL length 1
RETURN
```

No `this`, no prototypes, no dynamic dispatch.

---

## Execution Context

Every evaluation runs with an explicit context:

```json
{
  "state": { ... },
  "data": { ... },
  "env": { ... }
}
```

Static analysis determines:

* which paths are read
* which paths are written

This enables incremental re‑evaluation.

---

## Performance Model

This architecture is optimized for:

* Large collections
* Deep object graphs
* Repeated evaluation

Key wins:

* Amortized compilation cost
* Tight execution loop
* Reusable stacks
* Predictable branches

For UI workloads, this is often faster than dynamic JS evaluation.

---

## Versioning & Migration

Both layout and bytecode are versioned:

* `layoutVersion`
* `bytecodeVersion`

On mismatch:

* Migrate layout AST
* Recompile expressions

Bytecode is always disposable.

---

## What This Is (and Is Not)

This system is:

* A **portable UI execution model**
* A **constrained logic DSL**
* A **compiler + runtime**, not a scripting language

It deliberately avoids:

* Loops
* Recursion
* Arbitrary code execution

That constraint is what makes it safe, fast, and portable.

---

## Footnote: Familiar Without Being JavaScript

The power of this design is that it **feels close to JavaScript**:

* expressions
* chaining
* operators

…but it is not JavaScript.

That familiarity lowers the learning curve, while the constraints unlock:

* serialization
* determinism
* frontend/backend parity

This is the sweet spot between ergonomics and control.

---

## References: Stack‑Based VMs

* [Crafting Interpreters](https://craftinginterpreters.com) — Robert Nystrom. Part III builds a complete stack‑based bytecode VM in C. The single best resource for this topic.
* [Writing An Interpreter In Go](https://interpreterbook.com) / [Writing A Compiler In Go](https://compilerbook.com) — Thorsten Ball. Builds a stack‑based VM from scratch, very practical and hands‑on.
* [The Implementation of Lua 5.0](https://www.lua.org/doc/jucs05.pdf) — Ierusalimschy, de Figueiredo, Celes. Short paper on Lua's register‑based VM, useful as contrast to pure stack‑based designs.
* [CPython Bytecode & VM Internals](https://docs.python.org/3/library/dis.html) — The `dis` module docs and `ceval.c` source show a real‑world stack VM in action.
* [Structure and Interpretation of Computer Programs](https://mitp-content-server.mit.edu/books/content/sectbyfn/books_pres_0/6515/sicp.zip/index.html) — Abelson & Sussman. Chapter 5 covers compilation to register/stack machines.
* [The Java Virtual Machine Specification, Chapter 6](https://docs.oracle.com/javase/specs/jvms/se21/html/jvms-6.html) — The instruction set of the most widely deployed stack‑based VM. Dense but authoritative.
