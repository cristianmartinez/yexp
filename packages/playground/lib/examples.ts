export interface Example {
  id: string;
  name: string;
  description: string;
  expression: string;
  context: string;
}

export const examples: Example[] = [
  {
    id: 'basic-access',
    name: 'Basic Property Access',
    description: 'Access nested object properties',
    expression: 'data.user.name',
    context: JSON.stringify(
      {
        data: {
          user: {
            name: 'Alice',
            age: 25,
            email: 'alice@example.com'
          }
        }
      },
      null,
      2
    )
  },
  {
    id: 'array-indexing',
    name: 'Array Indexing',
    description: 'Access array elements by index',
    expression: 'items[0].name',
    context: JSON.stringify(
      {
        items: [
          { name: 'Alice', age: 25 },
          { name: 'Bob', age: 30 },
          { name: 'Charlie', age: 35 }
        ]
      },
      null,
      2
    )
  },
  {
    id: 'arithmetic',
    name: 'Arithmetic Operations',
    description: 'Perform calculations with numbers',
    expression: 'price * quantity * (1 - discount)',
    context: JSON.stringify(
      {
        price: 100,
        quantity: 3,
        discount: 0.15
      },
      null,
      2
    )
  },
  {
    id: 'comparisons',
    name: 'Comparisons',
    description: 'Compare values and check conditions',
    expression: 'age >= 18 && status == "active"',
    context: JSON.stringify(
      {
        age: 25,
        status: 'active',
        verified: true
      },
      null,
      2
    )
  },
  {
    id: 'logical-ops',
    name: 'Logical Operations',
    description: 'Combine conditions with AND/OR',
    expression: '(user.verified || user.admin) && !user.banned',
    context: JSON.stringify(
      {
        user: {
          verified: true,
          admin: false,
          banned: false,
          role: 'editor'
        }
      },
      null,
      2
    )
  },
  {
    id: 'ternary',
    name: 'Ternary Operator',
    description: 'Conditional expressions',
    expression: 'score >= 90 ? "A" : score >= 80 ? "B" : "C"',
    context: JSON.stringify(
      {
        score: 85,
        maxScore: 100
      },
      null,
      2
    )
  },
  {
    id: 'string-concat',
    name: 'String Concatenation',
    description: 'Combine strings together',
    expression: 'user.firstName + " " + user.lastName',
    context: JSON.stringify(
      {
        user: {
          firstName: 'John',
          lastName: 'Doe',
          title: 'Dr.'
        }
      },
      null,
      2
    )
  },
  {
    id: 'optional-chaining',
    name: 'Optional Chaining',
    description: 'Safe property access with ?.',
    expression: 'user?.address?.city',
    context: JSON.stringify(
      {
        user: {
          name: 'Alice',
          address: {
            city: 'New York',
            zip: '10001'
          }
        }
      },
      null,
      2
    )
  },
  {
    id: 'array-methods',
    name: 'Array Filter',
    description: 'Filter array elements',
    expression: 'products.filter(p => p.price < 100)',
    context: JSON.stringify(
      {
        products: [
          { name: 'Laptop', price: 999 },
          { name: 'Mouse', price: 25 },
          { name: 'Keyboard', price: 75 }
        ]
      },
      null,
      2
    )
  },
  {
    id: 'env-variables',
    name: 'Environment Variables',
    description: 'Access environment configuration',
    expression: 'env.API_URL + "/users/" + userId',
    context: JSON.stringify(
      {
        env: {
          API_URL: 'https://api.example.com',
          DEBUG: true
        },
        userId: '12345'
      },
      null,
      2
    )
  }
];
