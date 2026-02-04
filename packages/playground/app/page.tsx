'use client';

import { useState, useMemo } from 'react';
import { tokenize, parse, compile, evaluate } from '@expr/core';
import type { ExecutionContext } from '@expr/core';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import {
  Code2,
  PlayCircle,
  Database,
  Binary,
  AlertCircle,
  BookOpen,
  Zap,
  PanelLeft,
  PanelLeftClose,
} from 'lucide-react';
import { Notebook } from '@/components/notebook';

type Mode = 'playground' | 'notebook';

export default function Home() {
  const [mode, setMode] = useState<Mode>('playground');
  const [showContext, setShowContext] = useState(true);
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
    if (mode !== 'playground') return { value: null, error: null, bytecode: null };

    try {
      const context: ExecutionContext = JSON.parse(contextJSON);
      // Full compilation pipeline: tokenize -> parse -> compile
      const tokens = tokenize(expression);
      const ast = parse(tokens);
      const program = compile(ast);
      const value = evaluate(program, context);
      return { value, error: null, bytecode: program };
    } catch (e: any) {
      return { value: null, error: e.message, bytecode: null };
    }
  }, [expression, contextJSON, mode]);

  return (
    <div className="min-h-screen p-6 md:p-8">
      <div className="max-w-[1800px] mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Code2 className="w-8 h-8" />
            <h1 className="text-4xl font-bold">Expr Playground</h1>
          </div>
          <div className="flex gap-2">
            <Button
              variant={mode === 'playground' ? 'default' : 'outline'}
              onClick={() => setMode('playground')}
              className="gap-2"
            >
              <Zap className="w-4 h-4" />
              Playground
            </Button>
            <Button
              variant={mode === 'notebook' ? 'default' : 'outline'}
              onClick={() => setMode('notebook')}
              className="gap-2"
            >
              <BookOpen className="w-4 h-4" />
              Notebook
            </Button>
          </div>
        </div>
        <p className="text-muted-foreground">
          {mode === 'playground'
            ? 'Explore and test Expr expressions with real-time evaluation and bytecode inspection'
            : 'Execute expressions sequentially with results flowing down to subsequent cells'}
        </p>

        <Separator />

        {mode === 'notebook' ? (
          <div className="flex gap-4">
            {/* Toggle Button */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowContext(!showContext)}
              className="h-10 w-10 shrink-0"
              title={showContext ? 'Hide context' : 'Show context'}
            >
              {showContext ? (
                <PanelLeftClose className="w-4 h-4" />
              ) : (
                <PanelLeft className="w-4 h-4" />
              )}
            </Button>

            {/* Context Editor - Collapsible */}
            {showContext && (
              <Card className="w-[280px] shrink-0 h-fit sticky top-6">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Database className="w-4 h-4" />
                    Context
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={contextJSON}
                    onChange={(e) => setContextJSON(e.target.value)}
                    className="min-h-[300px] font-mono text-xs resize-none"
                    placeholder="Enter context JSON..."
                  />
                </CardContent>
              </Card>
            )}

            {/* Notebook Cells */}
            <div className="flex-1 min-w-0">
              <Notebook initialContext={parsedContext} />
            </div>
          </div>
        ) : (
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
                <CardContent>
                  <Textarea
                    value={expression}
                    onChange={(e) => setExpression(e.target.value)}
                    className="min-h-[120px] font-mono text-sm"
                    placeholder="data.items[0].name"
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
                    <pre className="text-sm font-mono whitespace-pre-wrap p-4 bg-muted rounded-md">
                      {JSON.stringify(result.value, null, 2)}
                    </pre>
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
                  <CardContent>
                    <Tabs defaultValue="instructions" className="w-full">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="instructions">Instructions</TabsTrigger>
                        <TabsTrigger value="slots">Slots</TabsTrigger>
                        <TabsTrigger value="constants">Constants</TabsTrigger>
                      </TabsList>
                      <TabsContent value="instructions" className="space-y-1 mt-4">
                        <div className="font-mono text-xs space-y-1 max-h-[300px] overflow-y-auto p-3 bg-muted rounded-md">
                          {result.bytecode.code.map((inst, i) => (
                            <div key={i} className="flex gap-3">
                              <span className="text-muted-foreground w-8 text-right">{i}:</span>
                              <span className="text-primary font-medium">{inst.join(' ')}</span>
                            </div>
                          ))}
                        </div>
                      </TabsContent>
                      <TabsContent value="slots" className="mt-4">
                        <pre className="text-xs font-mono p-3 bg-muted rounded-md">
                          {result.bytecode.slots.length > 0
                            ? result.bytecode.slots.join(', ')
                            : 'No slots used'}
                        </pre>
                      </TabsContent>
                      <TabsContent value="constants" className="mt-4">
                        <pre className="text-xs font-mono p-3 bg-muted rounded-md whitespace-pre-wrap">
                          {JSON.stringify(result.bytecode.constants, null, 2)}
                        </pre>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
