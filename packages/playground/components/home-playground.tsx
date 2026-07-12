'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, RotateCcw } from 'lucide-react';
import { compile, evaluate, Opcode, type ExprValue } from '@cristianmartinez/yexp';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

// Sample input shared by every preset. Expressions reference it via `$`.
const SAMPLE_INPUT = {
  price: 100,
  quantity: 3,
  discount: 10,
  items: [
    { name: 'Ada', age: 30 },
    { name: 'Linus', age: 19 },
    { name: 'Grace', age: 41 },
  ],
  user: { name: 'Ada', roles: ['admin'] },
};

const PRESETS = [
  '1 + 2 * 3',
  '$.price * $.quantity * (1 - $.discount / 100)',
  '$.items.filter(x => x.age > 25).map(x => x.name)',
  '$.items.length > 2 ? "many" : "few"',
];

interface Step {
  /** Index into program.code of the instruction executed at this frame. */
  codeIndex: number;
  /** Stack contents after the instruction ran (bottom → top). */
  stack: ExprValue[];
  /** Values popped off the stack by this instruction. */
  popped: ExprValue[];
  /** Values pushed onto the stack by this instruction. */
  pushed: ExprValue[];
  done: boolean;
  result?: ExprValue;
}

function formatValue(value: ExprValue | undefined): string {
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  if (typeof value === 'string') return `"${value}"`;
  if (typeof value === 'object') {
    if ('error' in value) return `${(value as { error: string }).error}`;
    return JSON.stringify(value);
  }
  return String(value);
}

function formatInstruction(program: { slots: string[]; constants: ExprValue[] }, ins: unknown[]) {
  const op = ins[0] as number;
  const name = Opcode[op] ?? `OP_${op}`;
  const args = ins.slice(1);
  if (op === Opcode.CONST) return { name, detail: formatValue(program.constants[args[0] as number]) };
  if (op === Opcode.LOAD) return { name, detail: program.slots[args[0] as number] ?? '?' };
  if (op === Opcode.CALL) return { name, detail: String(args[0]) };
  if (args.length) return { name, detail: args.map((a) => formatValue(a as ExprValue)).join(', ') };
  return { name, detail: '' };
}

/** Longest common prefix length between two stacks (compared structurally). */
function commonPrefix(a: ExprValue[], b: ExprValue[]): number {
  const n = Math.min(a.length, b.length);
  let i = 0;
  for (; i < n; i++) {
    if (JSON.stringify(a[i]) !== JSON.stringify(b[i])) break;
  }
  return i;
}

function useExecution(source: string) {
  return useMemo(() => {
    try {
      const program = compile(source);
      const steps: Step[] = [];
      let prevCodeIndex = 0;
      let prevStack: ExprValue[] = [];

      const result = evaluate(program, SAMPLE_INPUT, {
        onStep: ({ ip, stack }) => {
          const curr = [...stack];
          const p = commonPrefix(prevStack, curr);
          steps.push({
            codeIndex: prevCodeIndex,
            stack: curr,
            popped: prevStack.slice(p),
            pushed: curr.slice(p),
            done: false,
          });
          prevCodeIndex = ip;
          prevStack = curr;
        },
      });

      // Final frame: the RETURN that produces the program result.
      steps.push({
        codeIndex: prevCodeIndex,
        stack: prevStack,
        popped: [],
        pushed: [],
        done: true,
        result,
      });

      return { program, steps, error: null as string | null };
    } catch (err) {
      return {
        program: null,
        steps: [] as Step[],
        error: err instanceof Error ? err.message : 'Failed to compile expression',
      };
    }
  }, [source]);
}

