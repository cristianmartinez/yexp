/**
 * Example JSON actions for testing and benchmarking
 */

export const actionExamples = {
  increment: {
    name: 'Increment counter',
    action: {
      type: 'assign' as const,
      path: 'state.count',
      value: {
        type: 'expr' as const,
        expr: 'state.count + 1',
      },
    },
    initialContext: { state: { count: 0 } },
  },

  conditionalUpdate: {
    name: 'Conditional update',
    action: {
      type: 'conditional' as const,
      condition: {
        type: 'expr' as const,
        expr: 'state.count > 5',
      },
      then: {
        type: 'assign' as const,
        path: 'state.message',
        value: { type: 'literal' as const, value: 'Count is high' },
      },
      else: {
        type: 'assign' as const,
        path: 'state.message',
        value: { type: 'literal' as const, value: 'Count is low' },
      },
    },
    initialContext: { state: { count: 10, message: '' } },
  },

  sequence: {
    name: 'Button click sequence',
    action: {
      type: 'sequence' as const,
      actions: [
        {
          type: 'assign' as const,
          path: 'state.loading',
          value: { type: 'literal' as const, value: true },
        },
        {
          type: 'assign' as const,
          path: 'state.data',
          value: { type: 'literal' as const, value: { result: 'success' } },
        },
        {
          type: 'assign' as const,
          path: 'state.loading',
          value: { type: 'literal' as const, value: false },
        },
      ],
    },
    initialContext: { state: { loading: false, data: null } },
  },
};
