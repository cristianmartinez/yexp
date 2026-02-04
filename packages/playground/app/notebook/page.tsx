'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Code2, Database, BookOpen, Zap, PanelLeft, PanelLeftClose } from 'lucide-react';
import { Notebook } from '@/components/notebook';
import { ContextEditor } from '@/components/context-editor';

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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/vlot-logo.svg" alt="Vlot" width={40} height={40} className="dark:invert" />
            <h1 className="text-4xl font-bold">Vlot Playground</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild className="gap-2">
              <Link href="/">
                <Zap className="w-4 h-4" />
                Playground
              </Link>
            </Button>
            <Button variant="default" className="gap-2">
              <BookOpen className="w-4 h-4" />
              Notebook
            </Button>
          </div>
        </div>
        <p className="text-muted-foreground">
          Execute expressions sequentially with results flowing down to subsequent cells
        </p>

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
