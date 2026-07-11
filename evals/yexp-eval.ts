/**
 * Yexp Expression Generation Evaluation
 * Tests LLM ability to generate valid yexp expressions from natural language
 */

import { Eval } from "braintrust";
import Anthropic from "@anthropic-ai/sdk";

// Import yexp parser/compiler when available
// import { compile, evaluate } from "yexp";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Dataset: Natural language prompts → Expected yexp expressions
const dataset = [
  {
    input: "Get all active users",
    expected: "data.users |> filter(.active)",
    context: { data: { users: "array<{active: boolean, name: string}>" } },
  },
  {
    input: "Calculate total price for items over $100",
    expected: "data.items |> filter(.price > 100) |> map(.price) |> add",
    context: { data: { items: "array<{price: number, name: string}>" } },
  },
  {
    input: "Get the first 5 premium users",
    expected: "data.users |> filter(.premium) |> limit(5)",
    context: { data: { users: "array<{premium: boolean, name: string}>" } },
  },
  {
    input: "Increment the counter",
    expected: "state.count = state.count + 1",
    context: { state: { count: "number" } },
  },
  {
    input: "Get user name or 'Guest' if not available",
    expected: "state.user?.name ?? 'Guest'",
    context: { state: { user: "object | null" } },
  },
  {
    input: "Find all email addresses at any depth in the data",
    expected: "data..email",
    context: { data: { users: "array<object>" } },
  },
  {
    input: "Group items by category",
    expected: "data.items |> groupBy(.category)",
    context: { data: { items: "array<{category: string}>" } },
  },
  {
    input: "Sort users by age descending",
    expected: "data.users |> sort((a, b) => b.age - a.age)",
    context: { data: { users: "array<{age: number}>" } },
  },
];

// System prompt for yexp generation
const SYSTEM_PROMPT = `You are a yexp expression generator. Given a natural language description and context schema, generate a valid yexp expression.

Yexp is a JSON-based expression language with these key features:

1. Context roots: state (mutable), data (read-only), env (read-only)
2. Pipe operator: |> for function chaining
3. Dot shorthand: .property for lambda shortcuts
4. Built-in functions: filter, map, reduce, groupBy, sort, etc.
5. Optional chaining: ?. for safe access
6. Null coalescing: ?? for defaults
7. Recursive descent: .. for deep property search

Rules:
- Only use built-in functions (no custom functions)
- Mutations only allowed on state paths
- No dynamic bracket access (use filter instead)
- Prefer pipe syntax over nested calls
- Use dot shorthand when possible

Output ONLY the yexp expression, no explanation.`;

async function generateYexpExpression(
  task: string,
  context: Record<string, any>
): Promise<string> {
  const userPrompt = `Context schema:
${JSON.stringify(context, null, 2)}

Task: ${task}

Generate the yexp expression:`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const response = message.content[0];
  if (response.type !== "text") {
    throw new Error("Expected text response");
  }

  return response.text.trim();
}

// Scoring functions
function syntaxValidityScore(output: string, expected: string): number {
  // TODO: Use actual yexp parser when available
  // For now, basic heuristics
  try {
    // Check for basic syntax patterns
    const hasValidRoot = /^(state|data|env)\./.test(output.trim());
    const hasBalancedParens =
      (output.match(/\(/g) || []).length === (output.match(/\)/g) || []).length;
    const hasBalancedBrackets =
      (output.match(/\[/g) || []).length === (output.match(/\]/g) || []).length;

    if (!hasValidRoot) return 0;
    if (!hasBalancedParens || !hasBalancedBrackets) return 0;

    return 1;
  } catch {
    return 0;
  }
}

function semanticCorrectnessScore(output: string, expected: string): number {
  // Exact match
  if (output === expected) return 1;

  // Normalized comparison (whitespace, semicolons)
  const normalize = (s: string) =>
    s.replace(/\s+/g, " ").replace(/;$/, "").trim();
  if (normalize(output) === normalize(expected)) return 0.95;

  // Partial credit for similar structure
  const outputTokens = new Set(output.split(/[\s|>().,]/));
  const expectedTokens = new Set(expected.split(/[\s|>().,]/));
  const intersection = new Set(
    [...outputTokens].filter((t) => expectedTokens.has(t))
  );
  const similarity =
    intersection.size / Math.max(outputTokens.size, expectedTokens.size);

  return similarity > 0.5 ? similarity * 0.5 : 0;
}

function tokenEfficiencyScore(output: string, expected: string): number {
  // Prefer shorter expressions if they're correct
  const ratio = Math.min(output.length, expected.length) /
                Math.max(output.length, expected.length);
  return ratio;
}

// Run evaluation
Eval("yexp-generation-eval", {
  data: () => dataset,
  task: async (input) => {
    const output = await generateYexpExpression(input.input, input.context);
    return output;
  },
  scores: [
    {
      name: "syntax_valid",
      scorer: (args) => syntaxValidityScore(args.output, args.expected),
    },
    {
      name: "semantic_correct",
      scorer: (args) => semanticCorrectnessScore(args.output, args.expected),
    },
    {
      name: "token_efficient",
      scorer: (args) => tokenEfficiencyScore(args.output, args.expected),
    },
    {
      name: "exact_match",
      scorer: (args) => (args.output === args.expected ? 1 : 0),
    },
  ],
  metadata: {
    model: "claude-sonnet-4-5-20250929",
    framework: "braintrust",
  },
});
