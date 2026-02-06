# Token & Cost Analysis for Yexp Eval System

## System Prompt Token Count

**SYSTEM_PROMPT.txt:**
- Characters: 5,028
- Words: 663
- **Estimated tokens: ~1,100 tokens**

Using 1 token ≈ 4 characters (industry standard for Claude)

---

## Per-Generation Cost Breakdown

### Expression Generation (10 test cases per iteration)

**Input tokens:**
- System prompt: ~1,100 tokens
- User message (context + task): ~150 tokens
- **Total input: ~1,250 tokens**

**Output tokens:**
- Generated expression: ~35 tokens (short, 1-line expression)

**Cost per generation:**

| Model | Input Cost | Output Cost | Total per Gen | 10 Tests |
|-------|-----------|-------------|---------------|----------|
| **Claude Sonnet 4.5** | $0.00375 | $0.000525 | **$0.0043** | **$0.043** |
| **Claude Haiku 4.5** | $0.001 | $0.00014 | **$0.0011** | **$0.011** |
| **GPT-4o** (via OpenRouter) | $0.003125 | $0.00035 | **$0.0035** | **$0.035** |
| **Gemini 2.0 Flash** | $0.00 | $0.00 | **$0.00** | **$0.00** |

---

## RALPH Loop Cost Per Iteration

Each RALPH iteration includes:
1. **10 test generations** (expression generation)
2. **1 failure analysis** (longer output ~1,000 tokens)
3. **1 prompt improvement** (very long output ~2,000 tokens)

### Cost per iteration:

| Step | Input Tokens | Output Tokens | Sonnet Cost | Haiku Cost |
|------|--------------|---------------|-------------|------------|
| 10 test gens | 12,500 | 350 | $0.043 | $0.011 |
| Analysis | 2,500 | 1,000 | $0.023 | $0.006 |
| Improvement | 3,000 | 2,000 | $0.039 | $0.010 |
| **Total/iteration** | **18,000** | **3,350** | **$0.105** | **$0.027** |

---

## Full RALPH Run (7 iterations to 95% target)

**Actual run from progress.json:**
- Iterations: 7
- Test generations: 70 (10 × 7)
- Analysis calls: 7
- Improvement calls: 7

### Total Cost:

| Model | Cost/Iteration | Total (7 iters) |
|-------|----------------|-----------------|
| **Claude Sonnet 4.5** | $0.105 | **$0.74** |
| **Claude Haiku 4.5** | $0.027 | **$0.19** |
| **GPT-4o** | $0.083 | **$0.58** |
| **Gemini 2.0 Flash** | $0.00 | **$0.00** |

---

## Cost Optimization Strategies

### 1. Use Haiku for Test Generation

```typescript
// In ralph-loop.ts
async generate(task: string, context: Record<string, any>) {
  const result = await llm.generate({
    model: "claude-haiku-4-5-20251001",  // Cheaper!
    system: this.currentPrompt,
    messages: [...]
  });
}
```

**Savings:** $0.74 → $0.19 (74% reduction)

---

### 2. Use Sonnet Only for Analysis/Improvement

```typescript
async analyzeFailures(failures: EvalResult[]) {
  const result = await llm.generate({
    model: "claude-sonnet-4-5-20250929",  // Better reasoning
    messages: [...]
  });
}
```

**Hybrid cost:**
- Test gen (70 × Haiku): 70 × $0.0011 = $0.077
- Analysis (7 × Sonnet): 7 × $0.023 = $0.161
- Improvement (7 × Sonnet): 7 × $0.039 = $0.273
- **Total: $0.51** (31% savings)

---

### 3. Cache System Prompt (if supported)

Some providers cache repeated system prompts:

```typescript
{
  system: [
    {
      type: "text",
      text: SYSTEM_PROMPT,
      cache_control: { type: "ephemeral" }  // Cache this!
    }
  ]
}
```

**Savings:** ~90% reduction on input tokens after first call

**New cost per generation:**
- Cached input: ~150 tokens (only user message)
- Savings: $0.0043 → $0.001 per generation

---

### 4. Use Free Models for Initial Iterations

**Gemini 2.0 Flash Experimental:**
- Cost: $0.00 (free during preview)
- Speed: Very fast
- Quality: Good for simple tests

**Strategy:**
- Iterations 1-5: Gemini (free, find obvious issues)
- Iterations 6-10: Sonnet (expensive, fine-tune)

**Savings:** ~60% reduction

---

## Comparison: Single Eval vs RALPH Loop

### One-Time Eval (No Optimization)
```bash
bun run eval  # Just test with current prompt
```
- Cost: 10 generations = **$0.043** (Sonnet)
- Pass rate: ~40% (based on iteration 1)

### RALPH Loop (7 iterations to 95%)
```bash
bun run ralph  # Optimize prompt automatically
```
- Cost: **$0.74** (Sonnet) or **$0.19** (Haiku)
- Pass rate: **95%** (proven improvement)

**ROI:** Spend $0.74 once to get a prompt that achieves 95% accuracy forever.

---

## Production Cost Estimates

### Scenario: Generating 1,000 expressions

**With optimized prompt (95% accuracy):**
- Successful generations: 950
- Retries needed: ~50
- Total generations: 1,000 + 50 = 1,050
- **Cost:** 1,050 × $0.0043 = **$4.52** (Sonnet)

**Without optimized prompt (40% accuracy):**
- Successful generations: 400
- Retries needed: 600 × 2.5 (avg retries) = 1,500
- Total generations: 1,000 + 1,500 = 2,500
- **Cost:** 2,500 × $0.0043 = **$10.75** (Sonnet)

**RALPH savings in production:** $10.75 - $4.52 = **$6.23 per 1,000 generations**

**Break-even:** After 120 generations, RALPH pays for itself!

---

## Recommended Configuration

### Development (RALPH optimization)
```bash
export DEFAULT_MODEL="claude-haiku-4-5-20251001"  # $0.19 for full run
export MAX_ITERATIONS="10"
export TARGET_SCORE="0.95"
```

### Production (using optimized prompt)
```bash
export DEFAULT_MODEL="claude-haiku-4-5-20251001"  # $0.0011 per gen
# Or use Gemini for even lower cost (free)
```

### Quality-Critical (high stakes)
```bash
export DEFAULT_MODEL="claude-sonnet-4-5-20250929"  # $0.0043 per gen
# Better reasoning for complex expressions
```

---

## Summary

**System Prompt:** ~1,100 tokens
**Cost per generation:** $0.0011 - $0.0043 (depending on model)
**Full RALPH run:** $0.19 - $0.74 (7 iterations)

**Best value:**
1. **Haiku for RALPH optimization:** $0.19 total
2. **Cache system prompt:** Save 90% on subsequent calls
3. **Haiku for production:** $0.0011 per generation

**The optimized prompt pays for itself after just 120 production generations!** 🎯
