'use client';

import { type ExecutionContext, compile } from '@cristianmartinez/yexp';
import { useMemo, useState } from 'react';
import { VMExecutionPlayer } from './vm-execution-player';

interface VMExecutionDemoProps {
  initialExpression?: string;
  initialContext?: string;
}

export function VMExecutionDemo({
  initialExpression = '1 + 2 * 3',
  initialContext = '{}',
}: VMExecutionDemoProps) {
  const [expression, setExpression] = useState(initialExpression);
  const [contextJSON, setContextJSON] = useState(initialContext);
  const { program, context, error } = useMemo(() => {
    try {
      const context = JSON.parse(contextJSON) as ExecutionContext;
      if (context === null || typeof context !== 'object' || Array.isArray(context))
        throw new Error('Input must be a JSON object.');
      return { program: compile(expression), context, error: null };
    } catch (error) {
      return {
        program: null,
        context: null,
        error: error instanceof Error ? error.message : 'Unable to compile expression.',
      };
    }
  }, [expression, contextJSON]);

  return (
    <>
      <div className="vm-editors">
        <div className="vm-editor">
          <label htmlFor="vm-expression">
            Expression <span>YEXP</span>
          </label>
          <textarea
            id="vm-expression"
            value={expression}
            onChange={(event) => setExpression(event.target.value)}
            spellCheck={false}
            rows={3}
          />
        </div>
        <div className="vm-editor">
          <label htmlFor="vm-context">
            Input <span>JSON</span>
          </label>
          <textarea
            id="vm-context"
            value={contextJSON}
            onChange={(event) => setContextJSON(event.target.value)}
            spellCheck={false}
            rows={3}
          />
        </div>
      </div>
      {error ? (
        <div className="vm-error" role="alert">
          {error}
        </div>
      ) : (
        program && context && <VMExecutionPlayer program={program} context={context} />
      )}
    </>
  );
}
