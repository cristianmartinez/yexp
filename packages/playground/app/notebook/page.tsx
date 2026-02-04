'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Database, PanelLeft, PanelLeftClose } from 'lucide-react';
import { Notebook } from '@/components/notebook';
import { ContextEditor } from '@/components/context-editor';
import { PageHeader } from '@/components/page-header';

export default function NotebookPage() {
  const [showContext, setShowContext] = useState(true);
  const [dataJSON, setDataJSON] = useState(`{
  "items": [
    { "name": "Alice", "age": 25 },
    { "name": "Bob", "age": 30 }
  ]
}`);
  const [stateJSON, setStateJSON] = useState('{}');
  const [envJSON, setEnvJSON] = useState('{}');

  const parsedContext = useMemo(() => {
    try {
      const data = JSON.parse(dataJSON);
      const state = JSON.parse(stateJSON);
      const env = JSON.parse(envJSON);
      return { data, state, env };
    } catch {
      return { data: {}, state: {}, env: {} };
    }
  }, [dataJSON, stateJSON, envJSON]);

  return (
    <div className="min-h-screen p-6 md:p-8">
      <div className="max-w-[1800px] mx-auto space-y-6">
        <PageHeader currentPage="notebook" />
        <Separator />

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
              <CardContent className="px-3 pb-3">
                <ContextEditor
                  data={dataJSON}
                  state={stateJSON}
                  env={envJSON}
                  onDataChange={setDataJSON}
                  onStateChange={setStateJSON}
                  onEnvChange={setEnvJSON}
                />
              </CardContent>
            </Card>
          )}

          {/* Notebook Cells */}
          <div className="flex-1 min-w-0">
            <Notebook initialContext={parsedContext} />
          </div>
        </div>
      </div>
    </div>
  );
}
