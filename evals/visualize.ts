/**
 * Generate visualization report from RALPH progress
 */

import { readFileSync, existsSync, readdirSync } from "fs";

interface ProgressData {
  iteration: number;
  avgScore: number;
  passed: number;
  totalTests: number;
  cost: number;
  tokens?: { input: number; output: number; total: number };
  timestamp: string;
  failures?: Array<{
    testCase: { id: string; input: string; expected: string };
    generated: string;
    passed: boolean;
    score: number;
    error?: string;
  }>;
}

function loadProgress(modelSlug: string): ProgressData[] {
  const progressFile = `./results/${modelSlug}/progress.json`;
  if (!existsSync(progressFile)) {
    console.error(`Progress file not found: ${progressFile}`);
    return [];
  }
  return JSON.parse(readFileSync(progressFile, "utf-8"));
}

function generateASCIIChart(data: number[], label: string, width = 60) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  console.log(`\n${label}:`);
  console.log("─".repeat(width + 10));

  data.forEach((value, i) => {
    const normalized = (value - min) / range;
    const barLength = Math.round(normalized * width);
    const bar = "█".repeat(barLength) + "░".repeat(width - barLength);
    console.log(`${i + 1}: ${bar} ${value.toFixed(3)}`);
  });

  console.log("─".repeat(width + 10));
  console.log(`Min: ${min.toFixed(3)} | Max: ${max.toFixed(3)} | Avg: ${(data.reduce((a, b) => a + b, 0) / data.length).toFixed(3)}`);
}

function extractCategory(testId: string): string {
  // Extract category from test ID prefix (e.g., "filter-active" → "filter")
  const prefixes = [
    "filter", "map", "limit", "unique", "first", "last", "reverse",
    "sort", "groupby", "uniqueby",
    "sum", "average", "min", "max", "count", "percentage",
    "optional", "chained",
    "mutation",
    "recursive",
    "string",
    "object",
    "complex"
  ];

  for (const prefix of prefixes) {
    if (testId.startsWith(prefix)) return prefix;
  }

  return "other";
}

function generateCategoryBreakdown(progress: ProgressData[]) {
  if (progress.length === 0) return;

  console.log("\n\n📊 Category Performance (Across All Iterations):");
  console.log("─".repeat(80));

  const categoryFailures = new Map<string, number>();

  // Collect all failures across all iterations by category
  progress.forEach((iter) => {
    iter.failures?.forEach((f: any) => {
      const category = extractCategory(f.testCase?.id || "");
      categoryFailures.set(category, (categoryFailures.get(category) || 0) + 1);
    });
  });

  if (categoryFailures.size === 0) {
    console.log("✅ No failures in any category!");
    return;
  }

  // Sort categories by failure count (most failures first)
  const sortedCategories = Array.from(categoryFailures.entries())
    .map(([category, failures]) => ({ category, failures }))
    .sort((a, b) => b.failures - a.failures);

  const maxFailures = sortedCategories[0]?.failures || 1;

  // Display category stats
  console.log(`${"Category".padEnd(20)} ${"Failures".padEnd(12)} Bar`);
  console.log("─".repeat(80));

  sortedCategories.forEach(({ category, failures }) => {
    const barLength = Math.round((failures / maxFailures) * 40);
    const bar = "█".repeat(barLength);
    const failuresStr = `${failures}`.padEnd(12);
    console.log(`${category.padEnd(20)} ${failuresStr} ${bar}`);
  });

  console.log("─".repeat(80));
  console.log(`Total failure instances: ${Array.from(categoryFailures.values()).reduce((a, b) => a + b, 0)}`);

  // Highlight most problematic categories
  const topIssues = sortedCategories.slice(0, 3);
  if (topIssues.length > 0) {
    console.log(`⚠️  Most problematic: ${topIssues.map(c => `${c.category} (${c.failures})`).join(", ")}`);
  }
}

function generateFailureHeatmap(progress: ProgressData[]) {
  if (progress.length === 0) return;

  // Collect all unique test IDs across iterations
  const allTestIds = new Set<string>();
  progress.forEach((iter) => {
    iter.failures?.forEach((f: any) => {
      if (f.testCase?.id) allTestIds.add(f.testCase.id);
    });
  });

  if (allTestIds.size === 0) {
    console.log("\n✅ No failures recorded across any iteration!");
    return;
  }

  console.log("\n\n🗺️  Test Failure Heatmap:");
  console.log("─".repeat(80));

  // Header row
  const iterHeaders = progress.map((_, i) => `It${i + 1}`).join("  ");
  console.log(`${"Test".padEnd(40)} ${iterHeaders}`);
  console.log("─".repeat(80));

  // Build failure map
  const failureMap = new Map<string, boolean[]>();
  allTestIds.forEach((testId) => {
    const results = progress.map((iter) => {
      const failure = iter.failures?.find((f: any) => f.testCase?.id === testId);
      return !failure; // true = passed, false = failed
    });
    failureMap.set(testId, results);
  });

  // Sort by number of failures (most failures first)
  const sortedTests = Array.from(failureMap.entries()).sort(
    (a, b) => {
      const aFails = a[1].filter((passed) => !passed).length;
      const bFails = b[1].filter((passed) => !passed).length;
      return bFails - aFails;
    }
  );

  // Display heatmap
  sortedTests.forEach(([testId, results]) => {
    const statusIcons = results.map((passed) => passed ? "✓" : "✗").join("   ");
    const failCount = results.filter((passed) => !passed).length;
    console.log(`${testId.padEnd(40)} ${statusIcons}  (${failCount} fails)`);
  });

  console.log("─".repeat(80));
  console.log("Legend: ✓ = passed, ✗ = failed");
}

