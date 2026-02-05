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
    context: `{
  "data": {},
  "state": {},
  "env": {}
}`,
  },
  {
    id: 'conditional',
    name: 'Conditional (Ternary)',
    description: 'Watch the VM jump based on conditions',
    expression: "data.x > 10 ? 'big' : 'small'",
    context: `{
  "data": { "x": 15 },
  "state": {},
  "env": {}
}`,
  },
  {
    id: 'pipeline',
    name: 'Pipeline with Lambdas',
    description: 'Filter, map, and join with lambda functions',
    expression: "data.users |> filter(u => u.age >= 18 && u.active) |> map(u => `\${u.name} (\${u.age})`) |> join(', ')",
    context: `{
  "data": {
    "users": [
      { "name": "Alice", "age": 25, "active": true },
      { "name": "Bob", "age": 17, "active": true },
      { "name": "Carol", "age": 30, "active": false },
      { "name": "Dave", "age": 22, "active": true }
    ]
  },
  "state": {},
  "env": {}
}`,
  },
  {
    id: 'object-spread',
    name: 'Object Construction & Spread',
    description: 'See how objects are built on the stack',
    expression: "{ ...data.defaults, name: data.user.name, score: data.scores[0] * 2, status: data.active ? 'online' : 'offline' }",
    context: `{
  "data": {
    "defaults": { "color": "blue", "size": "medium" },
    "user": { "name": "Alice" },
    "scores": [45, 38, 42],
    "active": true
  },
  "state": {},
  "env": {}
}`,
  },
  {
    id: 'array-access',
    name: 'Array Operations',
    description: 'Indexing, negative indices, and array construction',
    expression: '[...data.items, data.items[-1] * 2]',
    context: `{
  "data": { "items": [10, 20, 30] },
  "state": {},
  "env": {}
}`,
  },
  {
    id: 'optional-chaining',
    name: 'Optional Chaining',
    description: 'Safe property access with null coalescing',
    expression: 'data.user?.profile?.avatar ?? "default.png"',
    context: `{
  "data": {
    "user": { "name": "Bob" }
  },
  "state": {},
  "env": {}
}`,
  },
  {
    id: 'template-literal',
    name: 'Template Literals',
    description: 'String interpolation with expressions',
    expression: '`Hello \${data.name}, you have \${data.items.length} items totaling $\${data.items |> reduce((sum, item) => sum + item.price, 0)}`',
    context: `{
  "data": {
    "name": "Alice",
    "items": [
      { "name": "Book", "price": 12.99 },
      { "name": "Pen", "price": 2.50 },
      { "name": "Notebook", "price": 5.99 }
    ]
  },
  "state": {},
  "env": {}
}`,
  },
  {
    id: 'nested-ternary',
    name: 'Nested Ternary',
    description: 'Complex control flow with multiple conditions',
    expression: 'data.score >= 90 ? "A" : data.score >= 80 ? "B" : data.score >= 70 ? "C" : "F"',
    context: `{
  "data": { "score": 85 },
  "state": {},
  "env": {}
}`,
  },
  {
    id: 'logical-operators',
    name: 'Logical Operators',
    description: 'AND, OR, and NOT operations',
    expression: 'data.age >= 18 && data.verified && !data.suspended',
    context: `{
  "data": {
    "age": 25,
    "verified": true,
    "suspended": false
  },
  "state": {},
  "env": {}
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
