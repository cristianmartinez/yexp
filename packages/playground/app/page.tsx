import { HomePlayground } from '@/components/home-playground';
import { Button } from '@/components/ui/button';
import { ArrowUpRight, Github, Terminal } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

const capabilities = [
  ['Portable', 'Pure TypeScript with serializable bytecode.'],
  ['Predictable', 'A small VM with explicit execution semantics.'],
  ['Extensible', 'Add host functions without exposing JavaScript.'],
];

const quickstartCode = [
  "import { compile, evaluate } from '@cristianmartinez/yexp';",
  '',
  "const qualifies = compile('$.cart.total >= 50 && $.user.active');",
  '',
  'const result = evaluate(qualifies, {',
  '  cart: { total: 72 },',
  '  user: { active: true },',
  '});',
  '',
  'console.log(result); // true',
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/70">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5" aria-label="Yexp home">
            <Image src="/yexp-logo.svg" alt="" width={22} height={22} className="dark:invert" />
            <span className="hidden font-mono text-sm font-semibold tracking-tight sm:inline">
              yexp
            </span>
          </Link>

          <nav className="flex items-center gap-1 text-sm">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/docs">Docs</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/play">Playground</Link>
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
              <a href="https://github.com/cristianmartinez/yexp" aria-label="Yexp on GitHub">
                <Github className="size-4" />
              </a>
            </Button>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-5xl px-5 pb-16 pt-20 sm:px-8 sm:pb-24 sm:pt-28">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-semibold leading-[1.08] tracking-[-0.04em] sm:text-6xl">
              Expressions for data,
              <br className="hidden sm:block" /> without executing code.
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-muted-foreground">
              Yexp is a compact expression language that compiles familiar syntax to portable
              bytecode. Use it for rules, formulas, filters, and user-defined logic.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Button asChild className="rounded-sm">
                <Link href="/play">
                  Try the playground
                  <ArrowUpRight className="size-4" />
                </Link>
              </Button>
              <Button variant="outline" asChild className="rounded-sm">
                <a href="#quickstart">See how to use it</a>
              </Button>
            </div>

            <div className="mt-10 flex max-w-xl flex-col overflow-hidden rounded-sm border bg-muted/30 font-mono text-sm">
              <div className="flex min-w-0 items-center gap-3 px-3.5 py-2.5">
                <Terminal className="size-4 shrink-0 text-muted-foreground" />
                <code className="min-w-0 flex-1 truncate">npm install @cristianmartinez/yexp</code>
                <a
                  href="https://www.npmjs.com/package/@cristianmartinez/yexp"
                  className="shrink-0 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  npm ↗
                </a>
              </div>
              <div className="flex min-w-0 items-center gap-3 border-t px-3.5 py-2.5 text-muted-foreground">
                <span className="w-4 shrink-0 text-center">$</span>
                <code className="min-w-0 flex-1 truncate">npm install -g yexp</code>
              </div>
            </div>
          </div>
        </section>

        <section id="quickstart" className="border-t border-border/70">
          <div className="mx-auto max-w-5xl px-5 py-16 sm:px-8 sm:py-20">
            <div className="grid min-w-0 gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-16">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  Quick start
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em]">
                  Compile once. Evaluate against any data.
                </h2>
                <p className="mt-4 max-w-md leading-7 text-muted-foreground">
                  Write a familiar expression, compile it to portable bytecode, then run that
                  program wherever your application needs it.
                </p>

                <ol className="mt-8 space-y-5">
                  <li className="grid grid-cols-[2rem_1fr] gap-3">
                    <span className="font-mono text-xs text-muted-foreground">01</span>
                    <div>
                      <h3 className="text-sm font-medium">Install the library</h3>
                      <code className="mt-1.5 block font-mono text-sm text-muted-foreground">
                        npm install @cristianmartinez/yexp
                      </code>
                    </div>
                  </li>
                  <li className="grid grid-cols-[2rem_1fr] gap-3">
                    <span className="font-mono text-xs text-muted-foreground">02</span>
                    <div>
                      <h3 className="text-sm font-medium">Compile an expression</h3>
                      <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                        The returned program is reusable and JSON-serializable.
                      </p>
                    </div>
                  </li>
                  <li className="grid grid-cols-[2rem_1fr] gap-3">
                    <span className="font-mono text-xs text-muted-foreground">03</span>
                    <div>
                      <h3 className="text-sm font-medium">Evaluate with your input</h3>
                      <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                        Input is available through <code className="font-mono">$</code>. No{' '}
                        <code className="font-mono">eval()</code> or generated JavaScript.
                      </p>
                    </div>
                  </li>
                </ol>
              </div>

              <div className="min-w-0 overflow-hidden rounded-sm border bg-card">
                <div className="flex items-center justify-between border-b px-4 py-3">
                  <span className="font-mono text-xs text-muted-foreground">app.ts</span>
                  <span className="rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
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
                      Run it once with npx and pipe JSON into it.
                    </p>
                  </div>
                  <code className="min-w-0 overflow-x-auto rounded-sm border bg-background px-3 py-2 font-mono text-xs sm:text-right">
                    {`echo '{"cart":{"total":72}}' | npx yexp '.cart.total >= 50'`}
                  </code>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 border-t pt-6 text-sm">
              <Link href="/docs/getting-started" className="font-medium hover:underline">
                Read the full getting started guide →
              </Link>
              <a
                href="https://www.npmjs.com/package/@cristianmartinez/yexp"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                View package on npm ↗
              </a>
            </div>
          </div>
        </section>

        <section className="border-y border-border/70 bg-muted/20">
          <div className="mx-auto max-w-5xl px-5 py-16 sm:px-8 sm:py-20">
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

        <section className="mx-auto max-w-5xl px-5 py-16 sm:px-8 sm:py-20">
          <div className="grid divide-y border-y sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {capabilities.map(([title, body]) => (
              <div key={title} className="py-7 sm:px-7 sm:first:pl-0 sm:last:pr-0">
                <h3 className="font-mono text-sm font-semibold">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col items-start justify-between gap-6 pt-16 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">
                Small language. Clear boundary.
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Compile once, evaluate anywhere your application runs.
              </p>
            </div>
            <Button variant="outline" asChild className="rounded-sm">
              <Link href="/docs/getting-started">Get started</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/70">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-5 py-7 font-mono text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <span>MIT licensed</span>
          <span>Built for browser and server runtimes</span>
        </div>
      </footer>
    </div>
  );
}
