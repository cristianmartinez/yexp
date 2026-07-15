'use client';

import Editor from '@monaco-editor/react';
import type { Monaco } from '@monaco-editor/react';

interface JsonEditorProps {
  value: string;
  onChange: (value: string) => void;
  height?: string;
}

export function JsonEditor({ value, onChange, height = '300px' }: JsonEditorProps) {
  return (
    <div className="bg-[#1e1e1e] h-full">
      <Editor
        height={height}
        language="json"
        value={value}
        onChange={(val) => onChange(val || '')}
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          fontSize: 13,
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          wordWrap: 'on',
          wrappingStrategy: 'advanced',
          padding: { top: 12, bottom: 12 },
          tabSize: 2,
          formatOnPaste: true,
          formatOnType: true,
        }}
      />
    </div>
  );
}
