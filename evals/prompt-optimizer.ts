/**
 * Automatic Prompt Optimization Loop
 * Iteratively improves prompts based on quality, token usage, and cost
 *
 * Inspired by DSPy and prompt optimization research
 */

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Cost per model (as of 2026)
const MODEL_COSTS = {
  'claude-sonnet-4-5-20250929': { input: 3.0, output: 15.0 }, // per 1M tokens
  'claude-haiku-4-5-20251001': { input: 0.8, output: 4.0 },
  'claude-opus-4-6': { input: 15.0, output: 75.0 },
};

interface EvalResult {
  prompt: string;
  output: string;
  score: number;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  latency: number;
}

interface OptimizationConfig {
  maxIterations: number;
  targetScore: number;
  maxCostPerQuery: number; // in dollars
  model: keyof typeof MODEL_COSTS;
  optimizationStrategy: 'quality' | 'cost' | 'balanced';
}

class PromptOptimizer {
  private config: OptimizationConfig;
  private history: EvalResult[] = [];

  constructor(config: OptimizationConfig) {
    this.config = config;
  }

  /**
   * Calculate cost for a given token usage
   */
  private calculateCost(inputTokens: number, outputTokens: number): number {
    const costs = MODEL_COSTS[this.config.model];
    return (inputTokens / 1_000_000) * costs.input + (outputTokens / 1_000_000) * costs.output;
  }

  /**
   * Evaluate a prompt variant
   */
  async evaluatePrompt(
    systemPrompt: string,
    testCases: Array<{ input: string; expected: string; context: any }>,
  ): Promise<EvalResult> {
    const results: Array<{
      score: number;
      tokens: { input: number; output: number };
      latency: number;
    }> = [];

    for (const testCase of testCases) {
      const startTime = Date.now();

      const message = await anthropic.messages.create({
        model: this.config.model,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `Context: ${JSON.stringify(testCase.context)}\n\nTask: ${testCase.input}\n\nGenerate yexp expression:`,
          },
        ],
      });

      const latency = Date.now() - startTime;
      const response = message.content[0];
      const output = response.type === 'text' ? response.text.trim() : '';

      // Score the output (0-1)
      const score = this.scoreOutput(output, testCase.expected);

