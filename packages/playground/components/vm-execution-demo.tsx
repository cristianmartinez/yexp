'use client';

import { useState, useMemo } from 'react';
import { tokenize, parse, compile } from '@yexp/core';
import type { ExecutionContext } from '@yexp/core';
import { VMExecutionPlayer } from './vm-execution-player';
import { YexpEditor } from './yexp-editor';
import { JsonEditor } from './json-editor';
import { Card } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

interface VMExecutionDemoProps {
  initialExpression?: string;
  initialContext?: string;
}

export function VMExecutionDemo({
  initialExpression = '1 + 2 * 3',
  initialContext = `{
  "data": {},
  "state": {},
  "env": {}
}`,
}: VMExecutionDemoProps) {
  const [expression, setExpression] = useState(initialExpression);
  const [contextJSON, setContextJSON] = useState(initialContext);

  const { program, context, error } = useMemo(() => {
    try {
      const ctx = JSON.parse(contextJSON) as ExecutionContext;
      const tokens = tokenize(expression);
      const ast = parse(tokens);
      const prog = compile(ast);

      return {
        program: prog,
        context: ctx,
        error: null,
      };
    } catch (err) {
      return {
        program: null,
        context: null,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }, [expression, contextJSON]);

  return (
    <div className="space-y-4">
      {/* Input Section */}
      <Card className="p-4">
        <Tabs defaultValue="expression">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="expression">Expression</TabsTrigger>
            <TabsTrigger value="context">Context</TabsTrigger>
          </TabsList>
          <TabsContent value="expression" className="mt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Enter any Yexp expression:</label>
              <YexpEditor
                value={expression}
                onChange={setExpression}
                context={context || {}}
                height="80px"
              />
            </div>
          </TabsContent>
          <TabsContent value="context" className="mt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Execution Context (JSON):</label>
              <JsonEditor value={contextJSON} onChange={setContextJSON} height="200px" />
            </div>
          </TabsContent>
        </Tabs>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="p-4 border-red-500 bg-red-500/10">
          <div className="text-sm text-red-500">
            <strong>Error:</strong> {error}
          </div>
        </Card>
      )}

      {/* VM Execution Player */}
      {!error && program && context && (
        <div style={{ height: '600px' }}>
          <VMExecutionPlayer program={program} context={context} />
        </div>
      )}
    </div>
  );
}
