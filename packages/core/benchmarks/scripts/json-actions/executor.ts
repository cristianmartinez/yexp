/**
 * JSON-based action executor
 *
 * Handles imperative operations like assignments, sequences, conditionals
 */

import { compile } from '../../../src/compiler.js';
import { evaluate as evalExpr } from '../../../src/vm.js';
import { parse } from '../../../src/parser.js';
import { tokenize } from '../../../src/lexer.js';

export type JsonAction =
  | { type: 'assign'; path: string; value: JsonValue }
  | { type: 'sequence'; actions: JsonAction[] }
  | { type: 'conditional'; condition: JsonValue; then: JsonAction; else?: JsonAction }
  | { type: 'call'; function: string; args?: JsonValue[] };

export type JsonValue =
  | { type: 'literal'; value: any }
  | { type: 'expr'; expr: string }  // Expr expression for reading
  | { type: 'path'; path: string };

/**
 * Execute a JSON action, mutating the context
 */
export function executeAction(action: JsonAction, context: any): void {
  switch (action.type) {
    case 'assign': {
      const value = evaluateValue(action.value, context);
      setPath(context, action.path, value);
      break;
    }

    case 'sequence': {
      for (const subAction of action.actions) {
        executeAction(subAction, context);
      }
      break;
    }

    case 'conditional': {
      const condition = evaluateValue(action.condition, context);
      if (condition) {
        executeAction(action.then, context);
      } else if (action.else) {
        executeAction(action.else, context);
      }
      break;
    }

    case 'call': {
      // Call a registered function
      const fn = (context as any).__functions?.[action.function];
      if (typeof fn === 'function') {
        const args = action.args?.map(arg => evaluateValue(arg, context)) || [];
        fn(...args);
      }
      break;
    }
  }
}

/**
 * Evaluate a JSON value to get actual value
 */
function evaluateValue(value: JsonValue, context: any): any {
  switch (value.type) {
    case 'literal':
      return value.value;

    case 'expr': {
      // Use Expr to evaluate expressions (read-only)
      const bytecode = compile(parse(tokenize(value.expr)));
      return evalExpr(bytecode, context as any);
    }

    case 'path':
      return getPath(context, value.path);
  }
}

/**
 * Set value at nested path (mutates context)
 */
function setPath(obj: any, path: string, value: any): void {
  const parts = path.split('.');
  let current = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]!;
    if (!(part in current)) {
      current[part] = {};
    }
    current = current[part];
  }

  const lastPart = parts[parts.length - 1]!;
  current[lastPart] = value;
}

/**
 * Get value from nested path
 */
function getPath(obj: any, path: string): any {
  const parts = path.split('.');
  let current = obj;

  for (const part of parts) {
    current = current?.[part];
    if (current === undefined) return undefined;
  }

  return current;
}
