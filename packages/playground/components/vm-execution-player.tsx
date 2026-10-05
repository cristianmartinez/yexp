'use client';

import type { BytecodeProgram, ExecutionContext, ExprValue } from '@cristianmartinez/yexp';
import { Pause, Play, RotateCcw, SkipBack, SkipForward } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { formatInstruction } from '../lib/format-instruction';
import { VMStepper } from '../lib/vm-stepper';

interface VMExecutionPlayerProps {
  program: BytecodeProgram;
  context: ExecutionContext;
}
const formatValue = (value: ExprValue | undefined) =>
  value === undefined ? 'undefined' : JSON.stringify(value, null, 2);

export function VMExecutionPlayer({ program, context }: VMExecutionPlayerProps) {
  const stepper = useMemo(() => new VMStepper(program, context), [program, context]);
  const [, refresh] = useState(0);
  const [playing, setPlaying] = useState(false);
  const current = stepper.getCurrentState();
  const forward = stepper.canStepForward();
  const backward = stepper.canStepBackward();

  useEffect(() => {
    setPlaying(false);
  }, [stepper]);
  useEffect(() => {
    if (!playing) return;
    const interval = window.setInterval(() => {
      stepper.stepForward();
      refresh((value) => value + 1);
      if (stepper.getCurrentState().state.done) setPlaying(false);
    }, 500);
    return () => window.clearInterval(interval);
  }, [playing, stepper]);

  function step(direction: 'forward' | 'backward') {
    if (direction === 'forward') stepper.stepForward();
    else stepper.stepBackward();
    refresh((value) => value + 1);
  }
  function reset() {
    stepper.reset();
    setPlaying(false);
    refresh((value) => value + 1);
  }

  return (
    <div className="vm-player">
      <div className="vm-toolbar">
        <button
          className="vm-play"
          type="button"
          onClick={() => setPlaying(!playing)}
          disabled={!forward}
          aria-label={playing ? 'Pause execution' : 'Play execution'}
        >
          {playing ? <Pause size={14} /> : <Play size={14} />}
          {playing ? 'Pause' : 'Run'}
        </button>
        <button
          type="button"
          onClick={() => step('backward')}
          disabled={!backward || playing}
          aria-label="Step backward"
        >
          <SkipBack size={14} />
        </button>
        <button
          type="button"
          onClick={() => step('forward')}
          disabled={!forward || playing}
          aria-label="Step forward"
        >
          <SkipForward size={14} />
          <span>Step</span>
        </button>
        <button type="button" onClick={reset} aria-label="Reset execution">
          <RotateCcw size={14} />
        </button>
        <div className="vm-run-status">
          <span className={current.state.done ? 'vm-status-dot complete' : 'vm-status-dot'} />
          {current.state.done ? 'Complete' : playing ? 'Running' : 'Ready'}
          <code>IP {String(current.state.ip).padStart(3, '0')}</code>
        </div>
      </div>
      <div className="vm-panels">
        <section className="vm-instructions" aria-label="Bytecode instructions">
          <div className="vm-panel-heading">
            <span>Bytecode</span>
            <span>{program.code.length} instructions</span>
          </div>
          <div className="vm-instruction-list">
            {program.code.map((instruction, index) => (
              <div
                key={index}
                className={`vm-instruction ${!current.state.done && index === current.state.ip ? 'current' : ''}`}
                aria-current={
                  !current.state.done && index === current.state.ip ? 'step' : undefined
                }
              >
                <span className="vm-instruction-pointer">
                  {!current.state.done && index === current.state.ip ? '→' : ''}
                </span>
                <span className="vm-address">{String(index).padStart(3, '0')}</span>
                <code>{formatInstruction(instruction, program)}</code>
              </div>
            ))}
          </div>
        </section>
        <section className="vm-stack" aria-label="Stack values">
          <div className="vm-panel-heading">
            <span>Stack</span>
            <span>{current.state.stack.length} values</span>
          </div>
          {current.state.stack.length === 0 ? (
            <div className="vm-empty">
              <span>[ ]</span>No values on the stack.
              <small>Step forward to execute an instruction.</small>
            </div>
          ) : (
            <div className="vm-stack-values">
              {current.state.stack.map((value, index) => (
                <div key={index} className="vm-stack-value">
                  <span className="vm-stack-index">
                    {index === current.state.stack.length - 1
                      ? 'TOP'
                      : String(index).padStart(2, '0')}
                  </span>
                  <pre>{formatValue(value)}</pre>
                </div>
              ))}
            </div>
          )}
          <div className={`vm-final-result ${current.state.done ? 'done' : ''}`}>
            <span>Result</span>
            <output aria-live="polite">
              {current.state.done ? formatValue(current.state.result) : '—'}
            </output>
          </div>
        </section>
      </div>
    </div>
  );
}
