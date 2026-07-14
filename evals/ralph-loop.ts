/**
 * RALPH-inspired Autonomous Optimization Loop for Yexp
 *
 * Iteratively improves prompt quality by:
 * 1. Running evals
 * 2. AI analyzes failures
 * 3. AI updates prompt + learnings
 * 4. Repeats until threshold met
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { LLMClient } from './llm-client';
import { compile, run } from '@cristianmartinez/yexp';
import { loadDataset, type TestCase } from './dataset-loader';

const llm = new LLMClient();

/**
 * Deep equality check for comparing expression outputs
 */
function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((val, i) => deepEqual(val, b[i]));
  }

  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a).sort();
    const keysB = Object.keys(b).sort();
    if (keysA.length !== keysB.length) return false;
    if (!keysA.every((key, i) => key === keysB[i])) return false;
    return keysA.every((key) => deepEqual(a[key], b[key]));
  }

  return false;
}

interface EvalResult {
  testCase: TestCase;
  generated: string;
  generatedCompiles: boolean;
  generatedResult?: any;
  passed: boolean;
  score: number;
  compilationError?: string;
  runtimeError?: string;
  resultMatch: boolean;
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

// DATASET has been moved to dataset-with-results.json
// Load using: loadDataset() from ./dataset-loader

const INITIAL_PROMPT = `You are a yexp expression generator. Generate valid yexp expressions from natural language.

Yexp is an expression language with:
- Context roots: state, data, env
- Pipe operator: |>
- Built-in functions: filter, map, reduce, etc.

Output ONLY the expression, no explanation.`;

// Get model-specific directory
const getModelSlug = () => {
  const model = process.env.DEFAULT_MODEL || 'claude-sonnet-4-5-20250929';
  return model
    .replace(/\//g, '-')
    .replace('anthropic-', '')
    .replace('openai-', '')
    .replace('google-', '')
    .replace('meta-llama-', '');
};

const MODEL_SLUG = getModelSlug();
const RESULTS_DIR = `./results/${MODEL_SLUG}`;
const LEARNINGS_FILE = './LEARNINGS.md'; // Global learnings
const PROGRESS_FILE = `${RESULTS_DIR}/progress.json`;
const PROMPT_FILE = `${RESULTS_DIR}/SYSTEM_PROMPT.txt`;
const DETAILED_RESULTS_DIR = `${RESULTS_DIR}/detailed`;

class RalphLoop {
  private currentPrompt: string;
  private learnings: string[];
  private history: IterationResult[] = [];
  private currentModel: string;
  private dataset: TestCase[];

  constructor() {
    this.currentModel = process.env.DEFAULT_MODEL || 'claude-sonnet-4-5-20250929';

    // Load dataset from JSON
    this.dataset = loadDataset();
    console.log(`📊 Loaded ${this.dataset.length} test cases from dataset-with-results.json`);

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
      return readFileSync(PROMPT_FILE, 'utf-8');
    }
    return INITIAL_PROMPT;
  }

  private loadLearnings(): string[] {
    if (existsSync(LEARNINGS_FILE)) {
      const content = readFileSync(LEARNINGS_FILE, 'utf-8');
      return content.split('\n').filter(Boolean);
    }
    return [];
  }

  private savePrompt(prompt: string) {
    writeFileSync(PROMPT_FILE, prompt);
  }

  private saveLearnings() {
    writeFileSync(LEARNINGS_FILE, this.learnings.join('\n\n'));
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
      expectedResult: r.testCase.expectedResult,
      generated: r.generated,
      generatedCompiles: r.generatedCompiles,
      generatedResult: r.generatedResult,
      passed: r.passed,
      score: r.score,
      resultMatch: r.resultMatch,
      compilationError: r.compilationError,
      runtimeError: r.runtimeError,
    }));

    const filename = `${DETAILED_RESULTS_DIR}/iteration-${iteration}.json`;
    writeFileSync(filename, JSON.stringify(detailedResults, null, 2));
  }

  /**
   * Generate expression using current prompt
   */
  async generate(
    task: string,
    context: Record<string, any>,
  ): Promise<{ text: string; tokens: { input: number; output: number } }> {
    const result = await llm.generate({
      system: this.currentPrompt,
      messages: [
        {
          role: 'user',
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
   * Score generated expression by comparing result against pre-computed expected result
   */
  private scoreExpression(
    generatedResult: any,
    expectedResult: any,
    hasRuntimeError: boolean,
    expectedCompiles: boolean,
  ): number {
    // If either has errors, score is 0
    if (hasRuntimeError || !expectedCompiles) {
      return 0;
    }

    // Compare actual execution results using deep equality
    return deepEqual(generatedResult, expectedResult) ? 1.0 : 0.0;
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

    console.log(`Running ${this.dataset.length} tests...`);

    for (let i = 0; i < this.dataset.length; i++) {
      const testCase = this.dataset[i];
      if (!testCase) continue;

      process.stdout.write(`  [${i + 1}/${this.dataset.length}] ${testCase.id}: `);

      const result: EvalResult = {
        testCase,
        generated: '',
        generatedCompiles: false,
        passed: false,
        score: 0,
        resultMatch: false,
      };

      try {
        const generated = await this.generate(testCase.input, testCase.context);
        result.generated = generated.text;

        totalInputTokens += generated.tokens.input;
        totalOutputTokens += generated.tokens.output;

        // Check if generated expression compiles
        try {
          compile(result.generated);
          result.generatedCompiles = true;
        } catch (compileErr) {
          result.compilationError =
            compileErr instanceof Error ? compileErr.message : 'Compilation failed';
        }

        // If compiled and we have sample data, run it
        if (result.generatedCompiles && testCase.sampleData) {
          try {
            result.generatedResult = run(result.generated, {
              root: testCase.sampleData,
              state: testCase.sampleData.state,
              data: testCase.sampleData.data,
              env: testCase.sampleData.env,
            });
          } catch (runErr) {
            result.runtimeError = runErr instanceof Error ? runErr.message : 'Runtime error';
          }
        }

        // Compare results if we have both
        if (
          !result.runtimeError &&
          testCase.expectedResult !== undefined &&
          result.generatedResult !== undefined
        ) {
          result.resultMatch = deepEqual(result.generatedResult, testCase.expectedResult);
        }

        // Calculate score
        result.score = this.scoreExpression(
          result.generatedResult,
          testCase.expectedResult,
          !!result.runtimeError,
          testCase.expectedCompiles ?? true,
        );
        result.passed = result.score >= 0.9;

        // Real-time feedback
        if (result.passed) {
          console.log(`✓ (${(result.score * 100).toFixed(0)}%)`);
        } else {
          if (result.compilationError) {
            console.log(`✗ COMPILE ERROR`);
            console.log(`    Expected: ${testCase.expected}`);
            console.log(`    Got:      ${result.generated}`);
            console.log(`    Error:    ${result.compilationError}`);
          } else if (result.runtimeError) {
            console.log(`✗ RUNTIME ERROR`);
            console.log(`    Expected: ${testCase.expected}`);
            console.log(`    Got:      ${result.generated}`);
            console.log(`    Error:    ${result.runtimeError}`);
          } else if (!result.resultMatch) {
            console.log(`✗ RESULT MISMATCH`);
            console.log(`    Expected expression: ${testCase.expected}`);
            console.log(`    Got expression:      ${result.generated}`);
            console.log(
              `    Expected result:     ${JSON.stringify(testCase.expectedResult)?.substring(0, 100)}`,
            );
            console.log(
              `    Got result:          ${JSON.stringify(result.generatedResult)?.substring(0, 100)}`,
            );
          }
        }

        results.push(result);
      } catch (error) {
        console.log(`✗ ERROR`);
        console.log(`    ${error instanceof Error ? error.message : 'Unknown error'}`);

        result.compilationError = error instanceof Error ? error.message : 'Unknown error';
        results.push(result);
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
        analysis: 'All tests passing - no failures to analyze.',
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
Compiles: ${f.generatedCompiles}
Result Match: ${f.resultMatch}
${f.compilationError ? `Compilation Error: ${f.compilationError}` : ''}
${f.runtimeError ? `Runtime Error: ${f.runtimeError}` : ''}
`,
      )
      .join('\n---\n');

    const analysisPrompt = `You are analyzing failures in yexp expression generation. Review the failures and identify patterns.

Current system prompt:
"""
${this.currentPrompt}
"""

Failures:
${failureReport}

Existing learnings:
${this.learnings.slice(-5).join('\n')}

Analyze the failures and provide:
1. **Root causes**: What patterns of mistakes are happening?
2. **Specific fixes**: What exact changes to the prompt would fix these?
3. **Examples needed**: What examples should be added to prevent these errors?

Be specific and actionable. Focus on the most impactful changes.`;

    const result = await llm.generate({
      messages: [{ role: 'user', content: analysisPrompt }],
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
      messages: [{ role: 'user', content: improvementPrompt }],
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
    const specPath = '../docs/spec.md';
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
      console.warn('Could not load yexp spec, using basic constraints');
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
    console.log('🚀 Starting RALPH optimization loop...');
    console.log(`📁 Model: ${MODEL_SLUG}`);
    console.log(`📂 Results: ${RESULTS_DIR}\n`);

    for (let i = 1; i <= maxIterations; i++) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📊 Iteration ${i}/${maxIterations}`);
      console.log('='.repeat(60));

      // Run evals
      console.log('\n🔬 Running evaluations...');
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
        console.log(
          `💰 Cost: $${cost.toFixed(6)} | Tokens: ${totalInputTokens + totalOutputTokens}`,
        );

        const iteration: IterationResult = {
          iteration: i,
          prompt: this.currentPrompt,
          totalTests: results.length,
          passed,
          avgScore,
          failures,
          learnings: 'Target achieved',
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
      console.log('\n🤔 AI analyzing failures...');
      const analysisResult = await this.analyzeFailures(failures);
      const { analysis, tokens: analysisTokens } = analysisResult;
      totalInputTokens += analysisTokens.input;
      totalOutputTokens += analysisTokens.output;

      console.log('\n📝 Analysis:');
      console.log(analysis.substring(0, 300) + '...');

      // AI improves prompt
      console.log('\n✨ AI improving prompt...');
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

      console.log(
        `💰 Iteration cost: $${cost.toFixed(6)} | Tokens: ${totalInputTokens + totalOutputTokens}`,
      );

      console.log('\n💾 State saved. Prompt updated for next iteration.');
    }

    console.log('\n' + '='.repeat(60));
    console.log('🏁 Optimization complete!');
    console.log('='.repeat(60));

    const finalResult = this.history[this.history.length - 1];
    const totalCost = this.history.reduce((sum, iter) => sum + iter.cost, 0);
    const totalTokens = this.history.reduce((sum, iter) => sum + iter.tokens.total, 0);

    console.log(`\nFinal Score: ${finalResult.avgScore.toFixed(3)}`);
    console.log(`Final Pass Rate: ${finalResult.passed}/${finalResult.totalTests}`);
    console.log(`Total Iterations: ${this.history.length}`);
    console.log(`\n💰 Total Cost: $${totalCost.toFixed(6)}`);
    console.log(`📊 Total Tokens: ${totalTokens.toLocaleString()}`);
    console.log(
      `   Input: ${this.history.reduce((sum, iter) => sum + iter.tokens.input, 0).toLocaleString()}`,
    );
    console.log(
      `   Output: ${this.history.reduce((sum, iter) => sum + iter.tokens.output, 0).toLocaleString()}`,
    );
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
