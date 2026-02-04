'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { tokenize, parse, compile, evaluate } from '@jext/core';
import type { ExecutionContext } from '@jext/core';
import { Code2, PlayCircle, Database, AlertCircle, FileCode } from 'lucide-react';
import { JextEditor } from '@/components/jext-editor';
import { JsonEditor } from '@/components/json-editor';
import { JsonViewer } from '@/components/json-viewer';
import { PageHeader } from '@/components/page-header';
import { ExamplesPanel } from '@/components/examples-panel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { examples, type Example } from '@/lib/examples';
import Split from 'react-split';

export default function PlaygroundPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const exampleId = searchParams.get('example');

  const [selectedExampleId, setSelectedExampleId] = useState<string | undefined>(
    exampleId || undefined
  );
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

  // Load example on mount if URL has example param
  useEffect(() => {
    if (exampleId) {
      const example = examples.find((ex) => ex.id === exampleId);
      if (example) {
        setExpression(example.expression);
        setContextJSON(example.context);
        setSelectedExampleId(example.id);
      }
    }
  }, []); // Only run on mount

  const handleSelectExample = (example: Example) => {
    setExpression(example.expression);
    setContextJSON(example.context);
    setSelectedExampleId(example.id);

    // Update URL
    const params = new URLSearchParams();
    params.set('example', example.id);
    router.push(`?${params.toString()}`);
  };

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
      return { value, error: null, bytecode: program, ast, tokens };
    } catch (e: any) {
      return { value: null, error: e.message, bytecode: null, ast: null, tokens: null };
    }
  }, [expression, parsedContext]);

  return (
    <div className="h-screen flex flex-col">
      <div className="px-6 py-4 border-b">
        <PageHeader currentPage="playground" />
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Examples Navigation */}
        <div className="w-80 border-r flex flex-col overflow-hidden bg-card">
          <div className="px-4 py-3 border-b bg-muted/30">
            <h2 className="text-sm font-semibold text-foreground">Examples</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Try different expressions
            </p>
          </div>
          <ExamplesPanel
            selectedId={selectedExampleId}
            onSelectExample={handleSelectExample}
          />
        </div>

        {/* Right Side: Playground */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Split
            className="flex-1 split split-vertical"
            direction="vertical"
            sizes={[25, 75]}
            minSize={[150, 400]}
            gutterSize={4}
          >
            {/* Expression panel */}
            <div className="border-b flex flex-col overflow-hidden">
              <div className="px-4 py-2 border-b bg-muted/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Code2 className="w-4 h-4" />
                    Expression
                  </div>
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button variant="outline" size="sm" className="h-7 gap-1">
                        <FileCode className="w-3.5 h-3.5" />
                        <span className="text-xs">Inspector</span>
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-[800px] sm:max-w-[800px] flex flex-col p-0">
                      <SheetHeader className="px-6 py-4 border-b">
                        <SheetTitle>Expression Inspector</SheetTitle>
                        <SheetDescription>
                          View the AST, bytecode, and compiled output
                        </SheetDescription>
                      </SheetHeader>
                      <div className="flex-1 overflow-hidden p-6">
                        <Tabs defaultValue="bytecode" className="flex flex-col h-full">
                          <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="bytecode">Bytecode</TabsTrigger>
                            <TabsTrigger value="ast">AST</TabsTrigger>
                            <TabsTrigger value="json">Compiled JSON</TabsTrigger>
                          </TabsList>

                          <TabsContent value="bytecode" className="flex-1 overflow-auto mt-4 space-y-4">
                            {result.bytecode && (
                              <>
                                {/* Main Program */}
                                <div className="space-y-2">
                                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    Main Program
                                  </div>
                                  <div className="font-mono text-xs space-y-0.5 p-3 bg-muted/50 border rounded">
                                    {result.bytecode.code.map((inst, i) => (
                                      <div key={i} className="flex gap-3">
                                        <span className="text-muted-foreground w-8 text-right">{i}:</span>
                                        <span className="text-primary font-medium">{inst.join(' ')}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Lambda Programs */}
                                {result.bytecode.constants
                                  .map((constant, idx) => ({ constant, idx }))
                                  .filter(({ constant }) =>
                                    typeof constant === 'object' &&
                                    constant !== null &&
                                    '__lambda' in constant
                                  )
                                  .map(({ constant, idx }) => {
                                    const lambda = constant as { __lambda: true; program: typeof result.bytecode; params: string[] };
                                    return (
                                      <div key={idx} className="space-y-2">
                                        <div className="flex items-center gap-2">
                                          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                            Lambda #{idx}
                                          </div>
                                          <code className="text-xs text-primary/70 font-mono">
                                            ({lambda.params.join(', ')}) ={'>'} ...
                                          </code>
                                        </div>
                                        <div className="font-mono text-xs space-y-0.5 p-3 bg-muted/50 border rounded">
                                          {lambda.program.code.map((inst, i) => (
                                            <div key={i} className="flex gap-3">
                                              <span className="text-muted-foreground w-8 text-right">{i}:</span>
                                              <span className="text-primary font-medium">{inst.join(' ')}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    );
                                  })}

                                {/* Constants */}
                                {result.bytecode.constants.filter(c =>
                                  !(typeof c === 'object' && c !== null && '__lambda' in c)
                                ).length > 0 && (
                                  <div className="space-y-2">
                                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                      Constants
                                    </div>
                                    <div className="border rounded overflow-hidden">
                                      <JsonViewer
                                        value={result.bytecode.constants.filter(c =>
                                          !(typeof c === 'object' && c !== null && '__lambda' in c)
                                        )}
                                        height="200px"
                                      />
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                          </TabsContent>

                          <TabsContent value="ast" className="flex-1 overflow-hidden mt-4">
                            <div className="h-full border rounded overflow-hidden">
                              <JsonViewer value={result.ast} height="100%" />
                            </div>
                          </TabsContent>

                          <TabsContent value="json" className="flex-1 overflow-hidden mt-4">
                            <div className="h-full border rounded overflow-hidden">
                              <JsonViewer value={result.bytecode} height="100%" />
                            </div>
                          </TabsContent>
                        </Tabs>
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>
              </div>
              <div className="flex-1">
                <JextEditor
                  value={expression}
                  onChange={setExpression}
                  context={parsedContext}
                  height="100%"
                />
              </div>
            </div>

            {/* Main content area */}
            <Split
              className="flex-1 split split-horizontal"
              direction="horizontal"
              sizes={[33, 67]}
              minSize={[200, 300]}
              gutterSize={4}
            >
              {/* Context panel */}
              <div className="border-r flex flex-col overflow-hidden">
                <div className="px-4 py-2 border-b bg-muted/50">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Database className="w-4 h-4" />
                    Context
                  </div>
                </div>
                <div className="flex-1 overflow-hidden">
                  <JsonEditor value={contextJSON} onChange={setContextJSON} height="100%" />
                </div>
              </div>

              {/* Right panel: Result */}
              <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="px-4 py-2 border-b bg-muted/50">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <PlayCircle className="w-4 h-4" />
                      Result
                    </div>
                  </div>
                  <div className="flex-1 overflow-auto p-4">
                    {result.error ? (
                      <div className="flex items-start gap-3 p-4 border border-destructive/50 bg-destructive/10">
                        <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
                        <pre className="text-destructive text-sm font-mono whitespace-pre-wrap flex-1">
                          {result.error}
                        </pre>
                      </div>
                    ) : (
                      <div className="h-full border">
                        <JsonViewer value={result.value} height="100%" />
                      </div>
                    )}
                  </div>
              </div>
            </Split>
          </Split>
        </div>
      </div>
    </div>
  );
}
