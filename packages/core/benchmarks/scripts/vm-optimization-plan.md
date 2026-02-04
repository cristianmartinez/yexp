# Practical VM Optimization Plan

## Goal
Improve VM performance by 20-40% through targeted optimizations without major refactoring.

## Current Bottleneck Analysis

From `vm-optimization-test.ts`:
```
Bytecode for: age >= 18 && age <= 65

0: LOAD 0           ← Load 'age' from context
1: DUP              ← Duplicate for second comparison
2: CONST 0          ← Push 18
3: GTE              ← Compare age >= 18
4: JUMP_IF_FALSE 8  ← Short-circuit if false
5: CONST 1          ← Push 65
6: LTE              ← Compare age <= 65
7: JUMP 9
8: CONST 2          ← Push false
9: RETURN

Total: 10 instructions
Time: 0.37µs per evaluation
```

**Hot opcodes**: GTE, LTE, LOAD, DUP, CONST (80% of execution time)

## Optimization 1: Inline Stack Operations in Hot Opcodes ⚡

**Impact**: 15-20% improvement

### Current Implementation
```typescript
case Opcode.GTE: {
  const b = pop();  // Function call
  const a = pop();  // Function call
  if (isExprError(a)) return a;  // Error check
  if (isExprError(b)) return b;  // Error check
  if (typeof a !== 'number' || typeof b !== 'number') {
    return makeError('TYPE_ERROR', ...);
  }
  push(a >= b);  // Function call
  break;
}
```

### Optimized Implementation
```typescript
case Opcode.GTE: {
  // Inline pop() - direct stack access
  const b = stack[--stackTop];
  const a = stack[--stackTop];

  // Fast path: assume numbers (valid 99% of the time)
  if (typeof a === 'number' && typeof b === 'number') {
    stack[stackTop++] = a >= b;  // Inline push()
    break;
  }

  // Slow path: handle errors and type mismatches
  if (isExprError(a)) return a;
  if (isExprError(b)) return b;
  return makeError('TYPE_ERROR', `Cannot compare ${typeof a} and ${typeof b}`);
}
```

**Savings**:
- Eliminates 3 function calls per comparison
- Fast path has zero branches for common case
- Apply to: GTE, LTE, GT, LT, EQ, NEQ, ADD, SUB, MUL, DIV

## Optimization 2: Specialized Comparison Opcodes ⚡⚡

**Impact**: 30-40% improvement for simple conditions

### Add New Opcodes
```typescript
// Fused operations for common patterns
LOAD_GTE_CONST = 'LOAD_GTE_CONST',  // Load slot, compare >= constant
LOAD_LTE_CONST = 'LOAD_LTE_CONST',  // Load slot, compare <= constant
DUP_GTE_CONST = 'DUP_GTE_CONST',    // Duplicate top, compare >= constant
DUP_LTE_CONST = 'DUP_LTE_CONST',    // Duplicate top, compare <= constant
```

### Compiler Pattern Detection
```typescript
// Detect pattern: LOAD slot, CONST n, GTE
if (isComparison && leftIsLoad && rightIsConst) {
  emit(Opcode.LOAD_GTE_CONST, slotIdx, constIdx);
}
```

### Optimized Bytecode
```
Before (10 instructions):
LOAD 0, DUP, CONST 0, GTE, JUMP_IF_FALSE 8, CONST 1, LTE, ...

After (6 instructions):
LOAD_GTE_CONST 0 0, JUMP_IF_FALSE 5, DUP_LTE_CONST 1, ...
```

**Savings**:
- 40% fewer instructions
- No stack manipulation overhead
- Single dispatch per fused operation

## Optimization 3: Inline Caching for Property Access

**Impact**: 10-15% improvement for property-heavy expressions

### Add Cache to Bytecode
```typescript
interface BytecodeProgram {
  version: number;
  slots: string[];
  constants: ExprValue[];
  code: Instruction[];
  cache?: PropertyCache[];  // ← New: inline cache
}

interface PropertyCache {
  lastObject: ExprObject | null;
  lastValue: ExprValue;
}
```

### Cached Property Access
```typescript
case Opcode.INDEX: {
  const cacheIdx = instruction[2] as number;  // Optional cache index

  if (cacheIdx !== undefined) {
    const cache = program.cache[cacheIdx];
    // Monomorphic inline cache - check if same object
    if (cache.lastObject === obj) {
      push(cache.lastValue);  // Cache hit!
      break;
    }
    // Cache miss - update cache
    cache.lastObject = obj;
    cache.lastValue = result;
  }

  // Normal property access...
}
```

**Savings**:
- Skip property lookup on cache hit
- Effective for loops and repeated access

## Optimization 4: Reduce Bounds Checking in Production

**Impact**: 5-10% improvement

### Conditional Safety Checks
```typescript
const BOUNDS_CHECK = process.env.NODE_ENV !== 'production';

case Opcode.LOAD: {
  const idx = instruction[1] as number;
  if (BOUNDS_CHECK && (idx < 0 || idx >= slotValues.length)) {
    return makeError('INVALID_SLOT', `Invalid slot index: ${idx}`);
  }
  push(slotValues[idx]!);
  break;
}
```

**Savings**:
- Eliminates bounds checks in production
- Compiler guarantees valid indices
- Trade-off: Less safe but faster

## Implementation Plan

### Phase 1: Quick Wins (1-2 hours) ⚡
1. Inline stack operations in comparison opcodes
2. Add fast paths for numeric comparisons
3. Apply to: GTE, LTE, GT, LT, EQ, NEQ

**Expected**: 15-20% improvement

### Phase 2: Specialized Opcodes (3-4 hours) ⚡⚡
1. Add fused opcodes (LOAD_GTE_CONST, etc.)
2. Update compiler to detect patterns
3. Update VM to handle new opcodes

**Expected**: Additional 15-20% improvement (30-40% total)

### Phase 3: Inline Caching (2-3 hours)
1. Add cache structure to BytecodeProgram
2. Implement monomorphic inline cache
3. Update compiler to insert cache indices

**Expected**: Additional 10-15% improvement for property-heavy code

## Expected Results

### Current Performance
```
Simple condition: 0.37µs per eval
JSON baseline:    0.004µs per eval
Gap: 98x slower
```

### After Phase 1 (Inline Stack Ops)
```
Simple condition: ~0.30µs per eval (18% faster)
Gap: 75x slower
```

### After Phase 2 (Specialized Opcodes)
```
Simple condition: ~0.22µs per eval (40% faster than current)
Gap: 55x slower
```

### Realistic Target
- **Best case**: 2x improvement → 0.18µs per eval
- **Still 45x slower than JSON**
- **But acceptable for 99% of use cases**

## Trade-offs

✅ **Pros**:
- Meaningful performance improvement
- No breaking changes
- Maintains all features

❌ **Cons**:
- More opcodes to maintain
- Slightly more complex compiler
- Still can't match JSON speed

## Recommendation

**Implement Phase 1 now** - Quick, safe, meaningful improvement.

**Phase 2 can wait** - More complex, diminishing returns.

**Phase 3 is optional** - Only if property access becomes a bottleneck.

The reality: Even with all optimizations, we'll still be 40-50x slower than JSON. That's the fundamental cost of bytecode interpretation.

**Focus instead on**:
- Documentation of performance characteristics
- Guidance on when to use JSON vs Expr
- Highlighting Expr's unique features that justify the overhead
