/**
 * JSON-based condition evaluator
 *
 * Simple but extensible condition engine using JSON structures.
 * Supports basic field comparisons, logical operators (AND/OR), and nested paths.
 */

export interface JsonCondition {
  // Simple field access
  field?: string;

  // Path-based access (e.g., "user.profile.age")
  path?: string;

  // Comparison operator
  op?: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte';

  // Value to compare against
  value?: any;

  // Logical operators
  and?: JsonCondition[];
  or?: JsonCondition[];
}

/**
 * Simple evaluator - only supports direct field access
 * Fast but limited to top-level properties
 */
export function evaluateSimple(condition: JsonCondition, context: any): boolean {
  // Simple field comparison
  if (condition.field && condition.op) {
    const fieldValue = context[condition.field];
    const { op, value } = condition;

    switch (op) {
      case 'eq':
        return fieldValue === value;
      case 'neq':
        return fieldValue !== value;
      case 'gt':
        return fieldValue > value;
      case 'gte':
        return fieldValue >= value;
      case 'lt':
        return fieldValue < value;
      case 'lte':
        return fieldValue <= value;
      default:
        return false;
    }
  }

  // AND logic
  if (condition.and) {
    return condition.and.every((c) => evaluateSimple(c, context));
  }

  // OR logic
  if (condition.or) {
    return condition.or.some((c) => evaluateSimple(c, context));
  }

  return false;
}

/**
 * Path-based evaluator - supports nested property access
 * Slightly slower but handles paths like "user.profile.age"
 */
export function evaluateWithPaths(condition: JsonCondition, context: any): boolean {
  // Path-based field comparison (e.g., "user.profile.age")
  if (condition.path && condition.op) {
    // Parse path: "user.profile.age" -> ["user", "profile", "age"]
    const pathParts = condition.path.split('.');
    let value = context;

    // Traverse the path
    for (const part of pathParts) {
      value = value?.[part];
      if (value === undefined) return false;
    }

    const { op, value: condValue } = condition;
    switch (op) {
      case 'eq':
        return value === condValue;
      case 'neq':
        return value !== condValue;
      case 'gt':
        return value > condValue;
      case 'gte':
        return value >= condValue;
      case 'lt':
        return value < condValue;
      case 'lte':
        return value <= condValue;
      default:
        return false;
    }
  }

  // Fallback to simple field access
  if (condition.field && condition.op) {
    const fieldValue = context[condition.field];
    const { op, value } = condition;

    switch (op) {
      case 'eq':
        return fieldValue === value;
      case 'neq':
        return fieldValue !== value;
      case 'gt':
        return fieldValue > value;
      case 'gte':
        return fieldValue >= value;
      case 'lt':
        return fieldValue < value;
      case 'lte':
        return fieldValue <= value;
      default:
        return false;
    }
  }

  // AND logic
  if (condition.and) {
    return condition.and.every((c) => evaluateWithPaths(c, context));
  }

  // OR logic
  if (condition.or) {
    return condition.or.some((c) => evaluateWithPaths(c, context));
  }

  return false;
}
