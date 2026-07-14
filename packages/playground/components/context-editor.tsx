'use client';

import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { JsonEditor } from './json-editor';

interface ContextEditorProps {
  data: string;
  state: string;
  env: string;
  onDataChange: (value: string) => void;
  onStateChange: (value: string) => void;
  onEnvChange: (value: string) => void;
}

export function ContextEditor({
  data,
  state,
  env,
  onDataChange,
  onStateChange,
  onEnvChange,
}: ContextEditorProps) {
  const [expanded, setExpanded] = useState<'data' | 'state' | 'env'>('data');

  const sections = [
    { key: 'data' as const, label: 'Data', value: data, onChange: onDataChange },
    { key: 'state' as const, label: 'State', value: state, onChange: onStateChange },
    { key: 'env' as const, label: 'Env', value: env, onChange: onEnvChange },
  ];

  return (
    <div className="space-y-2">
      {sections.map((section) => {
        const isExpanded = expanded === section.key;
        return (
          <div key={section.key} className="border border-border rounded-md overflow-hidden">
            <Button
              variant="ghost"
              className="w-full justify-between px-3 py-2 h-auto font-semibold text-xs"
              onClick={() => setExpanded(section.key)}
            >
              <span>{section.label}</span>
              {isExpanded ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
            </Button>
            {isExpanded && (
              <div className="border-t border-border">
                <JsonEditor value={section.value} onChange={section.onChange} height="240px" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
