# Yexp LLM Evaluation Framework

Comprehensive evaluation and optimization framework for testing LLM generation of yexp expressions.

## Setup

```bash
# Set your API key
export ANTHROPIC_API_KEY="your-key-here"

# Install dependencies
bun install

# Run basic evaluation
bun run yexp-eval.ts

# Run prompt optimization
bun run prompt-optimizer.ts
```

## Frameworks Compared

### 1. **Braintrust** ⭐ (Our Choice)
- **Best for:** Production evals with UI
- **Pros:** TypeScript-native, great visualization, tracks history
- **Cons:** Requires account (free tier available)
- **Use case:** Standard evaluation with metrics tracking

### 2. **DSPy** (Stanford)
- **Best for:** Automatic prompt optimization
- **Pros:** Research-backed, powerful optimization
- **Cons:** Python-only, steeper learning curve

### 3. **Custom Loop** (Our Implementation)
- **Best for:** Full control over optimization strategy
- **Pros:** No dependencies, cost-aware, strategy-flexible

## Evaluation Metrics

| Metric | Description | Target |
|--------|-------------|--------|
| **syntax_valid** | Expression parses without errors | 100% |
| **semantic_correct** | Output matches expected behavior | >95% |
| **token_efficient** | Concise generation (low token count) | <200 tokens |
| **exact_match** | Perfect match with expected output | >80% |
| **cost_per_query** | Total cost including input/output | <$0.001 |

## RLHF-Style Optimization Loop

The `prompt-optimizer.ts` implements an automatic improvement cycle:

1. **Evaluate** → measure score, cost, tokens
2. **Generate feedback** → identify issues
3. **Meta-optimize** → LLM improves its own prompt
4. **Select best** → by quality, cost, or balanced
5. **Repeat** → until target achieved

## Resources

- [Braintrust Docs](https://www.braintrust.dev/docs)
- [DSPy Paper](https://arxiv.org/abs/2310.03714)
- [RALPH Framework](https://github.com/snarktank/ralph)
