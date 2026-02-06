/**
 * RALPH-inspired Autonomous Optimization Loop for Yexp
 *
 * Iteratively improves prompt quality by:
 * 1. Running evals
 * 2. AI analyzes failures
 * 3. AI updates prompt + learnings
 * 4. Repeats until threshold met
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { LLMClient } from "./llm-client";

const llm = new LLMClient();

interface TestCase {
  id: string;
  input: string;
  expected: string;
  context: Record<string, any>;
}

interface EvalResult {
  testCase: TestCase;
  generated: string;
  passed: boolean;
  score: number;
  error?: string;
}

interface IterationResult {
  iteration: number;
  prompt: string;
  totalTests: number;
  passed: number;
  avgScore: number;
  failures: EvalResult[];
  learnings: string;
  cost: number;
  timestamp: string;
}

const DATASET: TestCase[] = [
  {
    id: "filter-active",
    input: "Get all active users",
    expected: "data.users |> filter(.active)",
    context: { data: { users: "array<{active: boolean, name: string}>" } },
  },
  {
    id: "filter-map-chain",
    input: "Calculate total price for items over $100",
    expected: "data.items |> filter(.price > 100) |> map(.price) |> add",
    context: { data: { items: "array<{price: number, name: string}>" } },
  },
  {
    id: "limit",
    input: "Get the first 5 premium users",
    expected: "data.users |> filter(.premium) |> limit(5)",
    context: { data: { users: "array<{premium: boolean}>" } },
  },
  {
    id: "mutation-increment",
    input: "Increment the counter",
    expected: "state.count = state.count + 1",
    context: { state: { count: "number" } },
  },
  {
    id: "optional-chaining",
    input: "Get user name or 'Guest' if not available",
    expected: "state.user?.name ?? 'Guest'",
    context: { state: { user: "object | null" } },
  },
  {
    id: "recursive-descent",
    input: "Find all email addresses at any depth",
    expected: "data..email",
    context: { data: "object" },
  },
  {
    id: "groupby",
    input: "Group items by category",
    expected: "data.items |> groupBy(.category)",
    context: { data: { items: "array<{category: string}>" } },
  },
  {
    id: "sort-lambda",
    input: "Sort users by age descending",
    // Accept both simple and lambda syntax for single-property numeric sort
    expected: "data.users |> sort(-.age)", // or: sort((a, b) => b.age - a.age)
    context: { data: { users: "array<{age: number}>" } },
  },
  {
    id: "nested-safe-access",
    input: "Get user profile theme setting with fallback to 'light'",
    expected: "state.user?.profile?.settings?.theme ?? 'light'",
    context: {
      state: {
        user: {
          type: "object | null",
          shape: "{ profile?: { settings?: { theme?: string } } }",
        },
      },
    },
  },
  {
    id: "map-dot-shorthand",
    input: "Extract all product names",
    expected: "data.products |> map(.name)",
    context: { data: { products: "array<{name: string}>" } },
  },
];

const INITIAL_PROMPT = `You are a yexp expression generator. Generate valid yexp expressions from natural language.

Yexp is an expression language with:
- Context roots: state, data, env
- Pipe operator: |>
- Built-in functions: filter, map, reduce, etc.

Output ONLY the expression, no explanation.`;

const LEARNINGS_FILE = "./LEARNINGS.md";
const PROGRESS_FILE = "./progress.json";

class RalphLoop {
  private currentPrompt: string;
  private learnings: string[];
  private history: IterationResult[] = [];

  constructor() {
    this.currentPrompt = this.loadPrompt();
    this.learnings = this.loadLearnings();
  }

  private loadPrompt(): string {
    if (existsSync("./SYSTEM_PROMPT.txt")) {
      return readFileSync("./SYSTEM_PROMPT.txt", "utf-8");
    }
    return INITIAL_PROMPT;
  }

  private loadLearnings(): string[] {
    if (existsSync(LEARNINGS_FILE)) {
      const content = readFileSync(LEARNINGS_FILE, "utf-8");
      return content.split("\n").filter(Boolean);
    }
    return [];
  }

  private savePrompt(prompt: string) {
    writeFileSync("./SYSTEM_PROMPT.txt", prompt);
  }

  private saveLearnings() {
    writeFileSync(LEARNINGS_FILE, this.learnings.join("\n\n"));
  }

  private saveProgress() {
    writeFileSync(PROGRESS_FILE, JSON.stringify(this.history, null, 2));
  }

  /**
   * Generate expression using current prompt
   */
  async generate(task: string, context: Record<string, any>): Promise<string> {
    const result = await llm.generate({
      system: this.currentPrompt,
      messages: [
        {
          role: "user",
          content: `Context: ${JSON.stringify(context)}\n\nTask: ${task}\n\nExpression:`,
        },
      ],
      maxTokens: 512,
    });

    return result.text.trim();
  }

  /**
   * Score generated expression vs expected
   */
  private scoreExpression(generated: string, expected: string): number {
    if (generated === expected) return 1.0;

    const normalize = (s: string) =>
      s.replace(/\s+/g, " ").replace(/;$/, "").trim();
    if (normalize(generated) === normalize(expected)) return 0.95;

    // Token overlap
    const genTokens = new Set(generated.split(/[\s|>().,]/));
    const expTokens = new Set(expected.split(/[\s|>().,]/));
    const intersection = new Set([...genTokens].filter((t) => expTokens.has(t)));

    return intersection.size / expTokens.size;
  }

  /**
   * Run evaluation on full dataset
   */
  async runEval(): Promise<EvalResult[]> {
    const results: EvalResult[] = [];

    for (const testCase of DATASET) {
      try {
        const generated = await this.generate(testCase.input, testCase.context);
        const score = this.scoreExpression(generated, testCase.expected);
        const passed = score >= 0.9;

        results.push({
          testCase,
          generated,
          passed,
          score,
        });
      } catch (error) {
        results.push({
          testCase,
          generated: "",
          passed: false,
          score: 0,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return results;
  }

  /**
   * AI analyzes failures and generates improvement suggestions
   */
  async analyzeFailures(failures: EvalResult[]): Promise<string> {
    if (failures.length === 0) {
      return "All tests passing - no failures to analyze.";
    }

    const failureReport = failures
      .map(
        (f) => `
Test: ${f.testCase.id}
Input: "${f.testCase.input}"
Expected: ${f.testCase.expected}
Generated: ${f.generated}
Score: ${f.score.toFixed(2)}
${f.error ? `Error: ${f.error}` : ""}
`
      )
      .join("\n---\n");

    const analysisPrompt = `You are analyzing failures in yexp expression generation. Review the failures and identify patterns.

Current system prompt:
"""
${this.currentPrompt}
"""

Failures:
${failureReport}

Existing learnings:
${this.learnings.slice(-5).join("\n")}

Analyze the failures and provide:
1. **Root causes**: What patterns of mistakes are happening?
2. **Specific fixes**: What exact changes to the prompt would fix these?
3. **Examples needed**: What examples should be added to prevent these errors?

Be specific and actionable. Focus on the most impactful changes.`;

    const result = await llm.generate({
      messages: [{ role: "user", content: analysisPrompt }],
      maxTokens: 2048,
    });

    return result.text;
  }

  /**
   * AI generates improved prompt based on analysis
   */
  async improvePrompt(analysis: string): Promise<string> {
    const improvementPrompt = `You are optimizing a system prompt for yexp expression generation.

Current prompt:
"""
${this.currentPrompt}
"""

Failure analysis:
${analysis}

Generate an IMPROVED system prompt that addresses the identified issues. The prompt should:
- Fix the root causes identified
- Add specific examples for common mistakes
- Be clear and unambiguous
- Maintain all necessary context about yexp

Output ONLY the improved prompt text, no explanations.`;

    const result = await llm.generate({
      messages: [{ role: "user", content: improvementPrompt }],
      maxTokens: 4096,
    });

    return result.text.trim() || this.currentPrompt;
  }

  /**
   * Main RALPH loop
   */
  async run(maxIterations = 10, targetScore = 0.95) {
    console.log("🚀 Starting RALPH optimization loop...\n");

    for (let i = 1; i <= maxIterations; i++) {
      console.log(`\n${"=".repeat(60)}`);
      console.log(`📊 Iteration ${i}/${maxIterations}`);
      console.log("=".repeat(60));

      // Run evals
      console.log("\n🔬 Running evaluations...");
      const results = await this.runEval();

      // Calculate metrics
      const passed = results.filter((r) => r.passed).length;
      const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
      const failures = results.filter((r) => !r.passed);

      console.log(`✅ Passed: ${passed}/${results.length}`);
      console.log(`📈 Avg Score: ${avgScore.toFixed(3)}`);
      console.log(`❌ Failures: ${failures.length}`);

      // Save iteration result
      const iteration: IterationResult = {
        iteration: i,
        prompt: this.currentPrompt,
        totalTests: results.length,
        passed,
        avgScore,
        failures,
        learnings: "",
        cost: 0, // TODO: track actual cost
        timestamp: new Date().toISOString(),
      };

      // Check if target met
      if (avgScore >= targetScore) {
        console.log(`\n🎯 Target score achieved! (${avgScore.toFixed(3)} >= ${targetScore})`);
        iteration.learnings = "Target achieved";
        this.history.push(iteration);
        this.saveProgress();
        break;
      }

      // AI analyzes failures
      console.log("\n🤔 AI analyzing failures...");
      const analysis = await this.analyzeFailures(failures);
      console.log("\n📝 Analysis:");
      console.log(analysis.substring(0, 300) + "...");

      // AI improves prompt
      console.log("\n✨ AI improving prompt...");
      const improvedPrompt = await this.improvePrompt(analysis);

      // Update learnings
      const learning = `## Iteration ${i} (${new Date().toISOString()})
Score: ${avgScore.toFixed(3)} | Passed: ${passed}/${results.length}

${analysis}

Prompt updated.`;

      this.learnings.push(learning);
      this.currentPrompt = improvedPrompt;

      // Save state
      iteration.learnings = analysis;
      this.history.push(iteration);
      this.savePrompt(improvedPrompt);
      this.saveLearnings();
      this.saveProgress();

      console.log("\n💾 State saved. Prompt updated for next iteration.");
    }

    console.log("\n" + "=".repeat(60));
    console.log("🏁 Optimization complete!");
    console.log("=".repeat(60));

    const finalResult = this.history[this.history.length - 1];
    console.log(`\nFinal Score: ${finalResult.avgScore.toFixed(3)}`);
    console.log(`Final Pass Rate: ${finalResult.passed}/${finalResult.totalTests}`);
    console.log(`Total Iterations: ${this.history.length}`);
    console.log(`\nPrompt saved to: ./SYSTEM_PROMPT.txt`);
    console.log(`Learnings saved to: ${LEARNINGS_FILE}`);
    console.log(`Progress saved to: ${PROGRESS_FILE}`);
  }
}

// Run if executed directly
if (import.meta.main) {
  const ralph = new RalphLoop();
  await ralph.run(10, 0.95);
}

export { RalphLoop };
