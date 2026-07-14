import { HomePlayground } from '@/components/home-playground';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  ArrowUpRight,
  Braces,
  FileCode2,
  Github,
  Search,
  ShieldCheck,
  Terminal,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

const progression = [
  {
    step: '01',
    label: 'Read',
    description: 'Start with the property access you already know.',
    expression: '$.user.profile.name',
    result: '"Ada"',
  },
  {
    step: '02',
    label: 'Select',
    description: 'Filter in place with a query-language predicate.',
    expression: '$.products[.inStock && .price < 100]',
    result: '[{...}, {...}]',
  },
  {
    step: '03',
    label: 'Project',
    description: 'Use a wildcard to pull one field from every match.',
    expression: '$.products[.inStock][*].name',
    result: '["Mouse", "Keyboard"]',
  },
  {
    step: '04',
    label: 'Transform',
    description: 'Compose collection operations into a complete query.',
    expression: '$.orders |> groupBy(.customer) |> mapEntries(...)',
    result: '{ Ada: {...}, Linus: {...} }',
  },
];

const principles = [
  {
    icon: Braces,
    title: 'Familiar by default',
    body: 'Property access, literals, templates, ternaries, and arrow lambdas follow a JavaScript-shaped syntax.',
  },
  {
    icon: Search,
    title: 'Query-native when needed',
    body: 'Predicate selectors, wildcards, negative indices, recursive descent, and pipes keep data work concise.',
  },
  {
    icon: ShieldCheck,
    title: 'A compiled boundary',
    body: 'Expressions compile to inspectable bytecode instead of running through eval() or generated JavaScript.',
  },
];

