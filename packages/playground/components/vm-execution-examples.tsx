'use client';

import { useState } from 'react';
import { VMExecutionDemo } from './vm-execution-demo';
import { Button } from './ui/button';

interface Example {
  id: string;
  name: string;
  description: string;
  expression: string;
  context: string;
}

const EXAMPLES: Example[] = [
  {
    id: 'arithmetic',
    name: 'Simple Arithmetic',
    description: 'See operator precedence and basic math operations',
    expression: '1 + 2 * 3',
    context: `{}`,
  },
  {
    id: 'conditional',
    name: 'Conditional (Ternary)',
    description: 'Watch the VM jump based on conditions',
    expression: "$.x > 10 ? 'big' : 'small'",
    context: `{
  "x": 15
}`,
  },
  {
    id: 'pipeline',
    name: 'Pipeline with Lambdas',
    description: 'Filter, map, and join with lambda functions',
    expression:
      "$.users |> filter(u => u.age >= 18 && u.active) |> map(u => `${u.name} (${u.age})`) |> join(', ')",
    context: `{
  "users": [
    { "name": "Alice", "age": 25, "active": true },
    { "name": "Bob", "age": 17, "active": true },
    { "name": "Carol", "age": 30, "active": false },
    { "name": "Dave", "age": 22, "active": true }
  ]
}`,
  },
  {
    id: 'object-spread',
    name: 'Object Construction & Spread',
    description: 'See how objects are built on the stack',
    expression:
      "{ ...$.defaults, name: $.user.name, score: $.scores[0] * 2, status: $.active ? 'online' : 'offline' }",
    context: `{
  "defaults": { "color": "blue", "size": "medium" },
  "user": { "name": "Alice" },
  "scores": [45, 38, 42],
  "active": true
}`,
  },
  {
    id: 'array-access',
    name: 'Array Operations',
    description: 'Indexing, negative indices, and array construction',
    expression: '[...$.items, $.items[-1] * 2]',
    context: `{
  "items": [10, 20, 30]
}`,
  },
  {
    id: 'optional-chaining',
    name: 'Optional Chaining',
    description: 'Safe property access with null coalescing',
    expression: '$.user?.profile?.avatar ?? "default.png"',
    context: `{
  "user": { "name": "Bob" }
}`,
  },
  {
    id: 'template-literal',
    name: 'Template Literals',
    description: 'String interpolation with expressions',
    expression:
      '`Hello ${$.name}, you have ${$.items.length} items totaling $${$.items |> reduce((sum, item) => sum + item.price, 0)}`',
    context: `{
  "name": "Alice",
  "items": [
    { "name": "Book", "price": 12.99 },
    { "name": "Pen", "price": 2.50 },
    { "name": "Notebook", "price": 5.99 }
  ]
}`,
  },
  {
    id: 'nested-ternary',
    name: 'Nested Ternary',
    description: 'Complex control flow with multiple conditions',
    expression: '$.score >= 90 ? "A" : $.score >= 80 ? "B" : $.score >= 70 ? "C" : "F"',
    context: `{
  "score": 85
}`,
  },
  {
    id: 'logical-operators',
    name: 'Logical Operators',
    description: 'AND, OR, and NOT operations',
    expression: '$.age >= 18 && $.verified && !$.suspended',
    context: `{
  "age": 25,
  "verified": true,
  "suspended": false
}`,
  },
];

export function VMExecutionExamples() {
  const [selectedId, setSelectedId] = useState(EXAMPLES[0].id);
  const selected = EXAMPLES.find((ex) => ex.id === selectedId) || EXAMPLES[0];

  return (
    <div className="space-y-4">
      {/* Example Selector */}
      <div className="flex flex-wrap gap-2">
        {EXAMPLES.map((example) => (
          <Button
            key={example.id}
            variant={selectedId === example.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedId(example.id)}
            className="text-xs"
          >
            {example.name}
          </Button>
        ))}
      </div>

      {/* Description */}
      <div className="text-sm text-muted-foreground italic border-l-2 border-primary pl-3">
        {selected.description}
      </div>

      {/* Demo */}
      <VMExecutionDemo
        key={selected.id}
        initialExpression={selected.expression}
        initialContext={selected.context}
      />
    </div>
  );
}
