'use client';

import Editor from '@monaco-editor/react';

interface JsonViewerProps {
  value: any;
  height?: string;
}

export function JsonViewer({ value, height = '200px' }: JsonViewerProps) {
  const jsonString = JSON.stringify(value, null, 2);

  return (
    <Editor
      height={height}
      language="json"
      value={jsonString}
      theme="vs-dark"
      options={{
        readOnly: true,
        minimap: { enabled: false },
        fontSize: 13,
        lineNumbers: 'off',
        scrollBeyondLastLine: false,
        automaticLayout: true,
        wordWrap: 'on',
        padding: { top: 8, bottom: 8 },
        folding: false,
        glyphMargin: false,
        lineDecorationsWidth: 0,
        lineNumbersMinChars: 0,
      }}
    />
  );
}