const quickstartCode = [
  "import { compile, evaluate } from '@cristianmartinez/yexp';",
  '',
  'const affordable = compile(',
  `  '$.products[.inStock && .price < 100][*].name',`,
  ');',
  '',
  'const result = evaluate(affordable, {',
  '  products: [',
  "    { name: 'Mouse', price: 25, inStock: true },",
  "    { name: 'Laptop', price: 999, inStock: true },",
  '  ],',
  '}); // ["Mouse"]',
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/70">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5" aria-label="Yexp home">
            <Image
              src="/yexp-logo.svg"
              alt=""
              width={22}
              height={22}
              className="h-[22px] w-[22px] dark:invert"
            />
            <span className="font-mono text-sm font-semibold tracking-tight">yexp</span>
          </Link>

          <nav className="flex items-center gap-0.5 text-sm">
            <Button variant="ghost" size="sm" asChild className="hidden rounded-sm sm:inline-flex">
              <Link href="/docs/syntax">Language</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild className="hidden rounded-sm sm:inline-flex">
              <Link href="/docs/spec">Specification</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild className="rounded-sm">
              <Link href="/play">Playground</Link>
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-sm" asChild>
              <a href="https://github.com/cristianmartinez/yexp" aria-label="Yexp on GitHub">
                <Github className="size-4" />
              </a>
            </Button>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-5 pb-16 pt-16 sm:px-8 sm:pb-24 sm:pt-24">
          <div className="grid items-end gap-12 lg:grid-cols-[minmax(0,1.12fr)_minmax(25rem,0.88fr)] lg:gap-16">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
                JavaScript familiarity. Query-language power.
              </p>
              <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-[1.04] tracking-[-0.045em] sm:text-6xl lg:text-[4.35rem]">
                Query data with expressions you already understand.
              </h1>
              <p className="mt-7 max-w-2xl text-lg leading-8 text-muted-foreground">
                Yexp starts with familiar syntax, then adds the useful parts of dedicated query
                languages: inline predicates, projections, recursive search, and composable
                pipelines.
              </p>

              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Button asChild className="rounded-sm">
                  <Link href="/play">
                    Try the playground
                    <ArrowUpRight className="size-4" />
                  </Link>
                </Button>
                <Button variant="outline" asChild className="rounded-sm">
                  <Link href="/docs/syntax">Learn the language</Link>
                </Button>
                <Link
                  href="/docs/spec"
                  className="px-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Read the 0.1 spec →
                </Link>
              </div>
            </div>

            <div className="min-w-0 overflow-hidden rounded-sm border bg-card shadow-[0_20px_60px_-42px_rgba(0,0,0,0.45)]">
              <div className="flex items-center justify-between border-b px-4 py-3">
                <span className="font-mono text-xs text-muted-foreground">query.yexp</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                  one expression
                </span>
              </div>
              <div className="space-y-5 p-4 sm:p-5">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    Input
                  </p>
                  <pre className="mt-2 overflow-x-auto font-mono text-xs leading-6 text-muted-foreground">
                    <code>{`{ products: [
  { name: "Mouse", price: 25, inStock: true },
  { name: "Laptop", price: 999, inStock: true }
] }`}</code>
                  </pre>
                </div>
                <div className="border-y py-5">
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    Expression
                  </p>
                  <code className="mt-2 block overflow-x-auto font-mono text-sm leading-6">
                    {'$.products[.inStock && .price < 100][*].name'}
                  </code>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      Result
                    </p>
                    <code className="mt-1.5 block font-mono text-sm">["Mouse"]</code>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    <span className="border px-2 py-1">No eval</span>
                    <span className="border px-2 py-1">Bytecode</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 grid overflow-hidden rounded-sm border bg-muted/15 font-mono text-xs sm:grid-cols-2">
            <div className="flex min-w-0 items-center gap-3 px-3.5 py-3 sm:px-4">
              <Braces className="size-4 shrink-0 text-muted-foreground" />
              <code className="min-w-0 flex-1 truncate">npm install @cristianmartinez/yexp</code>
              <a
                href="https://www.npmjs.com/package/@cristianmartinez/yexp"
                className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
              >
                npm ↗
              </a>
            </div>
            <div className="flex min-w-0 items-center gap-3 border-t px-3.5 py-3 sm:border-l sm:border-t-0 sm:px-4">
              <Terminal className="size-4 shrink-0 text-muted-foreground" />
              <code className="min-w-0 flex-1 truncate">
                npm install -g @cristianmartinez/yexp-cli
              </code>
              <span className="shrink-0 text-muted-foreground">CLI</span>
            </div>
          </div>
        </section>

        <section className="border-y border-border/70 bg-muted/20">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] lg:gap-14">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  A gradual language
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
                  Simple expressions scale into serious queries.
                </h2>
                <p className="mt-5 max-w-md leading-7 text-muted-foreground">
                  You do not need to learn a dense query grammar on day one. Start with property
                  access, then adopt selectors and pipelines as the data work becomes richer.
                </p>
                <Link
                  href="/docs/syntax"
                  className="mt-7 inline-flex items-center gap-2 text-sm font-medium hover:underline"
                >
                  Follow the language guide <ArrowRight className="size-3.5" />
                </Link>
              </div>

              <ol className="divide-y border-y">
                {progression.map((item) => (
                  <li
                    key={item.step}
                    className="grid gap-3 py-5 sm:grid-cols-[2.25rem_5rem_minmax(0,1fr)] sm:items-start sm:gap-4"
                  >
                    <span className="font-mono text-xs text-muted-foreground">{item.step}</span>
                    <div>
                      <h3 className="font-mono text-xs font-semibold uppercase tracking-wider">
                        {item.label}
                      </h3>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground sm:hidden">
                        {item.description}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="hidden text-sm text-muted-foreground sm:block">
                        {item.description}
                      </p>
                      <div className="mt-2 grid min-w-0 gap-2 font-mono text-xs xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
                        <code className="overflow-x-auto">{item.expression}</code>
                        <code className="text-muted-foreground">→ {item.result}</code>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <section id="quickstart" className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
          <div className="grid min-w-0 gap-10 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)] lg:gap-16">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Embed the language
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em]">
                Compile once. Evaluate against any input.
              </h2>
              <p className="mt-4 max-w-md leading-7 text-muted-foreground">
                A compiled program is reusable and JSON-serializable. The same language powers
                application rules, browser tools, and terminal JSON workflows.
              </p>

              <div className="mt-8 divide-y border-y">
                <div className="grid grid-cols-[2rem_1fr] gap-3 py-4">
                  <span className="font-mono text-xs text-muted-foreground">01</span>
                  <p className="text-sm">Compile a human-readable expression.</p>
                </div>
                <div className="grid grid-cols-[2rem_1fr] gap-3 py-4">
                  <span className="font-mono text-xs text-muted-foreground">02</span>
                  <p className="text-sm">Cache or serialize the versioned bytecode.</p>
                </div>
                <div className="grid grid-cols-[2rem_1fr] gap-3 py-4">
                  <span className="font-mono text-xs text-muted-foreground">03</span>
                  <p className="text-sm">
                    Evaluate with explicit <code className="font-mono">$</code>,{' '}
                    <code className="font-mono">$context</code>, and{' '}
                    <code className="font-mono">$env</code> roots.
                  </p>
                </div>
              </div>
            </div>

            <div className="min-w-0 overflow-hidden rounded-sm border bg-card">
              <div className="flex items-center justify-between border-b px-4 py-3">
                <span className="font-mono text-xs text-muted-foreground">app.ts</span>
                <span className="border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  TypeScript
                </span>
              </div>
              <pre className="overflow-x-auto px-4 py-5 font-mono text-[13px] leading-6 sm:px-5">
                <code>
                  {quickstartCode.map((line, index) => (
                    <span key={`${index}-${line}`} className="grid grid-cols-[1.75rem_1fr]">
                      <span aria-hidden="true" className="select-none text-muted-foreground/45">
                        {index + 1}
                      </span>
                      <span>{line || ' '}</span>
                    </span>
                  ))}
                </code>
              </pre>
              <div className="grid gap-3 border-t bg-muted/20 p-4 sm:grid-cols-[auto_1fr] sm:items-center sm:px-5">
                <div>
                  <p className="text-sm font-medium">Prefer the terminal?</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Pipe JSON through the same language.
                  </p>
                </div>
                <code className="min-w-0 overflow-x-auto rounded-sm border bg-background px-3 py-2 font-mono text-xs sm:text-right">
                  {`echo '{"name":"Ada"}' | npx @cristianmartinez/yexp-cli '.name'`}
                </code>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 border-t pt-6 text-sm">
            <Link href="/docs/getting-started" className="font-medium hover:underline">
              Read the getting started guide →
            </Link>
            <a
              href="https://www.npmjs.com/package/@cristianmartinez/yexp"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              View package on npm ↗
            </a>
          </div>
        </section>

        <section className="border-y border-border/70 bg-muted/20">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
            <div className="mb-7 flex items-end justify-between gap-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  Inspect the runtime
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">Source to stack</h2>
              </div>
              <Link
                href="/play"
                className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:block"
              >
                Open full playground →
              </Link>
            </div>
            <HomePlayground />
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
          <div className="grid divide-y border-y sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {principles.map(({ icon: Icon, title, body }) => (
              <div key={title} className="py-7 sm:px-7 sm:first:pl-0 sm:last:pr-0">
                <Icon className="size-4 text-muted-foreground" />
                <h3 className="mt-4 font-mono text-sm font-semibold">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>

          <div className="grid items-center gap-8 border-b py-14 sm:grid-cols-[1fr_auto]">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
                <FileCode2 className="size-4" />
                Language specification 0.1
              </div>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.025em]">
                A real language contract, not a collection of syntax tricks.
              </h2>
              <p className="mt-3 leading-7 text-muted-foreground">
                The specification defines values, truthiness, selectors, built-ins, precedence,
                errors, portability, and the conformance requirements future runtimes must share.
              </p>
            </div>
            <Button variant="outline" asChild className="rounded-sm">
              <Link href="/docs/spec">Read the specification</Link>
            </Button>
          </div>

          <div className="flex flex-col items-start justify-between gap-6 pt-14 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">
                Start familiar. Go as deep as the data requires.
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Try a query in the playground or learn the language from first principles.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" asChild className="rounded-sm">
                <Link href="/docs/syntax">Language guide</Link>
              </Button>
              <Button asChild className="rounded-sm">
                <Link href="/play">Open playground</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/70">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-7 font-mono text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <span>MIT licensed</span>
          <span>One expression language for application and terminal workflows</span>
        </div>
      </footer>
    </div>
  );
}