export function HomePlayground() {
  const [source, setSource] = useState(PRESETS[1]);
  const { program, steps, error } = useExecution(source);

  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const lastIndex = Math.max(0, steps.length - 1);
  const clamped = Math.min(index, lastIndex);
  const step = steps[clamped];

  // Reset the scrubber whenever the program changes.
  useEffect(() => {
    setIndex(0);
    setPlaying(false);
  }, [source]);

  // Auto-advance while playing.
  useEffect(() => {
    if (!playing) return;
    timer.current = setInterval(() => {
      setIndex((i) => {
        if (i >= lastIndex) {
          setPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, 700);
    return () => clearInterval(timer.current);
  }, [playing, lastIndex]);

  return (
    <div className="min-w-0 overflow-hidden rounded-sm border border-border bg-card">
      {/* Expression input */}
      <div className="border-b border-border p-4 sm:p-5">
        <label htmlFor="expr" className="text-xs font-medium text-muted-foreground">
          Expression
        </label>
        <input
          id="expr"
          value={source}
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="off"
          onChange={(e) => setSource(e.target.value)}
          className="mt-1.5 w-full rounded-sm border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-[#FF006F] focus:ring-1 focus:ring-[#FF006F]"
        />
        <div className="mt-3 flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setSource(p)}
              className={cn(
                'max-w-full truncate rounded-sm border px-2.5 py-1 font-mono text-xs transition-colors',
                p === source
                  ? 'border-[#FF006F] bg-[#FF006F] text-white'
                  : 'border-border text-muted-foreground hover:border-[#FF006F]/60 hover:text-foreground',
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="p-5 font-mono text-sm text-destructive">{error}</div>
      ) : (
        <>
          {/* Timeline */}
          <div className="border-b border-border p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8 rounded-sm"
                aria-label="Reset"
                onClick={() => {
                  setIndex(0);
                  setPlaying(false);
                }}
              >
                <RotateCcw />
              </Button>
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8 rounded-sm"
                aria-label="Step back"
                disabled={clamped === 0}
                onClick={() => {
                  setPlaying(false);
                  setIndex((i) => Math.max(0, i - 1));
                }}
              >
                <SkipBack />
              </Button>
              <Button
                size="icon"
                className="h-8 w-8 rounded-sm bg-[#FF006F] text-white hover:bg-[#FF006F]/90"
                aria-label={playing ? 'Pause' : 'Play'}
                onClick={() => {
                  if (clamped >= lastIndex) setIndex(0);
                  setPlaying((p) => !p);
                }}
              >
                {playing ? <Pause /> : <Play />}
              </Button>
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8 rounded-sm"
                aria-label="Step forward"
                disabled={clamped >= lastIndex}
                onClick={() => {
                  setPlaying(false);
                  setIndex((i) => Math.min(lastIndex, i + 1));
                }}
              >
                <SkipForward />
              </Button>
              <span className="ml-auto font-mono text-xs text-muted-foreground">
                {clamped + 1} / {steps.length}
              </span>
            </div>

            <input
              type="range"
              min={0}
              max={lastIndex}
              value={clamped}
              onChange={(e) => {
                setPlaying(false);
                setIndex(Number(e.target.value));
              }}
              aria-label="Timeline"
              className="mt-3 w-full accent-[#FF006F]"
            />

            {/* Op pills double as a scrubbable timeline */}
            <div className="mt-2 flex gap-1 overflow-x-auto pb-1">
              {steps.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setPlaying(false);
                    setIndex(i);
                  }}
                  title={`Step ${i + 1}`}
                  className={cn(
                    'shrink-0 rounded-sm px-2 py-1 font-mono text-[11px] transition-colors',
                    i === clamped
                      ? 'bg-[#FF006F] text-white'
                      : i < clamped
                        ? 'bg-muted text-muted-foreground'
                        : 'text-muted-foreground/60 hover:text-foreground',
                  )}
                >
                  {s.done ? 'END' : (Opcode[program!.code[s.codeIndex][0] as number] ?? '?')}
                </button>
              ))}
            </div>
          </div>

          {/* Bytecode + stack */}
          <div className="grid gap-px bg-border sm:grid-cols-2">
            {/* Bytecode list */}
            <div className="bg-card p-4 sm:p-5">
              <h3 className="mb-3 text-xs font-medium text-muted-foreground">Bytecode</h3>
              <ol className="space-y-0.5 font-mono text-xs">
                {program!.code.map((ins, i) => {
                  const { name, detail } = formatInstruction(program!, ins as unknown[]);
                  const active = !step?.done && i === step?.codeIndex;
                  const past = step?.done ? true : i < (step?.codeIndex ?? 0);
                  return (
                    <li
                      key={i}
                      className={cn(
                        'flex items-baseline gap-2 rounded-sm px-2 py-1',
                        active && 'bg-[#FF006F] text-white',
                        !active && past && 'text-muted-foreground/50',
                      )}
                    >
                      <span className="tabular-nums opacity-60">
                        {i.toString().padStart(2, '0')}
                      </span>
                      <span className="font-medium">{name}</span>
                      {detail && (
                        <span className={cn('truncate', active ? 'opacity-80' : 'text-muted-foreground')}>
                          {detail}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ol>
            </div>

            {/* Stack + mutation + result */}
            <div className="bg-card p-4 sm:p-5">
              <h3 className="mb-3 text-xs font-medium text-muted-foreground">Stack</h3>

              {/* Mutation summary for this operation */}
              {step && (step.popped.length > 0 || step.pushed.length > 0) && (
                <div className="mb-3 space-y-1 font-mono text-xs">
                  {step.popped.length > 0 && (
                    <div className="text-muted-foreground">
                      <span className="text-destructive">pop</span>{' '}
                      {step.popped.map(formatValue).join(', ')}
                    </div>
                  )}
                  {step.pushed.length > 0 && (
                    <div className="text-muted-foreground">
                      <span className="text-foreground">push</span>{' '}
                      <span className="text-foreground">{step.pushed.map(formatValue).join(', ')}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Live stack, top first */}
              {step && step.stack.length > 0 ? (
                <div className="space-y-1">
                  {[...step.stack].reverse().map((value, ri) => {
                    const depth = step.stack.length - 1 - ri;
                    const isTop = ri === 0;
                    const justPushed =
                      isTop && step.pushed.length > 0 && !step.done;
                    return (
                      <div
                        key={depth}
                        className={cn(
                          'flex items-center justify-between gap-2 rounded-sm border px-3 py-1.5 font-mono text-xs',
                          justPushed
                            ? 'border-foreground bg-muted'
                            : 'border-border text-muted-foreground',
                        )}
                      >
                        <span className="truncate">{formatValue(value)}</span>
                        <span className="shrink-0 text-[10px] opacity-50">
                          {isTop ? 'top' : depth}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="font-mono text-xs italic text-muted-foreground/60">empty</div>
              )}

              {/* Final result */}
              {step?.done && (
                <div className="mt-4 border-t border-border pt-4">
                  <h4 className="mb-2 text-xs font-medium text-muted-foreground">Result</h4>
                  <div className="rounded-sm border border-[#FF006F] bg-muted px-3 py-2 font-mono text-sm">
                    {formatValue(step.result)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
