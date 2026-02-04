import type { BytecodeProgram, ExprValue, ExecutionContext } from '@jext/core';

export interface VMState {
  ip: number;
  stack: ExprValue[];
  locals: Map<number, ExprValue>;
  context: ExecutionContext;
  done: boolean;
  result?: ExprValue;
  error?: string;
}

export interface ExecutionStep {
  state: VMState;
  instruction: any;
  instructionIndex: number;
}

export class VMStepper {
  private program: BytecodeProgram;
  private context: ExecutionContext;
  private history: ExecutionStep[] = [];
  private currentStep = 0;

  constructor(program: BytecodeProgram, context: ExecutionContext) {
    this.program = program;
    this.context = context;
    this.initialize();
  }

  private initialize() {
    // Create initial state
    const initialState: VMState = {
      ip: 0,
      stack: [],
      locals: new Map(),
      context: this.context,
      done: false,
    };

    this.history = [{
      state: initialState,
      instruction: this.program.code[0],
      instructionIndex: 0,
    }];
    this.currentStep = 0;
  }

  getCurrentState(): ExecutionStep {
    return this.history[this.currentStep];
  }

  getAllSteps(): ExecutionStep[] {
    return this.history;
  }

  canStepForward(): boolean {
    if (this.currentStep < this.history.length - 1) {
      return true;
    }
    return !this.getCurrentState().state.done;
  }

  canStepBackward(): boolean {
    return this.currentStep > 0;
  }

  stepForward(): ExecutionStep | null {
    // If we've already computed this step, just move forward
    if (this.currentStep < this.history.length - 1) {
      this.currentStep++;
      return this.getCurrentState();
    }

    // If we're at the end, execute next instruction
    const current = this.getCurrentState();
    if (current.state.done) {
      return null;
    }

    const nextState = this.executeInstruction(current.state);
    const nextInstruction = nextState.done
      ? null
      : this.program.code[nextState.ip];

    const step: ExecutionStep = {
      state: nextState,
      instruction: nextInstruction,
      instructionIndex: nextState.ip,
    };

    this.history.push(step);
    this.currentStep++;
    return step;
  }

  stepBackward(): ExecutionStep | null {
    if (this.currentStep > 0) {
      this.currentStep--;
      return this.getCurrentState();
    }
    return null;
  }

  reset() {
    this.initialize();
  }

