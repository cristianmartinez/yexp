'use client';

import { useRef } from 'react';
import Editor, { Monaco } from '@monaco-editor/react';
import type { editor, languages, IPosition } from 'monaco-editor';

interface ExprEditorProps {
  value: string;
  onChange: (value: string) => void;
  context?: Record<string, any>;
  height?: string;
}

export function ExprEditor({ value, onChange, context = {}, height = '120px' }: ExprEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor, monaco: Monaco) => {
    editorRef.current = editor;

    // Register Expr language if not already registered
    if (
      !monaco.languages
        .getLanguages()
        .some((lang: languages.ILanguageExtensionPoint) => lang.id === 'expr')
    ) {
      monaco.languages.register({ id: 'expr' });

      // Set language configuration
      monaco.languages.setLanguageConfiguration('expr', {
        brackets: [
          ['[', ']'],
          ['(', ')'],
          ['{', '}'],
        ],
        autoClosingPairs: [
          { open: '[', close: ']' },
          { open: '(', close: ')' },
          { open: '{', close: '}' },
          { open: '"', close: '"' },
          { open: "'", close: "'" },
        ],
      });

      // Set tokenizer for syntax highlighting
      monaco.languages.setMonarchTokensProvider('expr', {
        tokenizer: {
          root: [
            // Numbers
            [/\d+(\.\d+)?/, 'number'],
            // Strings
            [/"([^"\\]|\\.)*$/, 'string.invalid'],
            [/'([^'\\]|\\.)*$/, 'string.invalid'],
            [/"/, 'string', '@string_double'],
            [/'/, 'string', '@string_single'],
            // Keywords
            [/\b(true|false|null|undefined)\b/, 'keyword'],
            // Operators
            [/[+\-*/%<>=!&|?:]+/, 'operator'],
            // Delimiters
            [/[{}()\[\]]/, '@brackets'],
            [/[,.]/, 'delimiter'],
            // Identifiers
            [/[a-zA-Z_]\w*/, 'identifier'],
          ],
          string_double: [
            [/[^\\"]+/, 'string'],
            [/\\./, 'string.escape'],
            [/"/, 'string', '@pop'],
          ],
          string_single: [
            [/[^\\']+/, 'string'],
            [/\\./, 'string.escape'],
            [/'/, 'string', '@pop'],
          ],
        },
      });

      // Register completion provider for autocompletion
      monaco.languages.registerCompletionItemProvider('expr', {
        provideCompletionItems: (model: editor.ITextModel, position: IPosition) => {
          const word = model.getWordUntilPosition(position);
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          };

          // Get context keys for suggestions
          const suggestions: any[] = [];

          // Add context keys as completions
          const addContextSuggestions = (obj: any, prefix = '') => {
            if (!obj || typeof obj !== 'object') return;

            Object.keys(obj).forEach((key) => {
              const fullPath = prefix ? `${prefix}.${key}` : key;
              suggestions.push({
                label: fullPath,
                kind: monaco.languages.CompletionItemKind.Field,
                insertText: key,
                range,
                detail: typeof obj[key],
              });

              // Recursively add nested properties
              if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
                addContextSuggestions(obj[key], fullPath);
              }
            });
          };

          addContextSuggestions(context);

          // Add common operators and keywords
          [
            { label: 'true', kind: monaco.languages.CompletionItemKind.Keyword },
            { label: 'false', kind: monaco.languages.CompletionItemKind.Keyword },
            { label: 'null', kind: monaco.languages.CompletionItemKind.Keyword },
          ].forEach((item) => {
            suggestions.push({ ...item, insertText: item.label, range });
          });

          return { suggestions };
        },
      });
    }
  };

  return (
    <Editor
      height={height}
      language="expr"
      value={value}
      onChange={(val) => onChange(val || '')}
      onMount={handleEditorDidMount}
      theme="vs-dark"
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        lineNumbers: 'off',
        scrollBeyondLastLine: false,
        automaticLayout: true,
        wordWrap: 'on',
        wrappingStrategy: 'advanced',
        padding: { top: 8, bottom: 8 },
        suggestOnTriggerCharacters: true,
        quickSuggestions: true,
        tabSize: 2,
      }}
    />
  );
}
