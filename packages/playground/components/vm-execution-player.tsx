'use client';

import { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, RotateCcw } from 'lucide-react';
import type { BytecodeProgram, ExecutionContext } from '@jext/core';
import { VMStepper } from '../lib/vm-stepper';
import { Button } from './ui/button';
import { Card } from './ui/card';

interface VMExecutionPlayerProps {
  program: BytecodeProgram;
  context: ExecutionContext;
}

const OPCODE_NAMES: Record<number, string> = {
  0: 'CONST',
  1: 'LOAD',
  2: 'ADD',
  3: 'SUB',
  4: 'MUL',
  5: 'DIV',
  6: 'MOD',
  7: 'NEG',
  10: 'EQ',
  11: 'NEQ',
  12: 'LT',
  13: 'GT',
  14: 'LTE',
  15: 'GTE',
  16: 'STRICT_EQ',
  17: 'STRICT_NEQ',
  20: 'NOT',
  21: 'AND',
  22: 'OR',
  40: 'JUMP',
  41: 'JUMP_IF_FALSE',
  42: 'JUMP_IF_TRUE',
  50: 'MAKE_ARRAY',
  51: 'MAKE_OBJ',
  52: 'SPREAD',
  60: 'INDEX',
  61: 'OPTIONAL_INDEX',
  70: 'RETURN',
  80: 'CALL',
  90: 'DUP',
  91: 'POP',
};

export function VMExecutionPlayer({ program, context }: VMExecutionPlayerProps) {
  const stepperRef = useRef<VMStepper>(new VMStepper(program, context));
  const [, setRenderCounter] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(500); // ms per step
  const intervalRef = useRef<NodeJS.Timeout>();

  const stepper = stepperRef.current;
  const currentStep = stepper.getCurrentState();
  const canStepForward = stepper.canStepForward();
  const canStepBackward = stepper.canStepBackward();

  const forceUpdate = () => setRenderCounter((c) => c + 1);

  // Reset stepper when program changes
  useEffect(() => {
    stepperRef.current = new VMStepper(program, context);
    setIsPlaying(false);
    forceUpdate();
  }, [program, context]);

  // Handle auto-play
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        const step = stepper.stepForward();
        forceUpdate();
        if (!step || stepper.getCurrentState().state.done) {
          setIsPlaying(false);
        }
      }, speed);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, speed]);

  const handleStepForward = () => {
    stepper.stepForward();
    forceUpdate();
  };

  const handleStepBackward = () => {
    stepper.stepBackward();
    forceUpdate();
  };

  const handleReset = () => {
    stepper.reset();
    forceUpdate();
    setIsPlaying(false);
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const formatValue = (value: any): string => {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'object') {
      if ('error' in value) return `Error: ${value.message}`;
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  const formatInstruction = (instruction: any): string => {
    if (!instruction) return '';
    const opcode = instruction[0];
    const opcodeName = OPCODE_NAMES[opcode] || `OP_${opcode}`;
    const args = instruction.slice(1);

    if (args.length === 0) return opcodeName;

    // Format special cases
    if (opcode === 0) {
      // CONST
      return `${opcodeName} ${formatValue(args[0])}`;
    }
    if (opcode === 1) {
      // LOAD
      const slotPath = program.slots?.[args[0]] || '?';
      return `${opcodeName} [${args[0]}] (${slotPath})`;
    }
    if (opcode === 40 || opcode === 41 || opcode === 42) {
      // JUMP instructions
      return `${opcodeName} -> ${args[0]}`;
    }

    return `${opcodeName} ${args.join(', ')}`;
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Controls */}
      <Card className="p-4">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleReset} disabled={isPlaying}>
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleStepBackward}
            disabled={!canStepBackward || isPlaying}
          >
            <SkipBack className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            onClick={handlePlayPause}
            disabled={currentStep.state.done && !canStepForward}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleStepForward}
            disabled={!canStepForward || isPlaying}
          >
            <SkipForward className="h-4 w-4" />
          </Button>
          <div className="ml-auto text-sm text-muted-foreground">
            Step {currentStep.instructionIndex} / {program.code.length - 1}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
        {/* Bytecode Instructions */}
        <Card className="p-4 overflow-auto">
          <h3 className="font-semibold mb-2 text-sm">Bytecode Instructions</h3>
          <div className="font-mono text-xs space-y-1">
            {program.code.map((instruction, index) => {
              const isCurrent = index === currentStep.state.ip;
              const isPast = index < currentStep.state.ip;

              return (
                <div
                  key={index}
                  className={`px-2 py-1 rounded transition-colors ${
                    isCurrent
                      ? 'bg-blue-500/20 border-l-2 border-blue-500 font-bold'
                      : isPast
                        ? 'text-muted-foreground/50'
                        : ''
                  }`}
                >
                  <span className="text-muted-foreground mr-2">
                    {index.toString().padStart(3, '0')}
                  </span>
                  {formatInstruction(instruction)}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Stack Visualization */}
        <Card className="p-4 overflow-auto">
          <h3 className="font-semibold mb-2 text-sm">Stack</h3>
          <div className="space-y-2">
            {currentStep.state.stack.length === 0 ? (
              <div className="text-muted-foreground text-sm italic">Empty</div>
            ) : (
              <div className="flex flex-col-reverse gap-1">
                {currentStep.state.stack.map((value, index) => (
                  <div
                    key={index}
                    className="px-3 py-2 bg-secondary/50 rounded border-l-2 border-green-500 font-mono text-xs animate-in slide-in-from-bottom"
                  >
                    <div className="text-muted-foreground text-[10px] mb-1">
                      [{currentStep.state.stack.length - 1 - index}]{' '}
                      {index === currentStep.state.stack.length - 1 && '← top'}
                    </div>
                    <div className="break-all">{formatValue(value)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Result */}
          {currentStep.state.done && (
            <div className="mt-4 pt-4 border-t">
              <h4 className="font-semibold text-sm mb-2">Result</h4>
              <div className="px-3 py-2 bg-green-500/20 rounded border-l-2 border-green-500 font-mono text-xs">
                {formatValue(currentStep.state.result)}
              </div>
            </div>
          )}

          {/* Error */}
          {currentStep.state.error && (
            <div className="mt-4 pt-4 border-t">
              <h4 className="font-semibold text-sm mb-2 text-red-500">Error</h4>
              <div className="px-3 py-2 bg-red-500/20 rounded border-l-2 border-red-500 font-mono text-xs">
                {currentStep.state.error}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
