'use client';

import { useState, useMemo } from 'react';
import { tokenize, parse, compile, evaluate } from '@jext/core';
import type { ExecutionContext, BytecodeProgram } from '@jext/core';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Play, Plus, Trash2, ChevronDown, ChevronRight, AlertCircle } from 'lucide-react';
import { JextEditor } from './jext-editor';
import { JsonViewer } from './json-viewer';

interface Cell {
  id: string;
  expression: string;
  result: any;
  error: string | null;
  bytecode: BytecodeProgram | null;
  showBytecode: boolean;
}

interface NotebookProps {
  initialContext: ExecutionContext;
}

export function Notebook({ initialContext }: NotebookProps) {
  const [cells, setCells] = useState<Cell[]>([
    {
      id: crypto.randomUUID(),
      expression: 'data.items.length',
      result: null,
      error: null,
      bytecode: null,
      showBytecode: false,
    },
  ]);

  // Execute all cells sequentially, accumulating results
  const executeAllCells = useMemo(() => {
    let context = { ...initialContext };
    const results: any[] = [];

    return cells.map((cell, index) => {
      if (!cell.expression.trim()) {
        return {
          ...cell,
          result: null,
          error: null,
          bytecode: null,
        };
      }

      try {
        // Add previous cell results to context under $ key
        const executionContext = {
          ...context,
          $: index > 0 ? results[index - 1] : undefined,
          $$: results, // All previous results
        } as any as ExecutionContext;

        const tokens = tokenize(cell.expression);
        const ast = parse(tokens);
        const program = compile(ast);
        const value = evaluate(program, executionContext);

        results.push(value);

        return {
          ...cell,
          result: value,
          error: null,
          bytecode: program,
        };
      } catch (e: any) {
        results.push(null);
        return {
          ...cell,
          result: null,
          error: e.message,
          bytecode: null,
        };
      }
    });
  }, [cells, initialContext]);

  const executedCells = executeAllCells;

  const updateCell = (id: string, expression: string) => {
    setCells((prev) => prev.map((cell) => (cell.id === id ? { ...cell, expression } : cell)));
  };

  const addCell = (afterId?: string) => {
    const newCell: Cell = {
      id: crypto.randomUUID(),
      expression: '',
      result: null,
      error: null,
      bytecode: null,
      showBytecode: false,
    };

    if (!afterId) {
      setCells((prev) => [...prev, newCell]);
      return;
    }

    setCells((prev) => {
      const index = prev.findIndex((c) => c.id === afterId);
      return [...prev.slice(0, index + 1), newCell, ...prev.slice(index + 1)];
    });
  };

  const removeCell = (id: string) => {
    if (cells.length === 1) return;
    setCells((prev) => prev.filter((c) => c.id !== id));
  };

  const toggleBytecode = (id: string) => {
    setCells((prev) =>
      prev.map((cell) => (cell.id === id ? { ...cell, showBytecode: !cell.showBytecode } : cell)),
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Each cell can reference the previous cell's result using{' '}
            <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs">$</code> or all
            previous results using{' '}
            <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs">$$</code>
          </p>
        </div>
        <Button onClick={() => addCell()} size="sm">
          <Plus className="w-4 h-4" />
          Add Cell
        </Button>
      </div>

      <div className="space-y-3">
        {executedCells.map((cell, index) => (
          <Card key={cell.id} className="relative">
            <CardContent className="p-4 space-y-3">
              {/* Cell Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-muted-foreground">[{index}]</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2"
                    onClick={() => toggleBytecode(cell.id)}
                  >
                    {cell.showBytecode ? (
                      <ChevronDown className="w-3 h-3" />
                    ) : (
                      <ChevronRight className="w-3 h-3" />
                    )}
                    <span className="text-xs">Bytecode</span>
                  </Button>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => addCell(cell.id)}
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                  {cells.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-destructive hover:text-destructive"
                      onClick={() => removeCell(cell.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Expression Input */}
              <div className="rounded-md overflow-hidden border border-border">
                <JextEditor
                  value={cell.expression}
                  onChange={(expr) => updateCell(cell.id, expr)}
                  context={initialContext}
                  height="80px"
                />
              </div>

              {/* Result or Error */}
              {cell.expression.trim() && (
                <>
                  <Separator />
                  {cell.error ? (
                    <div className="flex items-start gap-2 p-3 border border-destructive/50 rounded-md bg-destructive/10">
                      <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                      <pre className="text-destructive text-xs font-mono whitespace-pre-wrap flex-1">
                        {cell.error}
                      </pre>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Play className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Output</span>
                      </div>
                      <div className="rounded-md overflow-hidden border border-border">
                        <JsonViewer value={cell.result} height="120px" />
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Bytecode (collapsible) */}
              {cell.showBytecode && cell.bytecode && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-muted-foreground">Instructions</div>
                    <div className="font-mono text-xs space-y-0.5 max-h-[200px] overflow-y-auto p-2 bg-muted/50 rounded-md">
                      {cell.bytecode.code.map((inst, i) => (
                        <div key={i} className="flex gap-2">
                          <span className="text-muted-foreground w-6 text-right">{i}:</span>
                          <span className="text-primary">{inst.join(' ')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
