'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Code2, Database, BookOpen, Zap, PanelLeft, PanelLeftClose } from 'lucide-react';
import { Notebook } from '@/components/notebook';

export default function NotebookPage() {
  const [showContext, setShowContext] = useState(true);
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

  return (
    <div className="min-h-screen p-6 md:p-8">
      <div className="max-w-[1800px] mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Code2 className="w-8 h-8" />
            <h1 className="text-4xl font-bold">Expr Playground</h1>
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
      </div>
    </div>
  );
}
