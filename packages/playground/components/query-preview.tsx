'use client';

import { compile, evaluate } from '@cristianmartinez/yexp';
import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

const input = {
  products: [
    { name: 'Keyboard', price: 75, inStock: true },
    { name: 'Monitor', price: 350, inStock: true },
    { name: 'Mouse', price: 25, inStock: false },
  ],
};
const examples = [
  { name: 'Under $100', expression: '$.products[.price < 100][*].name' },
  { name: 'In stock', expression: '$.products[.inStock][*].name' },
  { name: 'Total price', expression: '$.products.map(p => p.price).reduce((a, b) => a + b, 0)' },
];

export function QueryPreview() {
  const [expression, setExpression] = useState(examples[0].expression);
  let result: string;
  let failed = false;
  try {
    const value = evaluate(compile(expression), input);
    failed = typeof value === 'object' && value !== null && 'error' in value;
    result = JSON.stringify(value) ?? 'undefined';
  } catch (error) {
    failed = true;
    result = error instanceof Error ? error.message : 'Unable to evaluate expression';
  }
  return (
    <div className="query-preview">
      <div className="preview-input">
        <div className="code-label">
          Input <code>$.products</code>
        </div>
        <table className="input-table">
          <caption className="sr-only">Products available to the expression as $.products</caption>
          <thead>
            <tr>
              <th scope="col">name</th>
              <th scope="col">price</th>
              <th scope="col">inStock</th>
            </tr>
          </thead>
          <tbody>
            {input.products.map((product) => (
              <tr key={product.name}>
                <td>{product.name}</td>
                <td>{product.price}</td>
                <td className={product.inStock ? '' : 'code-muted'}>{String(product.inStock)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="preview-expression">
        <div className="code-label">
          <label htmlFor="hero-expression">Expression</label>
          <span>Editable</span>
        </div>
        <div className="query-presets" aria-label="Example expressions">
          {examples.map((example) => (
            <button
              type="button"
              key={example.name}
              aria-pressed={expression === example.expression}
              onClick={() => setExpression(example.expression)}
            >
              {example.name}
            </button>
          ))}
        </div>
        <textarea
          id="hero-expression"
          spellCheck={false}
          value={expression}
          onChange={(event) => setExpression(event.target.value)}
          rows={2}
        />
      </div>
      <div className="preview-result">
        <div className="code-label">{failed ? 'Error' : 'Result'}</div>
        <pre aria-live="polite" aria-atomic="true" className={failed ? 'query-error' : ''}>
          <code>{result}</code>
        </pre>
      </div>
    </div>
  );
}

export function InstallCommand() {
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  async function copy() {
    try {
      await navigator.clipboard.writeText('npm install @cristianmartinez/yexp');
      setStatus('copied');
    } catch {
      setStatus('failed');
    }
  }
  return (
    <div className="install-command">
      <span className="install-dollar">$</span>
      <code>npm install @cristianmartinez/yexp</code>
      <button type="button" onClick={copy} aria-label="Copy install command">
        {status === 'copied' ? <Check size={15} /> : <Copy size={15} />}
      </button>
      <output className="sr-only">
        {status === 'copied'
          ? 'Install command copied'
          : status === 'failed'
            ? 'Copy unavailable. Select the command to copy it.'
            : ''}
      </output>
    </div>
  );
}