function generateReport() {
  console.log("📊 RALPH Optimization Report\n");
  console.log("=".repeat(80));

  // Find all model directories
  const resultsDir = "./results";
  if (!existsSync(resultsDir)) {
    console.error("No results directory found");
    return;
  }

  const models = readdirSync(resultsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  if (models.length === 0) {
    console.error("No model results found");
    return;
  }

  // Generate report for each model
  models.forEach((model) => {
    const progress = loadProgress(model);
    if (progress.length === 0) return;

    console.log(`\n\n🤖 Model: ${model}`);
    console.log("=".repeat(80));

    const scores = progress.map((p) => p.avgScore);
    const costs = progress.map((p) => p.cost);
    const passRates = progress.map((p) => p.passed / p.totalTests);

    generateASCIIChart(scores, "Score Progression");
    generateASCIIChart(passRates, "Pass Rate Progression");
    generateASCIIChart(costs, "Cost per Iteration ($)");

    // Show category breakdown
    generateCategoryBreakdown(progress);

    // Show failure heatmap
    generateFailureHeatmap(progress);

    // Summary stats
    const totalCost = costs.reduce((a, b) => a + b, 0);
    const totalTokens = progress.reduce((sum, p) => sum + (p.tokens?.total || 0), 0);
    const finalScore = scores[scores.length - 1];
    const improvement = scores[scores.length - 1] - scores[0];

    console.log(`\n📈 Summary:`);
    console.log(`   Iterations: ${progress.length}`);
    console.log(`   Initial Score: ${scores[0].toFixed(3)}`);
    console.log(`   Final Score: ${finalScore.toFixed(3)}`);
    console.log(`   Improvement: ${improvement > 0 ? "+" : ""}${improvement.toFixed(3)} (${((improvement / scores[0]) * 100).toFixed(1)}%)`);
    console.log(`   Total Cost: $${totalCost.toFixed(6)}`);
    if (totalTokens > 0) {
      console.log(`   Total Tokens: ${totalTokens.toLocaleString()}`);
      console.log(`   Avg Cost/Iteration: $${(totalCost / progress.length).toFixed(6)}`);

      // Token breakdown
      const totalInput = progress.reduce((sum, p) => sum + (p.tokens?.input || 0), 0);
      const totalOutput = progress.reduce((sum, p) => sum + (p.tokens?.output || 0), 0);
      console.log(`\n🎯 Token Breakdown:`);
      console.log(`   Input: ${totalInput.toLocaleString()} (${((totalInput / totalTokens) * 100).toFixed(1)}%)`);
      console.log(`   Output: ${totalOutput.toLocaleString()} (${((totalOutput / totalTokens) * 100).toFixed(1)}%)`);
    } else {
      console.log(`   (Token tracking not available for this run)`);
      console.log(`   Avg Cost/Iteration: $${(totalCost / progress.length).toFixed(6)}`);
    }
  });

  // Model comparison
  if (models.length > 1) {
    console.log("\n\n🔄 Model Comparison");
    console.log("=".repeat(80));

    const comparison = models.map((model) => {
      const progress = loadProgress(model);
      if (progress.length === 0) return null;

      const finalScore = progress[progress.length - 1].avgScore;
      const totalCost = progress.reduce((sum, p) => sum + p.cost, 0);
      const totalTokens = progress.reduce((sum, p) => sum + (p.tokens?.total || 0), 0);

      return { model, finalScore, totalCost, totalTokens, iterations: progress.length };
    }).filter(Boolean);

    comparison.forEach((c) => {
      if (!c) return;
      console.log(`\n${c.model}:`);
      console.log(`   Final Score: ${c.finalScore.toFixed(3)}`);
      console.log(`   Total Cost: $${c.totalCost.toFixed(6)}`);
      console.log(`   Iterations: ${c.iterations}`);
      console.log(`   Cost/Point: $${(c.totalCost / c.finalScore).toFixed(6)}`);
    });
  }

  console.log("\n\n" + "=".repeat(80));
}

// Run if executed directly
if (import.meta.main) {
  generateReport();
}

export { generateReport };
