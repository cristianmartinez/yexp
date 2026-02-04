/**
 * Example JSON conditions for testing and benchmarking
 */

export const conditionExamples = {
  simple: {
    name: 'Simple age check',
    condition: {
      and: [
        { field: 'age', op: 'gte' as const, value: 18 },
        { field: 'age', op: 'lte' as const, value: 65 }
      ]
    },
    context: { age: 25 }
  },

  complex: {
    name: 'Complex business logic',
    condition: {
      and: [
        {
          or: [
            { field: 'age', op: 'gt' as const, value: 21 },
            {
              and: [
                { field: 'age', op: 'gt' as const, value: 18 },
                { field: 'verified', op: 'eq' as const, value: true }
              ]
            }
          ]
        },
        {
          or: [
            { field: 'country', op: 'eq' as const, value: 'US' },
            { field: 'country', op: 'eq' as const, value: 'UK' }
          ]
        }
      ]
    },
    context: { age: 25, verified: false, country: 'US' }
  },

  nested: {
    name: 'Nested property paths',
    condition: {
      and: [
        { path: 'user.profile.age', op: 'gte' as const, value: 18 },
        { path: 'user.profile.country.code', op: 'eq' as const, value: 'US' }
      ]
    },
    context: {
      user: {
        profile: {
          age: 25,
          country: {
            code: 'US',
            name: 'United States'
          }
        }
      }
    }
  }
};