  private executeInstruction(state: VMState): VMState {
    const { ip, stack, locals, context } = state;
    const code = this.program.code;

    if (ip >= code.length) {
      return { ...state, done: true };
    }

    const instruction = code[ip];
    const opcode = instruction[0];
    const newStack = [...stack];
    const newLocals = new Map(locals);

    // Helper functions
    const push = (value: ExprValue) => newStack.push(value);
    const pop = (): ExprValue => {
      if (newStack.length === 0) {
        return { error: 'STACK_UNDERFLOW', message: 'Stack underflow' };
      }
      return newStack.pop()!;
    };

    let nextIp = ip + 1;

    try {
      // Execute instruction
      switch (opcode) {
        // Constants & loading
        case 0: // CONST
          push(instruction[1] as ExprValue);
          break;
        case 1: // LOAD
          const slotIndex = instruction[1] as number;
          const slotPaths = this.program.slots || [];
          if (slotIndex < slotPaths.length) {
            const path = slotPaths[slotIndex];
            const value = this.resolvePath(context, path);
            push(value ?? null);
          }
          break;
        case 2: // DUP
          if (newStack.length > 0) {
            push(newStack[newStack.length - 1]);
          }
          break;
        case 3: // POP
          pop();
          break;

        // Arithmetic
        case 10: // ADD
          const addB = pop();
          const addA = pop();
          if (typeof addA === 'number' && typeof addB === 'number') {
            push(addA + addB);
          } else if (typeof addA === 'string' || typeof addB === 'string') {
            push(String(addA) + String(addB));
          } else {
            push({ error: 'TYPE_ERROR', message: 'Invalid operands for ADD' });
          }
          break;
        case 11: // SUB
          const subB = pop();
          const subA = pop();
          if (typeof subA === 'number' && typeof subB === 'number') {
            push(subA - subB);
          }
          break;
        case 12: // MUL
          const mulB = pop();
          const mulA = pop();
          if (typeof mulA === 'number' && typeof mulB === 'number') {
            push(mulA * mulB);
          }
          break;
        case 13: // DIV
          const divB = pop();
          const divA = pop();
          if (typeof divA === 'number' && typeof divB === 'number') {
            if (divB === 0) {
              push({ error: 'DIVISION_BY_ZERO', message: 'Division by zero' });
            } else {
              push(divA / divB);
            }
          }
          break;
        case 14: // MOD
          const modB = pop();
          const modA = pop();
          if (typeof modA === 'number' && typeof modB === 'number') {
            push(modA % modB);
          }
          break;
        case 15: // NEG
          const negA = pop();
          if (typeof negA === 'number') {
            push(-negA);
          }
          break;

        // String
        case 20: // TO_STRING
          const toStrA = pop();
          push(String(toStrA));
          break;

        // Comparison
        case 30: // EQ
          const eqB = pop();
          const eqA = pop();
          push(eqA == eqB);
          break;
        case 31: // NEQ
          const neqB = pop();
          const neqA = pop();
          push(neqA != neqB);
          break;
        case 32: // LT
          const ltB = pop();
          const ltA = pop();
          push((ltA as any) < (ltB as any));
          break;
        case 33: // GT
          const gtB = pop();
          const gtA = pop();
          push((gtA as any) > (gtB as any));
          break;
        case 34: // LTE
          const lteB = pop();
          const lteA = pop();
          push((lteA as any) <= (lteB as any));
          break;
        case 35: // GTE
          const gteB = pop();
          const gteA = pop();
          push((gteA as any) >= (gteB as any));
          break;
        case 36: // STRICT_EQ
          const seqB = pop();
          const seqA = pop();
          push(seqA === seqB);
          break;
        case 37: // STRICT_NEQ
          const sneqB = pop();
          const sneqA = pop();
          push(sneqA !== sneqB);
          break;

        // Logical & control flow
        case 90: // NOT
          const notA = pop();
          push(!notA);
          break;
        case 91: // JUMP_IF_FALSE
          const condFalse = pop();
          if (!condFalse) {
            nextIp = instruction[1] as number;
          }
          break;
        case 92: // JUMP_IF_TRUE
          const condTrue = pop();
          if (condTrue) {
            nextIp = instruction[1] as number;
          }
          break;
        case 93: // JUMP
          nextIp = instruction[1] as number;
          break;

        // Construction
        case 100: // MAKE_ARRAY
          const arraySize = instruction[1] as number;
          const arrayElements = newStack.splice(-arraySize, arraySize);
          push(arrayElements);
          break;
        case 101: // MAKE_OBJ
          const objSize = instruction[1] as number;
          const entries = newStack.splice(-objSize * 2, objSize * 2);
          const obj: Record<string, ExprValue> = {};
          for (let i = 0; i < entries.length; i += 2) {
            const key = String(entries[i]);
            obj[key] = entries[i + 1];
          }
          push(obj);
          break;

        // Access
        case 110: // INDEX
          const index = pop();
          const target = pop();
          if (Array.isArray(target)) {
            push(target[Number(index)] ?? null);
          } else if (target && typeof target === 'object') {
            push((target as any)[String(index)] ?? null);
          } else {
            push(null);
          }
          break;
        case 111: // OPTIONAL_INDEX
          const optIndex = pop();
          const optTarget = pop();
          if (optTarget == null) {
            push(null);
          } else if (Array.isArray(optTarget)) {
            push(optTarget[Number(optIndex)] ?? null);
          } else if (typeof optTarget === 'object') {
            push((optTarget as any)[String(optIndex)] ?? null);
          } else {
            push(null);
          }
          break;

        // Control
        case 200: // RETURN
          return {
            ip: nextIp,
            stack: newStack,
            locals: newLocals,
            context,
            done: true,
            result: newStack.length > 0 ? newStack[newStack.length - 1] : null,
          };

        default:
          // For unimplemented opcodes, just continue
          break;
      }

      return {
        ip: nextIp,
        stack: newStack,
        locals: newLocals,
        context,
        done: false,
      };
    } catch (error) {
      return {
        ip: nextIp,
        stack: newStack,
        locals: newLocals,
        context,
        done: true,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private resolvePath(context: ExecutionContext, path: string): ExprValue {
    const parts = path.split('.');
    let current: any = context;
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return undefined;
      }
    }
    return current;
  }
}
