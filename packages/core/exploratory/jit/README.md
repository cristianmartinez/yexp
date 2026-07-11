# JIT Compilation Exploration

**10-50x faster** execution by compiling bytecode to native JavaScript.

## Files

- `jit-example.ts` - JIT compiler implementation
- `demo.ts` - Interactive demo
- `COMPARISON.md` - Detailed analysis

## Quick Start

```bash
cd packages/core/exploratory/jit
bun run demo.ts
```

## Example

```typescript
import { tokenize, parse, compile } from '@cristianmartinez/yexp';
import { compileToOptimizedJS } from './jit-example';

const program = compile(parse(tokenize('data.price * 1.1')));
const jitFn = compileToOptimizedJS(program);

// Generated: function(context) { return context.data?.price * 1.1; }
const result = jitFn({ data: { price: 100 } }); // 110
```

## Performance

| Method | Speed |
|--------|-------|
| Stack VM | 5µs |
| Optimized JIT | 0.1µs (50x faster!) |
