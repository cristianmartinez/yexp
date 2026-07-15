/**
 * Generate expected results by running expected expressions against sample data
 * This transforms dataset.json into dataset-with-results.json
 */

import { readFileSync, writeFileSync } from 'fs';
import { compile, run } from '@cristianmartinez/yexp';

interface TestCase {
  id: string;
  input: string;
  expected: string;
  context: Record<string, any>;
  sampleData?: Record<string, any>;
}

interface TestCaseWithResult extends TestCase {
  expectedResult?: any;
  expectedCompiles: boolean;
  expectedError?: string;
}

function generateExpectedResults() {
  console.log('📊 Generating expected results from dataset.json...\n');

  // Load dataset
  const dataset: TestCase[] = JSON.parse(readFileSync('./dataset.json', 'utf-8'));

  const results: TestCaseWithResult[] = [];
  let compiled = 0;
  let failed = 0;

  for (const testCase of dataset) {
    process.stdout.write(`  ${testCase.id}: `);

    const result: TestCaseWithResult = {
      ...testCase,
      expectedCompiles: false,
    };

    try {
      // Try to compile the expected expression
      compile(testCase.expected);
      result.expectedCompiles = true;

      // If we have sample data, run it to get expected result
      if (testCase.sampleData) {
        try {
          const output = run(testCase.expected, {
            root: testCase.sampleData,
            state: testCase.sampleData.state,
            data: testCase.sampleData.data,
            env: testCase.sampleData.env,
          });

          result.expectedResult = output;
          console.log(`✓ (result: ${JSON.stringify(output).substring(0, 50)}...)`);
          compiled++;
        } catch (runError) {
          result.expectedError = runError instanceof Error ? runError.message : 'Runtime error';
          console.log(`✗ RUNTIME ERROR: ${result.expectedError}`);
          failed++;
        }
      } else {
        console.log(`⚠️  No sample data (compilation only)`);
        compiled++;
      }
    } catch (compileError) {
      result.expectedCompiles = false;
      result.expectedError =
        compileError instanceof Error ? compileError.message : 'Compilation error';
      console.log(`✗ COMPILE ERROR: ${result.expectedError}`);
      failed++;
    }

    results.push(result);
  }

  // Save enhanced dataset
  writeFileSync('./dataset-with-results.json', JSON.stringify(results, null, 2), 'utf-8');

  console.log(`\n✅ Generated expected results for ${results.length} test cases`);
  console.log(`   Compiled: ${compiled}`);
  console.log(`   Failed: ${failed}`);
  console.log(`\n💾 Saved to: dataset-with-results.json`);
}

if (import.meta.main) {
  generateExpectedResults();
}

export { generateExpectedResults };
