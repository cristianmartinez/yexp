/**
 * Load test dataset from JSON
 */
import { readFileSync } from "fs";

export interface TestCase {
  id: string;
  input: string;
  expected: string;
  context: Record<string, any>;
  sampleData?: Record<string, any>;
  expectedResult?: any;
  expectedCompiles?: boolean;
  expectedError?: string;
}

/**
 * Load dataset with pre-computed expected results
 */
export function loadDataset(): TestCase[] {
  const data = JSON.parse(readFileSync("./dataset-with-results.json", "utf-8"));
  return data;
}
