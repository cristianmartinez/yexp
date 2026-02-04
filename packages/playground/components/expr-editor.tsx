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
        keywords: [
          'true',
          'false',
          'null',
          'undefined',
        ],
        builtins: [
          // String functions
          'toString',
          'toUpperCase',
          'toLowerCase',
          'trim',
          'split',
          'replace',
          'match',
          'startsWith',
          'endsWith',
          'includes',
          'indexOf',
          'slice',
          'substring',
          'charAt',
          'charCodeAt',
          'repeat',
          'padStart',
          'padEnd',
          // Number functions
          'round',
          'floor',
          'ceil',
          'abs',
          'min',
          'max',
          'sqrt',
          'pow',
          'sign',
          // Array functions
          'length',
          'map',
          'filter',
          'reduce',
          'find',
          'findIndex',
          'some',
          'every',
          'join',
          'reverse',
          'sort',
          'concat',
          'push',
          'pop',
          'shift',
          'unshift',
          'flat',
          'flatMap',
          // Object functions
          'keys',
          'values',
          'entries',
          'hasOwnProperty',
          // Type checking
          'typeof',
          'isArray',
          'isObject',
          'isString',
          'isNumber',
          'isBoolean',
          'isNull',
          'isUndefined',
        ],
        contextVars: ['data', 'state', 'env', '$', '$$'],
        tokenizer: {
          root: [
            // Context variables (special highlighting)
            [/\$\$?/, 'variable.predefined'],
            [/\b(data|state|env)\b/, 'variable.predefined'],
            // Numbers
            [/\d+(\.\d+)?/, 'number'],
            // Strings
            [/"([^"\\]|\\.)*$/, 'string.invalid'],
            [/'([^'\\]|\\.)*$/, 'string.invalid'],
            [/"/, 'string', '@string_double'],
            [/'/, 'string', '@string_single'],
            // Keywords
            [/\b(?:true|false|null|undefined)\b/, 'keyword'],
            // Builtin functions
            [
              /\b(?:toString|toUpperCase|toLowerCase|trim|split|replace|match|startsWith|endsWith|includes|indexOf|slice|substring|charAt|charCodeAt|repeat|padStart|padEnd|round|floor|ceil|abs|min|max|sqrt|pow|sign|length|map|filter|reduce|find|findIndex|some|every|join|reverse|sort|concat|push|pop|shift|unshift|flat|flatMap|keys|values|entries|hasOwnProperty|typeof|isArray|isObject|isString|isNumber|isBoolean|isNull|isUndefined)\b/,
              'support.function',
            ],
            // Pipe operator
            [/\|>/, 'keyword.operator'],
            // Arrow function
            [/=>/, 'keyword.operator'],
            // Logical operators
            [/&&|\|\|/, 'keyword.operator'],
            // Comparison operators (including ===, !==)
            [/[<>]=?|[!=]==?/, 'keyword.operator'],
            // Arithmetic operators
            [/[+\-*/%]/, 'keyword.operator'],
            // Other operators
            [/[?:!]/, 'keyword.operator'],
            // Delimiters
            [/[{}()\[\]]/, '@brackets'],
            [/[,.]/, 'delimiter'],
            // Identifiers (must be last)
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

      // Define custom theme for Expr
      monaco.editor.defineTheme('expr-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [
          { token: 'keyword', foreground: 'C586C0', fontStyle: 'bold' },
          { token: 'keyword.operator', foreground: 'D4D4D4', fontStyle: 'bold' },
          { token: 'support.function', foreground: 'DCDCAA' },
          { token: 'variable.predefined', foreground: '4FC1FF', fontStyle: 'italic' },
          { token: 'number', foreground: 'B5CEA8' },
          { token: 'string', foreground: 'CE9178' },
          { token: 'string.escape', foreground: 'D7BA7D' },
          { token: 'identifier', foreground: '9CDCFE' },
        ],
        colors: {},
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
      theme="expr-dark"
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
