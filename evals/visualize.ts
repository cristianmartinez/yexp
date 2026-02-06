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
