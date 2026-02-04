'use client';

import { useState, useMemo } from 'react';
import { Database } from 'lucide-react';
import { Notebook } from '@/components/notebook';
import { ContextEditor } from '@/components/context-editor';
import { PageHeader } from '@/components/page-header';

export default function NotebookPage() {
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
    <div className="min-h-screen flex flex-col">
      <div className="px-6 py-4 border-b">
        <PageHeader currentPage="notebook" />
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left panel: Context */}
        <div className="w-[320px] border-r flex flex-col">
          <div className="px-4 py-2 border-b bg-muted/50">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Database className="w-4 h-4" />
              Context
            </div>
          </div>
          <div className="flex-1 overflow-auto p-4">
            <ContextEditor
              data={dataJSON}
              state={stateJSON}
              env={envJSON}
              onDataChange={setDataJSON}
              onStateChange={setStateJSON}
              onEnvChange={setEnvJSON}
            />
          </div>
        </div>

        {/* Right panel: Notebook cells */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-4xl mx-auto">
            <Notebook initialContext={parsedContext} />
          </div>
        </div>
      </div>
    </div>
  );
}
