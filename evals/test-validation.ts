/**
 * Test the new validation approach with pre-computed expected results
 */

import { loadDataset } from "./dataset-loader";
import { compileExpr, run } from "@yexp/core";

function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((val, i) => deepEqual(val, b[i]));
  }

  if (typeof a === "object" && typeof b === "object") {
    const keysA = Object.keys(a).sort();
    const keysB = Object.keys(b).sort();
    if (keysA.length !== keysB.length) return false;
    if (!keysA.every((key, i) => key === keysB[i])) return false;
    return keysA.every((key) => deepEqual(a[key], b[key]));
  }

  return false;
}

console.log("🧪 Testing new validation approach\n");
console.log("This demonstrates how we validate generated expressions against pre-computed results.\n");

const dataset = loadDataset();

// Pick a few test cases to demonstrate
const testCases = [
  dataset.find((t) => t.id === "filter-active"),
  dataset.find((t) => t.id === "complex-nested-filter"),
  dataset.find((t) => t.id === "string-uppercase"),
];

testCases.forEach((testCase) => {
  if (!testCase) return;

  console.log(`\n${"=".repeat(60)}`);
  console.log(`Test: ${testCase.id}`);
  console.log(`Input: "${testCase.input}"`);
  console.log(`Expected Expression: ${testCase.expected}`);
  console.log(`Expected Result: ${JSON.stringify(testCase.expectedResult)?.substring(0, 200)}`);

  // Simulate testing with the EXACT expression (should pass)
  console.log(`\n✅ Testing with exact expression: ${testCase.expected}`);

  const exactCompiles = (() => {
    try {
      compileExpr(testCase.expected);
      return true;
    } catch {
      return false;
    }
  })();

  console.log(`   Compiles: ${exactCompiles}`);

  if (exactCompiles && testCase.sampleData) {
    try {
      const result = run(testCase.expected, {
        root: testCase.sampleData,
        state: testCase.sampleData.state,
        data: testCase.sampleData.data,
        env: testCase.sampleData.env,
      });

      const matches = deepEqual(result, testCase.expectedResult);
      console.log(`   Result matches: ${matches}`);
      console.log(`   Score: ${matches ? "1.0 (PASS)" : "0.0 (FAIL)"}`);
    } catch (error) {
      console.log(`   Runtime error: ${error instanceof Error ? error.message : "unknown"}`);
    }
  }

  // Simulate testing with a semantically equivalent expression with different variable names
  // (This demonstrates the key improvement - it now passes even with different variable names)
  if (testCase.id === "complex-nested-filter") {
    const alternativeExpr = "data.users |> filter((user) => user.tasks |> some(.completed))";
    console.log(`\n✅ Testing with alternative (semantic equivalent): ${alternativeExpr}`);

    const altCompiles = (() => {
      try {
        compileExpr(alternativeExpr);
        return true;
      } catch {
        return false;
      }
    })();

    console.log(`   Compiles: ${altCompiles}`);

    if (altCompiles && testCase.sampleData) {
      try {
        const result = run(alternativeExpr, {
          root: testCase.sampleData,
          state: testCase.sampleData.state,
          data: testCase.sampleData.data,
          env: testCase.sampleData.env,
        });

        const matches = deepEqual(result, testCase.expectedResult);
        console.log(`   Result matches: ${matches}`);
        console.log(`   Score: ${matches ? "1.0 (PASS) ← This would have been FALSE NEGATIVE before!" : "0.0 (FAIL)"}`);
      } catch (error) {
        console.log(`   Runtime error: ${error instanceof Error ? error.message : "unknown"}`);
      }
    }
  }
});

console.log(`\n${"=".repeat(60)}`);
console.log("\n✅ Validation system records for each test:");
console.log("   1. Does the expression compile? (true/false)");
console.log("   2. Does the result match expected? (true/false)");
console.log("   3. Compilation error (if any)");
console.log("   4. Runtime error (if any)");
console.log("\n💡 This eliminates false negatives from semantically equivalent expressions!");
