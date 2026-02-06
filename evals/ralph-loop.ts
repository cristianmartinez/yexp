/**
 * RALPH-inspired Autonomous Optimization Loop for Yexp
 *
 * Iteratively improves prompt quality by:
 * 1. Running evals
 * 2. AI analyzes failures
 * 3. AI updates prompt + learnings
 * 4. Repeats until threshold met
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { LLMClient } from "./llm-client";
import { compileExpr } from "@yexp/core";

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
  tokens: {
    input: number;
    output: number;
    total: number;
  };
  timestamp: string;
}

const DATASET: TestCase[] = [
  // Basic filtering & mapping (10 tests)
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
    id: "map-dot-shorthand",
    input: "Extract all product names",
    expected: "data.products |> map(.name)",
    context: { data: { products: "array<{name: string}>" } },
  },
  {
    id: "filter-multiple-conditions",
    input: "Find users who are active and have premium accounts",
    expected: "data.users |> filter(.active && .premium)",
    context: { data: { users: "array<{active: boolean, premium: boolean}>" } },
  },
  {
    id: "map-arithmetic",
    input: "Calculate discounted prices (20% off)",
    expected: "data.items |> map(.price * 0.8)",
    context: { data: { items: "array<{price: number}>" } },
  },
  {
    id: "filter-comparison",
    input: "Get products priced between $50 and $100",
    expected: "data.products |> filter(.price >= 50 && .price <= 100)",
    context: { data: { products: "array<{price: number}>" } },
  },
  {
    id: "unique-values",
    input: "Get unique category names from all products",
    expected: "data.products |> map(.category) |> unique",
    context: { data: { products: "array<{category: string}>" } },
  },
  {
    id: "first-last",
    input: "Get the newest order",
    expected: "data.orders |> last",
    context: { data: { orders: "array<{id: string}>" } },
  },
  {
    id: "reverse-limit",
    input: "Get the last 3 messages",
    expected: "data.messages |> reverse |> limit(3)",
    context: { data: { messages: "array<{text: string}>" } },
  },

  // Sorting & grouping (5 tests)
  {
    id: "sort-descending",
    input: "Sort users by age descending",
    expected: "data.users |> sort(-.age)",
    context: { data: { users: "array<{age: number}>" } },
  },
  {
    id: "sort-ascending",
    input: "Sort products by price ascending",
    expected: "data.products |> sort(.price)",
    context: { data: { products: "array<{price: number}>" } },
  },
  {
    id: "groupby",
    input: "Group items by category",
    expected: "data.items |> groupBy(.category)",
    context: { data: { items: "array<{category: string}>" } },
  },
  {
    id: "groupby-then-count",
    input: "Count items per category",
    expected: "data.items |> groupBy(.category) |> mapEntries((e) => { key: e.key, value: length(e.value) })",
    context: { data: { items: "array<{category: string}>" } },
  },
  {
    id: "uniqueby",
    input: "Get unique users by email",
    expected: "data.users |> uniqueBy(.email)",
    context: { data: { users: "array<{email: string, name: string}>" } },
  },

  // Aggregation & math (5 tests)
  {
    id: "sum-prices",
    input: "Calculate total revenue from all orders",
    expected: "data.orders |> map(.total) |> add",
    context: { data: { orders: "array<{total: number}>" } },
  },
  {
    id: "average-score",
    input: "Calculate average rating",
    expected: "data.reviews |> map(.rating) |> add / length(data.reviews)",
    context: { data: { reviews: "array<{rating: number}>" } },
  },
  {
    id: "min-max",
    input: "Find the cheapest product",
    expected: "data.products |> minBy(.price)",
    context: { data: { products: "array<{price: number, name: string}>" } },
  },
  {
    id: "count-items",
    input: "Count how many tasks are completed",
    expected: "data.tasks |> filter(.completed) |> length",
    context: { data: { tasks: "array<{completed: boolean}>" } },
  },
  {
    id: "percentage",
    input: "Calculate percentage of active users",
    expected: "(data.users |> filter(.active) |> length) / length(data.users) * 100",
    context: { data: { users: "array<{active: boolean}>" } },
  },

  // Optional chaining & nullish coalescing (5 tests)
  {
    id: "optional-chaining",
    input: "Get user name or 'Guest' if not available",
    expected: "state.user?.name ?? 'Guest'",
    context: { state: { user: "object | null" } },
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
    id: "optional-array-access",
    input: "Get first item name or 'No items'",
    expected: "data.items[0]?.name ?? 'No items'",
    context: { data: { items: "array<{name: string}>" } },
  },
  {
    id: "chained-optionals",
    input: "Get company name from user or 'N/A'",
    expected: "state.user?.organization?.company?.name ?? 'N/A'",
    context: { state: { user: "object | null" } },
  },
  {
    id: "optional-with-default-number",
    input: "Get retry count or default to 3",
    expected: "state.config?.retries ?? 3",
    context: { state: { config: "object | null" } },
  },

  // State mutations (5 tests)
  {
    id: "mutation-increment",
    input: "Increment the counter",
    expected: "state.count = state.count + 1",
    context: { state: { count: "number" } },
  },
  {
    id: "mutation-toggle",
    input: "Toggle the loading flag",
    expected: "state.loading = !state.loading",
    context: { state: { loading: "boolean" } },
  },
  {
    id: "mutation-append",
    input: "Add a new item to the list",
    expected: "state.items << data.newItem",
    context: { state: { items: "array" }, data: { newItem: "object" } },
  },
  {
    id: "mutation-object-merge",
    input: "Update user profile with new data",
    expected: "state.user = { ...state.user, ...data.updates }",
    context: { state: { user: "object" }, data: { updates: "object" } },
  },
  {
    id: "mutation-reset",
    input: "Reset the form to initial values",
    expected: "state.form = data.initialForm",
    context: { state: { form: "object" }, data: { initialForm: "object" } },
  },

  // Recursive descent (3 tests)
  {
    id: "recursive-descent",
    input: "Find all email addresses at any depth",
    expected: "data..email",
    context: { data: "object" },
  },
  {
    id: "recursive-descent-filter",
    input: "Find all IDs in the entire data structure",
    expected: "data..id",
    context: { data: "object" },
  },
  {
    id: "recursive-descent-unique",
    input: "Get all unique tag names from nested structure",
    expected: "data..tags |> flatten |> unique",
    context: { data: "object" },
  },

  // String operations (5 tests)
  {
    id: "string-concat",
    input: "Create full name from first and last name",
    expected: "`${state.firstName} ${state.lastName}`",
    context: { state: { firstName: "string", lastName: "string" } },
  },
  {
    id: "string-uppercase",
    input: "Convert category to uppercase",
    expected: "data.category |> toUpperCase",
    context: { data: { category: "string" } },
  },
  {
    id: "string-split-join",
    input: "Convert comma-separated string to array",
    expected: "data.tags |> split(',')",
    context: { data: { tags: "string" } },
  },
  {
    id: "string-trim",
    input: "Remove whitespace from user input",
    expected: "data.input |> trim",
    context: { data: { input: "string" } },
  },
  {
    id: "string-includes",
    input: "Check if description contains the word 'premium'",
    expected: "data.description |> includes('premium')",
    context: { data: { description: "string" } },
  },

  // Object operations (5 tests)
  {
    id: "object-keys",
    input: "Get all setting keys",
    expected: "state.settings |> keys",
    context: { state: { settings: "object" } },
  },
  {
    id: "object-values",
    input: "Get all configuration values",
    expected: "data.config |> values",
    context: { data: { config: "object" } },
  },
  {
    id: "object-pick",
    input: "Extract only name and email from user",
    expected: "state.user |> pick(['name', 'email'])",
    context: { state: { user: "object" } },
  },
  {
    id: "object-has-key",
    input: "Check if user has a phone number",
    expected: "state.user |> has('phone')",
    context: { state: { user: "object" } },
  },
  {
    id: "object-merge",
    input: "Merge default settings with user preferences",
    expected: "{ ...data.defaults, ...state.preferences }",
    context: { data: { defaults: "object" }, state: { preferences: "object" } },
  },

  // Complex chaining (7 tests)
  {
    id: "complex-filter-map-reduce",
    input: "Calculate total value of active items in stock",
    expected: "data.inventory |> filter(.active && .stock > 0) |> map(.price * .stock) |> add",
    context: { data: { inventory: "array<{active: boolean, stock: number, price: number}>" } },
  },
  {
    id: "complex-sort-limit-map",
    input: "Get names of top 3 highest rated products",
    expected: "data.products |> sort(-.rating) |> limit(3) |> map(.name)",
    context: { data: { products: "array<{name: string, rating: number}>" } },
  },
  {
    id: "complex-groupby-count",
    input: "Count orders per status",
    expected: "data.orders |> groupBy(.status) |> mapEntries((e) => { key: e.key, value: length(e.value) })",
    context: { data: { orders: "array<{status: string}>" } },
  },
  {
    id: "complex-nested-filter",
    input: "Find users who have at least one completed task",
    expected: "data.users |> filter((u) => u.tasks |> some(.completed))",
    context: { data: { users: "array<{tasks: array<{completed: boolean}>}>" } },
  },
  {
    id: "complex-flatten-filter",
    input: "Get all tags from all posts that are published",
    expected: "data.posts |> filter(.published) |> map(.tags) |> flatten |> unique",
    context: { data: { posts: "array<{published: boolean, tags: array<string>}>" } },
  },
  {
    id: "complex-reduce",
    input: "Calculate weighted average of scores",
    expected: "data.scores |> reduce((acc, value) => acc + value.score * value.weight, 0) / (data.scores |> map(.weight) |> add)",
    context: { data: { scores: "array<{score: number, weight: number}>" } },
  },
  {
    id: "complex-conditional-map",
    input: "Apply different discounts based on membership level",
    expected: "data.orders |> map(.memberLevel == 'gold' ? .total * 0.8 : .memberLevel == 'silver' ? .total * 0.9 : .total)",
    context: { data: { orders: "array<{total: number, memberLevel: string}>" } },
  },
];

const INITIAL_PROMPT = `You are a yexp expression generator. Generate valid yexp expressions from natural language.

Yexp is an expression language with:
- Context roots: state, data, env
- Pipe operator: |>
- Built-in functions: filter, map, reduce, etc.

Output ONLY the expression, no explanation.`;

// Get model-specific directory
const getModelSlug = () => {
  const model = process.env.DEFAULT_MODEL || "claude-sonnet-4-5-20250929";
  return model
    .replace(/\//g, "-")
    .replace("anthropic-", "")
    .replace("openai-", "")
    .replace("google-", "")
    .replace("meta-llama-", "");
};

const MODEL_SLUG = getModelSlug();
const RESULTS_DIR = `./results/${MODEL_SLUG}`;
const LEARNINGS_FILE = "./LEARNINGS.md"; // Global learnings
const PROGRESS_FILE = `${RESULTS_DIR}/progress.json`;
const PROMPT_FILE = `${RESULTS_DIR}/SYSTEM_PROMPT.txt`;
const DETAILED_RESULTS_DIR = `${RESULTS_DIR}/detailed`;

class RalphLoop {
  private currentPrompt: string;
  private learnings: string[];
  private history: IterationResult[] = [];
  private currentModel: string;

  constructor() {
    this.currentModel = process.env.DEFAULT_MODEL || "claude-sonnet-4-5-20250929";
    // Ensure results directories exist
    if (!existsSync(RESULTS_DIR)) {
      mkdirSync(RESULTS_DIR, { recursive: true });
    }
    if (!existsSync(DETAILED_RESULTS_DIR)) {
      mkdirSync(DETAILED_RESULTS_DIR, { recursive: true });
    }

    this.currentPrompt = this.loadPrompt();
    this.learnings = this.loadLearnings();
  }

  private loadPrompt(): string {
    if (existsSync(PROMPT_FILE)) {
      return readFileSync(PROMPT_FILE, "utf-8");
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
    writeFileSync(PROMPT_FILE, prompt);
  }

  private saveLearnings() {
    writeFileSync(LEARNINGS_FILE, this.learnings.join("\n\n"));
  }

  private saveProgress() {
    writeFileSync(PROGRESS_FILE, JSON.stringify(this.history, null, 2));
  }

  /**
   * Save detailed test results (expected vs generated) for an iteration
   */
  private saveDetailedResults(iteration: number, results: EvalResult[]) {
    const detailedResults = results.map((r) => ({
      testId: r.testCase.id,
      input: r.testCase.input,
      context: r.testCase.context,
      expected: r.testCase.expected,
      generated: r.generated,
      passed: r.passed,
      score: r.score,
      error: r.error,
    }));

    const filename = `${DETAILED_RESULTS_DIR}/iteration-${iteration}.json`;
    writeFileSync(filename, JSON.stringify(detailedResults, null, 2));
  }

  /**
   * Generate expression using current prompt
   */
  async generate(
    task: string,
    context: Record<string, any>
  ): Promise<{ text: string; tokens: { input: number; output: number } }> {
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

    return {
      text: result.text.trim(),
      tokens: {
        input: result.usage.inputTokens,
        output: result.usage.outputTokens,
      },
    };
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
  async runEval(): Promise<{
    results: EvalResult[];
    tokens: { input: number; output: number };
  }> {
    const results: EvalResult[] = [];
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    console.log(`Running ${DATASET.length} tests...`);

    for (let i = 0; i < DATASET.length; i++) {
      const testCase = DATASET[i];
      if (!testCase) continue;

      process.stdout.write(`  [${i + 1}/${DATASET.length}] ${testCase.id}: `);

      try {
        const generated = await this.generate(testCase.input, testCase.context);

        // Validate that the generated expression is valid yexp syntax
        let compilationError: string | undefined;
        try {
          compileExpr(generated.text);
        } catch (compileErr) {
          compilationError = compileErr instanceof Error ? compileErr.message : "Compilation failed";
        }

        const score = compilationError ? 0 : this.scoreExpression(generated.text, testCase.expected);
        const passed = !compilationError && score >= 0.9;

        totalInputTokens += generated.tokens.input;
        totalOutputTokens += generated.tokens.output;

        // Real-time feedback
        if (passed) {
          console.log(`✓ (${(score * 100).toFixed(0)}%)`);
        } else {
          if (compilationError) {
            console.log(`✗ COMPILE ERROR`);
            console.log(`    Expected: ${testCase.expected}`);
            console.log(`    Got:      ${generated.text}`);
            console.log(`    Error:    ${compilationError}`);
          } else {
            console.log(`✗ (${(score * 100).toFixed(0)}%)`);
            console.log(`    Expected: ${testCase.expected}`);
            console.log(`    Got:      ${generated.text}`);
          }
        }

        results.push({
          testCase,
          generated: generated.text,
          passed,
          score,
          error: compilationError,
        });
      } catch (error) {
        console.log(`✗ ERROR`);
        console.log(`    ${error instanceof Error ? error.message : "Unknown error"}`);

        results.push({
          testCase,
          generated: "",
          passed: false,
          score: 0,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return {
      results,
      tokens: { input: totalInputTokens, output: totalOutputTokens },
    };
  }

  /**
   * AI analyzes failures and generates improvement suggestions
   */
  async analyzeFailures(failures: EvalResult[]): Promise<{
    analysis: string;
    tokens: { input: number; output: number };
  }> {
    if (failures.length === 0) {
      return {
        analysis: "All tests passing - no failures to analyze.",
        tokens: { input: 0, output: 0 },
      };
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

    return {
      analysis: result.text,
      tokens: {
        input: result.usage.inputTokens,
        output: result.usage.outputTokens,
      },
    };
  }

  /**
   * AI generates improved prompt based on analysis
   */
  async improvePrompt(analysis: string): Promise<{
    prompt: string;
    tokens: { input: number; output: number };
  }> {
    // Load the actual yexp spec to constrain improvements
    const yexpSpec = this.loadYexpSpec();

    const improvementPrompt = `You are optimizing a system prompt for yexp expression generation.

Current prompt:
"""
${this.currentPrompt}
"""

Failure analysis:
${analysis}

CRITICAL CONSTRAINTS - The yexp specification:
"""
${yexpSpec}
"""

Generate an IMPROVED system prompt that addresses the identified issues. The prompt MUST:
- Fix the root causes identified in the failure analysis
- Add specific examples for common mistakes
- Be clear and unambiguous
- Maintain all necessary context about yexp
- **ONLY use syntax and functions that exist in the yexp specification above**
- **NEVER invent new syntax, operators, or functions**
- **Teach how to use actual yexp features correctly, not imaginary ones**

If a failure can't be fixed with existing yexp features, explain the limitation rather than inventing syntax.

Output ONLY the improved prompt text, no explanations.`;

    const result = await llm.generate({
      messages: [{ role: "user", content: improvementPrompt }],
      maxTokens: 4096,
    });

    return {
      prompt: result.text.trim() || this.currentPrompt,
      tokens: {
        input: result.usage.inputTokens,
        output: result.usage.outputTokens,
      },
    };
  }

  /**
   * Load the yexp spec to constrain prompt improvements
   */
  private loadYexpSpec(): string {
    const specPath = "../docs/spec.md";
    try {
      if (existsSync(specPath)) {
        // Return a concise summary of key features
        return `
Yexp Core Syntax:
- Context roots: state, data, env
- Pipe operator: |> (for chaining)
- Operators: +, -, *, /, %, ==, !=, <, >, <=, >=, &&, ||, !
- Optional chaining: ?. (safe access)
- Nullish coalescing: ?? (fallback)
- Recursive descent: .. (find properties at any depth)
- Assignment: = (state only)

Lambda Syntax (for filter/map/reduce/etc):
- Arrow function: (x) => x.price > 100
- Dot shorthand: .price > 100
- NO @ syntax - use dot shorthand or arrow functions only

Built-in Functions:
Type/Inspection: toString(x), type(x), length(x)
Math: round(x,n), floor(x), ceil(x), abs(x), min(...), max(...), sqrt(x), pow(x,n), sin/cos/tan/log/exp
String: toLowerCase(s), toUpperCase(s), trim(s), startsWith(s,pre), endsWith(s,suf), split(s,d), replace(s,x,y), substring(s,i,j), includes(s,x)
Array: first(a), last(a), limit(a,n), join(a,sep), add(a), unique(a), reverse(a), flatten(a)
Object: keys(o), values(o), entries(o), has(o,k), pick(o,ks), del(o,k)
Higher-order: map(a,fn), filter(a,fn), find(a,fn), reduce(a,fn,init), every(a,fn), some(a,fn), sort(a,cmp), groupBy(a,fn), uniqueBy(a,fn), minBy/maxBy(a,fn)

NO regex support, NO is.* type checking functions
`;
      }
    } catch (error) {
      console.warn("Could not load yexp spec, using basic constraints");
    }

    // Fallback if spec file not found
    return `
Yexp uses:
- Dot shorthand for lambdas: .property
- Arrow functions: (x) => expression
- NO @ syntax for current item
- type(x) for type checking (returns "string", "number", etc)
- NO is.* functions
- NO regex support
`;
  }

  /**
   * Main RALPH loop
   */
  async run(maxIterations = 10, targetScore = 0.95) {
    console.log("🚀 Starting RALPH optimization loop...");
    console.log(`📁 Model: ${MODEL_SLUG}`);
    console.log(`📂 Results: ${RESULTS_DIR}\n`);

    for (let i = 1; i <= maxIterations; i++) {
      console.log(`\n${"=".repeat(60)}`);
      console.log(`📊 Iteration ${i}/${maxIterations}`);
      console.log("=".repeat(60));

      // Run evals
      console.log("\n🔬 Running evaluations...");
      const evalResult = await this.runEval();
      const { results, tokens: evalTokens } = evalResult;

      // Calculate metrics
      const passed = results.filter((r) => r.passed).length;
      const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
      const failures = results.filter((r) => !r.passed);

      console.log(`✅ Passed: ${passed}/${results.length}`);
      console.log(`📈 Avg Score: ${avgScore.toFixed(3)}`);
      console.log(`❌ Failures: ${failures.length}`);

      // Track tokens for this iteration
      let totalInputTokens = evalTokens.input;
      let totalOutputTokens = evalTokens.output;

      // Check if target met (early exit - no analysis needed)
      if (avgScore >= targetScore) {
        const cost = llm.calculateCost(this.currentModel, totalInputTokens, totalOutputTokens);
        console.log(`\n🎯 Target score achieved! (${avgScore.toFixed(3)} >= ${targetScore})`);
        console.log(`💰 Cost: $${cost.toFixed(6)} | Tokens: ${totalInputTokens + totalOutputTokens}`);

        const iteration: IterationResult = {
          iteration: i,
          prompt: this.currentPrompt,
          totalTests: results.length,
          passed,
          avgScore,
          failures,
          learnings: "Target achieved",
          cost,
          tokens: {
            input: totalInputTokens,
            output: totalOutputTokens,
            total: totalInputTokens + totalOutputTokens,
          },
          timestamp: new Date().toISOString(),
        };
        this.history.push(iteration);
        this.saveProgress();
        this.saveDetailedResults(i, results);
        break;
      }

      // AI analyzes failures
      console.log("\n🤔 AI analyzing failures...");
      const analysisResult = await this.analyzeFailures(failures);
      const { analysis, tokens: analysisTokens } = analysisResult;
      totalInputTokens += analysisTokens.input;
      totalOutputTokens += analysisTokens.output;

      console.log("\n📝 Analysis:");
      console.log(analysis.substring(0, 300) + "...");

      // AI improves prompt
      console.log("\n✨ AI improving prompt...");
      const improvementResult = await this.improvePrompt(analysis);
      const { prompt: improvedPrompt, tokens: improvementTokens } = improvementResult;
      totalInputTokens += improvementTokens.input;
      totalOutputTokens += improvementTokens.output;

      // Calculate cost
      const cost = llm.calculateCost(this.currentModel, totalInputTokens, totalOutputTokens);

      // Update learnings
      const learning = `## Iteration ${i} (${new Date().toISOString()})
Score: ${avgScore.toFixed(3)} | Passed: ${passed}/${results.length}
Cost: $${cost.toFixed(6)} | Tokens: ${totalInputTokens + totalOutputTokens}

${analysis}

Prompt updated.`;

      this.learnings.push(learning);
      this.currentPrompt = improvedPrompt;

      // Save iteration result
      const iteration: IterationResult = {
        iteration: i,
        prompt: this.currentPrompt,
        totalTests: results.length,
        passed,
        avgScore,
        failures,
        learnings: analysis,
        cost,
        tokens: {
          input: totalInputTokens,
          output: totalOutputTokens,
          total: totalInputTokens + totalOutputTokens,
        },
        timestamp: new Date().toISOString(),
      };

      this.history.push(iteration);
      this.savePrompt(improvedPrompt);
      this.saveLearnings();
      this.saveProgress();
      this.saveDetailedResults(i, results);

      console.log(`💰 Iteration cost: $${cost.toFixed(6)} | Tokens: ${totalInputTokens + totalOutputTokens}`);

      console.log("\n💾 State saved. Prompt updated for next iteration.");
    }

    console.log("\n" + "=".repeat(60));
    console.log("🏁 Optimization complete!");
    console.log("=".repeat(60));

    const finalResult = this.history[this.history.length - 1];
    const totalCost = this.history.reduce((sum, iter) => sum + iter.cost, 0);
    const totalTokens = this.history.reduce(
      (sum, iter) => sum + iter.tokens.total,
      0
    );

    console.log(`\nFinal Score: ${finalResult.avgScore.toFixed(3)}`);
    console.log(`Final Pass Rate: ${finalResult.passed}/${finalResult.totalTests}`);
    console.log(`Total Iterations: ${this.history.length}`);
    console.log(`\n💰 Total Cost: $${totalCost.toFixed(6)}`);
    console.log(`📊 Total Tokens: ${totalTokens.toLocaleString()}`);
    console.log(`   Input: ${this.history.reduce((sum, iter) => sum + iter.tokens.input, 0).toLocaleString()}`);
    console.log(`   Output: ${this.history.reduce((sum, iter) => sum + iter.tokens.output, 0).toLocaleString()}`);
    console.log(`\nPrompt saved to: ${PROMPT_FILE}`);
    console.log(`Learnings saved to: ${LEARNINGS_FILE}`);
    console.log(`Progress saved to: ${PROGRESS_FILE}`);
    console.log(`Detailed results saved to: ${DETAILED_RESULTS_DIR}/`);
  }
}

// Run if executed directly
if (import.meta.main) {
  const ralph = new RalphLoop();
  await ralph.run(10, 0.95);
}

export { RalphLoop };
