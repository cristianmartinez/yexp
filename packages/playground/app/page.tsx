'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { tokenize, parse, compile, evaluate } from '@expr/core';
import type { ExecutionContext } from '@expr/core';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Code2, PlayCircle, Database, Binary, AlertCircle, BookOpen, Zap } from 'lucide-react';
import { ExprEditor } from '@/components/expr-editor';
import { JsonViewer } from '@/components/json-viewer';

export default function PlaygroundPage() {
  const [expression, setExpression] = useState('data.items[0].name');
  const [contextJSON, setContextJSON] = useState(`{
  "data": {
    "items": [
      { "name": "Alice", "age": 25 },
      { "name": "Bob", "age": 30 }
    ]
  },
  "state": {},
  "env": {}
}`);

  const parsedContext = useMemo(() => {
    try {
      return JSON.parse(contextJSON);
    } catch {
      return { data: {}, state: {}, env: {} };
    }
  }, [contextJSON]);

  const result = useMemo(() => {
    try {
      const context: ExecutionContext = parsedContext;
      const tokens = tokenize(expression);
      const ast = parse(tokens);
      const program = compile(ast);
      const value = evaluate(program, context);
      return { value, error: null, bytecode: program };
    } catch (e: any) {
      return { value: null, error: e.message, bytecode: null };
    }
  }, [expression, parsedContext]);

  return (
    <div className="min-h-screen p-6 md:p-8">
      <div className="max-w-[1800px] mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Code2 className="w-8 h-8" />
            <h1 className="text-4xl font-bold">Expr Playground</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="default" className="gap-2">
              <Zap className="w-4 h-4" />
              Playground
            </Button>
            <Button variant="outline" asChild className="gap-2">
              <Link href="/notebook">
                <BookOpen className="w-4 h-4" />
                Notebook
              </Link>
            </Button>
          </div>
        </div>
        <p className="text-muted-foreground">
          Explore and test Expr expressions with real-time evaluation and bytecode inspection
        </p>

        <Separator />

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Left Column: Input */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code2 className="w-5 h-5" />
                  Expression
                </CardTitle>
                <CardDescription>Write your Expr expression to evaluate</CardDescription>
              </CardHeader>
              <CardContent className="p-0 overflow-hidden">
                <ExprEditor
                  value={expression}
                  onChange={setExpression}
                  context={parsedContext}
                  height="120px"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Context
                </CardTitle>
                <CardDescription>JSON data available to your expression</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={contextJSON}
                  onChange={(e) => setContextJSON(e.target.value)}
                  className="min-h-[300px] font-mono text-xs"
                  placeholder="Enter context JSON..."
                />
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Output */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PlayCircle className="w-5 h-5" />
                  Result
                </CardTitle>
                <CardDescription>Evaluated output from your expression</CardDescription>
              </CardHeader>
              <CardContent>
                {result.error ? (
                  <div className="flex items-start gap-3 p-4 border border-destructive/50 rounded-md bg-destructive/10">
                    <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
                    <pre className="text-destructive text-sm font-mono whitespace-pre-wrap flex-1">
                      {result.error}
                    </pre>
                  </div>
                ) : (
                  <div className="rounded-md overflow-hidden border border-border">
                    <JsonViewer value={result.value} height="200px" />
                  </div>
                )}
              </CardContent>
            </Card>

            {result.bytecode && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Binary className="w-5 h-5" />
                    Bytecode
                  </CardTitle>
                  <CardDescription>Compiled bytecode representation</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Instructions */}
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Instructions</h4>
                    <div className="font-mono text-xs space-y-1 max-h-[300px] overflow-y-auto p-3 bg-muted rounded-md">
                      {result.bytecode.code.map((inst, i) => (
                        <div key={i} className="flex gap-3">
                          <span className="text-muted-foreground w-8 text-right">{i}:</span>
                          <span className="text-primary font-medium">{inst.join(' ')}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Slots */}
                  {result.bytecode.slots.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Slots</h4>
                      <pre className="text-xs font-mono p-3 bg-muted rounded-md">
                        {result.bytecode.slots.join(', ')}
                      </pre>
                    </div>
                  )}

                  {/* Constants */}
                  {result.bytecode.constants.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Constants</h4>
                      <div className="rounded-md overflow-hidden border border-border">
                        <JsonViewer value={result.bytecode.constants} height="150px" />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
