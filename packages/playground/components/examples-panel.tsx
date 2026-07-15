'use client';

import { type Example, categories, examples } from '@/lib/examples';
import { ChevronRight, Lightbulb } from 'lucide-react';

interface ExamplesPanelProps {
  selectedId?: string;
  onSelectExample: (example: Example) => void;
}

export function ExamplesPanel({ selectedId, onSelectExample }: ExamplesPanelProps) {
  // Group examples by category
  const examplesByCategory = categories.reduce(
    (acc, category) => {
      acc[category] = examples.filter((ex) => ex.category === category);
      return acc;
    },
    {} as Record<string, Example[]>,
  );

  return (
    <div className="h-full overflow-auto">
      <div className="p-4 space-y-6">
        {categories.map((category) => (
          <div key={category} className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
              {category}
            </h3>
            <div className="space-y-2">
              {examplesByCategory[category]?.map((example) => {
                const isSelected = selectedId === example.id;
                return (
                  <button
                    type="button"
                    key={example.id}
                    onClick={() => onSelectExample(example)}
                    className={`
                      w-full text-left p-3 rounded-lg border transition-all
                      ${
                        isSelected
                          ? 'bg-primary/10 border-primary/30 shadow-sm'
                          : 'bg-card hover:bg-accent border-border hover:border-accent-foreground/20'
                      }
                    `}
                  >
                    <div className="flex items-start gap-2">
                      <Lightbulb
                        className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                          isSelected ? 'text-primary' : 'text-muted-foreground'
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4
                            className={`text-sm font-medium ${
                              isSelected ? 'text-primary' : 'text-foreground'
                            }`}
                          >
                            {example.name}
                          </h4>
                          {isSelected && (
                            <ChevronRight className="w-4 h-4 text-primary flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {example.description}
                        </p>
                        <code className="text-xs text-primary/80 font-mono mt-1 block truncate">
                          {example.expression}
                        </code>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
