// Uses the actual VM from @jext/core with debug mode enabled
// This ensures the playground visualizer always matches production behavior

import type { BytecodeProgram, ExprValue, ExecutionContext } from '@jext/core';
import { evaluate } from '@jext/core';

export interface VMState {
  ip: number;
  stack: readonly ExprValue[];
  context: ExecutionContext;
  done: boolean;
  result?: ExprValue;
}

export interface ExecutionStep {
  state: VMState;
  instruction: any;
  instructionIndex: number;
}

export class VMStepper {
  private program: BytecodeProgram;
  private context: ExecutionContext;
  private allSteps: ExecutionStep[] = [];
  private currentStep = 0;

  constructor(program: BytecodeProgram, context: ExecutionContext) {
    this.program = program;
    this.context = context;
    this.generateAllSteps();
  }

  private generateAllSteps() {
    const steps: ExecutionStep[] = [];

    // Initial state
    steps.push({
      state: {
        ip: 0,
        stack: [],
        context: this.context,
        done: false,
      },
      instruction: this.program.code[0],
      instructionIndex: 0,
    });

    // Run the actual VM with debug mode to capture all steps
    const result = evaluate(this.program, this.context, {
      onStep: (state) => {
        steps.push({
          state: {
            ...state,
            context: this.context,
            done: false,
          },
          instruction: state.ip < this.program.code.length ? this.program.code[state.ip] : null,
          instructionIndex: state.ip,
        });
      },
    });

    // Add final state
    const lastStep = steps[steps.length - 1];
    if (lastStep) {
      steps.push({
        state: {
          ip: lastStep.state.ip,
          stack: lastStep.state.stack,
          context: this.context,
          done: true,
          result,
        },
        instruction: null,
        instructionIndex: lastStep.state.ip,
      });
    }

    this.allSteps = steps;
  }

  getCurrentState(): ExecutionStep {
    return this.allSteps[this.currentStep] || this.allSteps[0];
  }

  canStepForward(): boolean {
    return this.currentStep < this.allSteps.length - 1;
  }

  canStepBackward(): boolean {
    return this.currentStep > 0;
  }

  stepForward(): ExecutionStep | null {
    if (this.canStepForward()) {
      this.currentStep++;
      return this.getCurrentState();
    }
    return null;
  }

  stepBackward(): ExecutionStep | null {
    if (this.canStepBackward()) {
      this.currentStep--;
      return this.getCurrentState();
    }
    return null;
  }

  reset() {
    this.currentStep = 0;
  }
}
