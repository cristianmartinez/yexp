'use client';

import { useState, useMemo } from 'react';
import { tokenize, parse, compile, evaluate } from '@vlot/core';
import type { ExecutionContext } from '@vlot/core';
import { Code2, PlayCircle, Database, Binary, AlertCircle } from 'lucide-react';
import { ExprEditor } from '@/components/expr-editor';
import { JsonEditor } from '@/components/json-editor';
import { JsonViewer } from '@/components/json-viewer';
import { PageHeader } from '@/components/page-header';

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
    <div className="min-h-screen flex flex-col">
      <div className="px-6 py-4 border-b">
        <PageHeader currentPage="playground" />
      </div>

      {/* Expression panel at top */}
      <div className="border-b flex flex-col">
        <div className="px-4 py-2 border-b bg-muted/50">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Code2 className="w-4 h-4" />
            Expression
          </div>
        </div>
        <div className="h-32">
          <ExprEditor
            value={expression}
            onChange={setExpression}
            context={parsedContext}
            height="100%"
          />
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left panel: Context */}
        <div className="w-1/3 border-r flex flex-col">
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

        {/* Right panel: Result and Bytecode */}
        <div className="flex-1 flex flex-col">
          {/* Result panel */}
          <div className="h-1/2 border-b flex flex-col">
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

          {/* Bytecode panel */}
          {result.bytecode && (
            <div className="h-1/2 flex flex-col">
              <div className="px-4 py-2 border-b bg-muted/50">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Binary className="w-4 h-4" />
                  Bytecode
                </div>
              </div>
              <div className="flex-1 overflow-auto p-4 space-y-4">
                <div className="font-mono text-xs space-y-1 max-h-[200px] overflow-y-auto p-3 bg-muted/50 border">
                  {result.bytecode.code.map((inst, i) => (
                    <div key={i} className="flex gap-3">
                      <span className="text-muted-foreground w-8 text-right">{i}:</span>
                      <span className="text-primary font-medium">{inst.join(' ')}</span>
                    </div>
                  ))}
                </div>
                {result.bytecode.constants.length > 0 && (
                  <div className="border">
                    <JsonViewer value={result.bytecode.constants} height="150px" />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