      results.push({
        score,
        tokens: {
          input: message.usage.input_tokens,
          output: message.usage.output_tokens,
        },
        latency,
      });
    }

    // Aggregate metrics
    const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
    const totalInputTokens = results.reduce((sum, r) => sum + r.tokens.input, 0);
    const totalOutputTokens = results.reduce((sum, r) => sum + r.tokens.output, 0);
    const avgLatency = results.reduce((sum, r) => sum + r.latency, 0) / results.length;

    return {
      prompt: systemPrompt,
      output: '', // Not applicable for batch eval
      score: avgScore,
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      cost: this.calculateCost(totalInputTokens, totalOutputTokens),
      latency: avgLatency,
    };
  }

  /**
   * Score output vs expected (simple implementation)
   */
  private scoreOutput(output: string, expected: string): number {
    if (output === expected) return 1.0;

    const normalize = (s: string) => s.replace(/\s+/g, ' ').replace(/;$/, '').trim();
    if (normalize(output) === normalize(expected)) return 0.9;

    // Token overlap
    const outputTokens = new Set(output.split(/[\s|>().,]/));
    const expectedTokens = new Set(expected.split(/[\s|>().,]/));
    const intersection = new Set([...outputTokens].filter((t) => expectedTokens.has(t)));
    return intersection.size / expectedTokens.size;
  }

  /**
   * Generate prompt variations using LLM meta-optimization
   */
  async generatePromptVariations(basePrompt: string, feedback: string): Promise<string[]> {
    const metaPrompt = `You are a prompt optimization expert. Given a system prompt and performance feedback, generate 3 improved variations.

Current prompt:
"""
${basePrompt}
"""

Performance feedback:
${feedback}

Generate 3 improved prompt variations that address the feedback. Each should be complete and ready to use.

Output format:
VARIANT 1:
[full prompt text]

VARIANT 2:
[full prompt text]

VARIANT 3:
[full prompt text]`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      messages: [{ role: 'user', content: metaPrompt }],
    });

    const response = message.content[0];
    if (response.type !== 'text') return [];

    // Parse variations
    const variants = response.text
      .split(/VARIANT \d+:/)
      .slice(1)
      .map((v) => v.trim());

    return variants;
  }

  /**
   * Main optimization loop
   */
  async optimize(
    initialPrompt: string,
    testCases: Array<{ input: string; expected: string; context: any }>,
  ): Promise<{ bestPrompt: string; results: EvalResult[] }> {
    let currentPrompt = initialPrompt;
    let bestResult = await this.evaluatePrompt(currentPrompt, testCases);
    this.history.push(bestResult);

    console.log(`\n🔄 Starting prompt optimization...`);
    console.log(`Initial score: ${bestResult.score.toFixed(3)}`);
    console.log(`Initial cost: $${bestResult.cost.toFixed(6)}\n`);

    for (let iteration = 1; iteration <= this.config.maxIterations; iteration++) {
      // Check if target achieved
      if (
        bestResult.score >= this.config.targetScore &&
        bestResult.cost <= this.config.maxCostPerQuery
      ) {
        console.log(`✅ Target achieved at iteration ${iteration}!`);
        break;
      }

      // Generate feedback
      const feedback = this.generateFeedback(bestResult);

      // Generate variations
      console.log(`\n📝 Iteration ${iteration}: Generating variations...`);
      const variations = await this.generatePromptVariations(currentPrompt, feedback);

      // Evaluate each variation
      const variationResults = await Promise.all(
        variations.map((v) => this.evaluatePrompt(v, testCases)),
      );

      // Select best based on strategy
      const bestVariation = this.selectBest(variationResults);
      this.history.push(bestVariation);

      if (this.isBetter(bestVariation, bestResult)) {
        console.log(
          `✨ Improvement found! Score: ${bestVariation.score.toFixed(3)} → Cost: $${bestVariation.cost.toFixed(6)}`,
        );
        bestResult = bestVariation;
        currentPrompt = bestVariation.prompt;
      } else {
        console.log(`⏸️  No improvement this iteration.`);
      }
    }

    console.log(`\n🎯 Optimization complete!`);
    console.log(`Final score: ${bestResult.score.toFixed(3)}`);
    console.log(`Final cost: $${bestResult.cost.toFixed(6)}`);
    console.log(`Iterations: ${this.history.length}`);

    return {
      bestPrompt: bestResult.prompt,
      results: this.history,
    };
  }

  /**
   * Generate performance feedback
   */
  private generateFeedback(result: EvalResult): string {
    const issues: string[] = [];

    if (result.score < this.config.targetScore) {
      issues.push(`Quality below target (${result.score.toFixed(3)} < ${this.config.targetScore})`);
    }

    if (result.cost > this.config.maxCostPerQuery) {
      issues.push(`Cost too high ($${result.cost.toFixed(6)} > $${this.config.maxCostPerQuery})`);
    }

    if (result.outputTokens > 200) {
      issues.push(`Output too verbose (${result.outputTokens} tokens)`);
    }

    return issues.join('\n') || 'Performance acceptable';
  }

  /**
   * Select best result based on optimization strategy
   */
  private selectBest(results: EvalResult[]): EvalResult {
    const { optimizationStrategy } = this.config;

    if (optimizationStrategy === 'quality') {
      return results.reduce((best, r) => (r.score > best.score ? r : best));
    }

    if (optimizationStrategy === 'cost') {
      return results.reduce((best, r) => (r.cost < best.cost ? r : best));
    }

    // Balanced: maximize score / cost ratio
    return results.reduce((best, r) => {
      const currentRatio = r.score / (r.cost || 0.000001);
      const bestRatio = best.score / (best.cost || 0.000001);
      return currentRatio > bestRatio ? r : best;
    });
  }

  /**
   * Check if result A is better than B based on strategy
   */
  private isBetter(a: EvalResult, b: EvalResult): boolean {
    const { optimizationStrategy } = this.config;

    if (optimizationStrategy === 'quality') {
      return a.score > b.score;
    }

    if (optimizationStrategy === 'cost') {
      return a.cost < b.cost && a.score >= b.score * 0.95; // Allow 5% quality drop
    }

    // Balanced
    const aRatio = a.score / (a.cost || 0.000001);
    const bRatio = b.score / (b.cost || 0.000001);
    return aRatio > bRatio;
  }
}

// Example usage
if (import.meta.main) {
  const initialPrompt = `You are a yexp expression generator. Generate valid yexp expressions from natural language descriptions.

Output ONLY the expression, no explanation.`;

  const testCases = [
    {
      input: 'Get all active users',
      expected: 'data.users |> filter(.active)',
      context: { data: { users: 'array' } },
    },
    {
      input: 'Increment counter',
      expected: 'state.count = state.count + 1',
      context: { state: { count: 'number' } },
    },
  ];

  const optimizer = new PromptOptimizer({
    maxIterations: 5,
    targetScore: 0.95,
    maxCostPerQuery: 0.001, // $0.001 per query
    model: 'claude-haiku-4-5-20251001', // Start with cheaper model
    optimizationStrategy: 'balanced',
  });

  const { bestPrompt, results } = await optimizer.optimize(initialPrompt, testCases);

  console.log(`\n📋 Best prompt:\n${bestPrompt}`);
}
