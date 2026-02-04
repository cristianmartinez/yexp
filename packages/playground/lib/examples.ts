export interface Example {
  id: string;
  name: string;
  description: string;
  category: string;
  expression: string;
  context: string;
}

export const examples: Example[] = [
  // Basic Operations
  {
    id: 'basic-access',
    name: 'Property Access',
    description: 'Access nested object properties',
    category: 'Basics',
    expression: 'data.user.profile.name',
    context: JSON.stringify(
      {
        data: {
          user: {
            id: 'usr_123',
            profile: {
              name: 'Alice Johnson',
              email: 'alice@example.com',
              age: 28
            }
          }
        }
      },
      null,
      2
    )
  },
  {
    id: 'array-indexing',
    name: 'Array Access',
    description: 'Access array elements by index',
    category: 'Basics',
    expression: 'data.orders[0].total',
    context: JSON.stringify(
      {
        data: {
          orders: [
            { id: 'ord_1', total: 299.99, status: 'shipped' },
            { id: 'ord_2', total: 89.50, status: 'pending' },
            { id: 'ord_3', total: 450.00, status: 'delivered' }
          ]
        }
      },
      null,
      2
    )
  },

  // Lambda: Filter
  {
    id: 'filter-basic',
    name: 'Filter Products',
    description: 'Filter products under budget',
    category: 'Filter',
    expression: 'data.products |> filter(p => p.price < state.budget && p.inStock)',
    context: JSON.stringify(
      {
        data: {
          products: [
            { name: 'Laptop Pro', price: 1299, inStock: true, category: 'electronics' },
            { name: 'Mouse', price: 29, inStock: true, category: 'accessories' },
            { name: 'Monitor', price: 499, inStock: false, category: 'electronics' },
            { name: 'Keyboard', price: 79, inStock: true, category: 'accessories' },
            { name: 'Webcam', price: 89, inStock: true, category: 'accessories' }
          ]
        },
        state: {
          budget: 500
        }
      },
      null,
      2
    )
  },
  {
    id: 'filter-shorthand',
    name: 'Filter Shorthand',
    description: 'Use shorthand lambda syntax',
    category: 'Filter',
    expression: 'data.users |> filter(.active && .role == "admin")',
    context: JSON.stringify(
      {
        data: {
          users: [
            { name: 'Alice', role: 'admin', active: true, lastLogin: '2024-01-15' },
            { name: 'Bob', role: 'user', active: true, lastLogin: '2024-01-14' },
            { name: 'Charlie', role: 'admin', active: false, lastLogin: '2023-12-01' },
            { name: 'Diana', role: 'admin', active: true, lastLogin: '2024-01-16' }
          ]
        }
      },
      null,
      2
    )
  },

  // Lambda: Map
  {
    id: 'map-transform',
    name: 'Transform Data',
    description: 'Extract and transform properties',
    category: 'Map',
    expression: 'data.employees |> map(e => { name: e.firstName + " " + e.lastName, salary: e.salary * 1.1 })',
    context: JSON.stringify(
      {
        data: {
          employees: [
            { id: 1, firstName: 'John', lastName: 'Smith', salary: 75000, department: 'Engineering' },
            { id: 2, firstName: 'Sarah', lastName: 'Connor', salary: 85000, department: 'Product' },
            { id: 3, firstName: 'Mike', lastName: 'Johnson', salary: 65000, department: 'Marketing' }
          ]
        }
      },
      null,
      2
    )
  },
  {
    id: 'map-shorthand',
    name: 'Extract Properties',
    description: 'Use map shorthand to extract fields',
    category: 'Map',
    expression: 'data.products |> filter(.inStock) |> map(.name)',
    context: JSON.stringify(
      {
        data: {
          products: [
            { name: 'Laptop', price: 999, inStock: true },
            { name: 'Mouse', price: 25, inStock: false },
            { name: 'Keyboard', price: 75, inStock: true },
            { name: 'Monitor', price: 450, inStock: true }
          ]
        }
      },
      null,
      2
    )
  },

  // Lambda: Reduce
  {
    id: 'reduce-sum',
    name: 'Calculate Total',
    description: 'Sum order totals with reduce',
    category: 'Reduce',
    expression: 'data.orders |> filter(.status == "paid") |> reduce((sum, order) => sum + order.amount, 0)',
    context: JSON.stringify(
      {
        data: {
          orders: [
            { id: 1, amount: 299.99, status: 'paid', customer: 'Alice' },
            { id: 2, amount: 149.50, status: 'pending', customer: 'Bob' },
            { id: 3, amount: 89.99, status: 'paid', customer: 'Charlie' },
            { id: 4, amount: 399.00, status: 'paid', customer: 'Diana' },
            { id: 5, amount: 59.99, status: 'cancelled', customer: 'Eve' }
          ]
        }
      },
      null,
      2
    )
  },
  {
    id: 'reduce-complex',
    name: 'Group and Count',
    description: 'Create summary statistics',
    category: 'Reduce',
    expression: 'data.transactions |> reduce((acc, t) => { total: acc.total + t.amount, count: acc.count + 1, avgAmount: (acc.total + t.amount) / (acc.count + 1) }, { total: 0, count: 0, avgAmount: 0 })',
    context: JSON.stringify(
      {
        data: {
          transactions: [
            { id: 't1', amount: 125.50, type: 'purchase', date: '2024-01-15' },
            { id: 't2', amount: 89.99, type: 'purchase', date: '2024-01-16' },
            { id: 't3', amount: 45.00, type: 'refund', date: '2024-01-17' },
            { id: 't4', amount: 199.99, type: 'purchase', date: '2024-01-18' }
          ]
        }
      },
      null,
      2
    )
  },

  // Lambda: Find, Some, Every
  {
    id: 'find-item',
    name: 'Find Item',
    description: 'Find first matching element',
    category: 'Search',
    expression: 'data.inventory |> find(item => item.sku == state.searchSku)',
    context: JSON.stringify(
      {
        data: {
          inventory: [
            { sku: 'LAP-001', name: 'Laptop Pro', quantity: 15, location: 'A1' },
            { sku: 'MOU-042', name: 'Wireless Mouse', quantity: 83, location: 'B3' },
            { sku: 'KEY-088', name: 'Mechanical Keyboard', quantity: 42, location: 'A2' },
            { sku: 'MON-155', name: '4K Monitor', quantity: 8, location: 'C1' }
          ]
        },
        state: {
          searchSku: 'KEY-088'
        }
      },
      null,
      2
    )
  },
  {
    id: 'some-every',
    name: 'Check Conditions',
    description: 'Validate with some and every',
    category: 'Search',
    expression: '{ hasHighPriority: data.tasks |> some(.priority == "high"), allCompleted: data.tasks |> every(.completed) }',
    context: JSON.stringify(
      {
        data: {
          tasks: [
            { id: 1, title: 'Fix bug', priority: 'high', completed: true },
            { id: 2, title: 'Update docs', priority: 'low', completed: true },
            { id: 3, title: 'Review PR', priority: 'medium', completed: true },
            { id: 4, title: 'Deploy', priority: 'high', completed: true }
          ]
        }
      },
      null,
      2
    )
  },

  // Complex Pipelines
  {
    id: 'pipeline-ecommerce',
    name: 'E-commerce Pipeline',
    description: 'Multi-step data transformation',
    category: 'Pipelines',
    expression: 'data.orders |> filter(.status == "completed") |> map(o => { customer: o.customer, total: o.items |> reduce((sum, item) => sum + (item.price * item.qty), 0) }) |> filter(.total > 100)',
    context: JSON.stringify(
      {
        data: {
          orders: [
            {
              id: 1,
              customer: 'Alice',
              status: 'completed',
              items: [
                { name: 'Laptop', price: 999, qty: 1 },
                { name: 'Mouse', price: 25, qty: 2 }
              ]
            },
            {
              id: 2,
              customer: 'Bob',
              status: 'pending',
              items: [{ name: 'Keyboard', price: 75, qty: 1 }]
            },
            {
              id: 3,
              customer: 'Charlie',
              status: 'completed',
              items: [
                { name: 'Monitor', price: 450, qty: 1 },
                { name: 'Cable', price: 15, qty: 3 }
              ]
            }
          ]
        }
      },
      null,
      2
    )
  },
  {
    id: 'pipeline-analytics',
    name: 'Analytics Pipeline',
    description: 'Calculate metrics and rankings',
    category: 'Pipelines',
    expression: 'data.sales |> map(s => { rep: s.salesRep, revenue: s.deals |> filter(.closed) |> reduce((sum, d) => sum + d.value, 0) }) |> filter(.revenue > 50000)',
    context: JSON.stringify(
      {
        data: {
          sales: [
            {
              salesRep: 'Alice Johnson',
              deals: [
                { id: 'd1', value: 45000, closed: true, date: '2024-01-10' },
                { id: 'd2', value: 32000, closed: true, date: '2024-01-15' },
                { id: 'd3', value: 18000, closed: false, date: '2024-01-20' }
              ]
            },
            {
              salesRep: 'Bob Smith',
              deals: [
                { id: 'd4', value: 28000, closed: true, date: '2024-01-12' },
                { id: 'd5', value: 15000, closed: true, date: '2024-01-18' }
              ]
            },
            {
              salesRep: 'Carol White',
              deals: [
                { id: 'd6', value: 95000, closed: true, date: '2024-01-08' },
                { id: 'd7', value: 52000, closed: true, date: '2024-01-22' }
              ]
            }
          ]
        }
      },
      null,
      2
    )
  },

  // Built-in Functions
  {
    id: 'math-functions',
    name: 'Math Functions',
    description: 'Use built-in math operations',
    category: 'Functions',
    expression: '{ rounded: state.price |> round(2), total: data.values |> reduce((a, b) => a + b, 0) |> abs, maxValue: max(...data.values) }',
    context: JSON.stringify(
      {
        data: {
          values: [23.5, -15.8, 42.3, -8.1, 19.7]
        },
        state: {
          price: 123.456789
        }
      },
      null,
      2
    )
  },
  {
    id: 'string-template',
    name: 'Template Strings',
    description: 'Format strings with interpolation',
    category: 'Functions',
    expression: '`Hello ${data.user.name}! You have ${data.notifications |> length} notifications and ${data.cart.items |> length} items in your cart.`',
    context: JSON.stringify(
      {
        data: {
          user: {
            name: 'Alice',
            email: 'alice@example.com'
          },
          notifications: [
            { id: 1, message: 'New message', read: false },
            { id: 2, message: 'Order shipped', read: false },
            { id: 3, message: 'Payment received', read: true }
          ],
          cart: {
            items: [
              { product: 'Laptop', quantity: 1 },
              { product: 'Mouse', quantity: 2 }
            ]
          }
        }
      },
      null,
      2
    )
  },

  // Object Operations
  {
    id: 'object-transform',
    name: 'Object Transformation',
    description: 'Merge and transform objects',
    category: 'Objects',
    expression: '{ ...data.defaults, ...state.overrides, computed: data.defaults.x + state.overrides.y }',
    context: JSON.stringify(
      {
        data: {
          defaults: {
            x: 10,
            y: 20,
            color: 'blue',
            enabled: true
          }
        },
        state: {
          overrides: {
            y: 30,
            color: 'red',
            priority: 'high'
          }
        }
      },
      null,
      2
    )
  },
  {
    id: 'conditional-object',
    name: 'Conditional Fields',
    description: 'Build objects with conditional logic',
    category: 'Objects',
    expression: '{ name: data.user.name, email: data.user.email, status: data.user.age >= 18 ? "adult" : "minor", discount: data.user.isPremium ? 0.20 : 0.10 }',
    context: JSON.stringify(
      {
        data: {
          user: {
            name: 'Sarah Connor',
            email: 'sarah@example.com',
            age: 32,
            isPremium: true,
            registrationDate: '2023-06-15'
          }
        }
      },
      null,
      2
    )
  },

  // Wildcards
  {
    id: 'wildcard-select',
    name: 'Wildcard Selection',
    description: 'Select from all array items',
    category: 'Wildcards',
    expression: 'data.teams[*].members |> flatten() |> map(.name)',
    context: JSON.stringify(
      {
        data: {
          teams: [
            {
              name: 'Engineering',
              members: [
                { name: 'Alice', role: 'Lead' },
                { name: 'Bob', role: 'Developer' }
              ]
            },
            {
              name: 'Product',
              members: [
                { name: 'Carol', role: 'Manager' },
                { name: 'Dave', role: 'Designer' }
              ]
            },
            {
              name: 'Sales',
              members: [
                { name: 'Eve', role: 'Director' },
                { name: 'Frank', role: 'Rep' }
              ]
            }
          ]
        }
      },
      null,
      2
    )
  }
];

export const categories = [
  'Basics',
  'Filter',
  'Map',
  'Reduce',
  'Search',
  'Pipelines',
  'Functions',
  'Objects',
  'Wildcards'
] as const;
