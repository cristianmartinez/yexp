# Evaluation Framework Comparison

## Three Approaches Implemented

### 1. **Braintrust Eval** (`yexp-eval.ts`)
**Type:** Static evaluation with metrics tracking

```bash
bun run eval
```

**How it works:**
- Runs test suite against current prompt
- Calculates scores (syntax, semantic, efficiency)
- Tracks results in Braintrust dashboard
- **No automatic improvement**

**Best for:**
- Benchmarking different prompts
- A/B testing
- Production monitoring
- Historical tracking

**Output:**
- Metrics dashboard (UI)
- Pass/fail rates
- Score distributions

---

### 2. **Prompt Optimizer** (`prompt-optimizer.ts`)
**Type:** Meta-prompt optimization (DSPy-style)

```bash
bun run optimize
```

**How it works:**
- Evaluates current prompt → gets score
- Generates 3 variations using meta-prompting
- Evaluates all variations
- Selects best by strategy (quality/cost/balanced)
- Repeats

**Best for:**
- Quick prompt tuning
- Cost optimization
- Finding local optima

**Output:**
- Best prompt after N iterations
- Cost/quality tradeoffs
- Iteration history

---

### 3. **RALPH Loop** (`ralph-loop.ts`) ⭐
**Type:** Autonomous improvement with persistent learning

```bash
bun run ralph
```

**How it works:**
```
1. Run evals → get failures
2. AI analyzes failures → identifies patterns
3. AI updates prompt based on analysis
4. Saves learnings to LEARNINGS.md
5. Repeat until target score met
```

**Best for:**
- Long-term optimization
- Understanding failure patterns
- Building institutional knowledge
- Autonomous improvement

**Output:**
- `SYSTEM_PROMPT.txt` - Optimized prompt
- `LEARNINGS.md` - Documented patterns
- `progress.json` - Full iteration history

---

## Key Differences

| Feature | Braintrust | Optimizer | RALPH |
|---------|------------|-----------|-------|
| **Automatic improvement** | ❌ | ✅ | ✅ |
| **Persistent learning** | ❌ | ❌ | ✅ |
| **Failure analysis** | ❌ | ❌ | ✅ |
| **Cost tracking** | ✅ | ✅ | ✅ |
| **UI dashboard** | ✅ | ❌ | ❌ |
| **Iteration strategy** | - | Meta-prompt | Analyze + Fix |
| **Memory** | Stateless | Stateless | Stateful |

---

## RALPH's Advantage

RALPH is inspired by [snarktank/ralph](https://github.com/snarktank/ralph) which uses **persistent memory** to accumulate knowledge:

### Traditional Approach (Optimizer):
```
Iteration 1: Try prompt A → score 0.7
Iteration 2: Try prompt B → score 0.75
Iteration 3: Try prompt C → score 0.72
```
❌ No understanding of **why** scores changed

### RALPH Approach:
```
Iteration 1:
  Score: 0.7
  Analysis: "LLM generates nested calls instead of pipes"
  Learning: "Explicitly forbid nested syntax"
  Prompt update: Added "NEVER use nested calls. Use |>"

Iteration 2:
  Score: 0.85
  Analysis: "Missing dot shorthand in 3/10 tests"
  Learning: "LLM doesn't know dot shorthand syntax"
  Prompt update: Added examples of .property syntax

Iteration 3:
  Score: 0.95 ✅
```
✅ Builds understanding of failure patterns

---

## Which to Use?

### Use **Braintrust** when:
- You need historical tracking
- Multiple people reviewing results
- Production monitoring

### Use **Optimizer** when:
- Quick iteration on prompt quality
- Cost optimization is priority
- You want multiple candidates

### Use **RALPH** when:
- Long-term quality improvement
- Understanding failure modes
- Building reusable knowledge
- Autonomous operation

---

## Example RALPH Output

After running `bun run ralph`:

**SYSTEM_PROMPT.txt**
```
You are a yexp expression generator. Generate valid yexp expressions.

CRITICAL RULES:
1. ALWAYS use pipe syntax (|>) - NEVER nest function calls
2. Use dot shorthand (.property) for lambda parameters
3. For mutations, only modify state paths (not data/env)

Examples:
✅ data.items |> filter(.active)
❌ filter(data.items, (x) => x.active)

✅ data.users |> map(.name)
❌ data.users.map(user => user.name)
...
```

**LEARNINGS.md**
```markdown
## Iteration 1
Score: 0.70 | Passed: 7/10

Root cause: LLM defaults to JavaScript-style nested function calls
Fix: Added explicit "NEVER nest" rule with examples

## Iteration 2
Score: 0.85 | Passed: 8/10

Root cause: Missing dot shorthand in lambda expressions
Fix: Added dot shorthand examples and rule

## Iteration 3
Score: 0.95 | Passed: 10/10

Target achieved! All tests passing.
```

**progress.json**
```json
[
  {
    "iteration": 1,
    "avgScore": 0.70,
    "failures": [...],
    "learnings": "..."
  },
  {
    "iteration": 2,
    "avgScore": 0.85,
    ...
  }
]
```

---

## Running the Full Pipeline

```bash
# 1. Run RALPH to optimize prompt
bun run ralph

# 2. Verify with Braintrust dashboard
bun run eval

# 3. (Optional) Further optimize for cost
bun run optimize
```

This gives you:
- ✅ Optimized prompt (RALPH)
- ✅ Documented learnings (LEARNINGS.md)
- ✅ Historical tracking (Braintrust)
- ✅ Cost analysis (Optimizer)
