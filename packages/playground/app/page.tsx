import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, Github, Terminal } from 'lucide-react';
import { HomePlayground } from '@/components/home-playground';
import { Button } from '@/components/ui/button';

const capabilities = [
  ['Portable', 'Pure TypeScript with serializable bytecode.'],
  ['Predictable', 'A small VM with explicit execution semantics.'],
  ['Extensible', 'Add host functions without exposing JavaScript.'],
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/70">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5" aria-label="Yexp home">
            <Image src="/yexp-logo.svg" alt="" width={22} height={22} className="dark:invert" />
            <span className="hidden font-mono text-sm font-semibold tracking-tight sm:inline">yexp</span>
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
            <div className="mb-7 flex items-center gap-2 font-mono text-xs text-muted-foreground">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              open source · v0.0.1
            </div>
            <h1 className="text-4xl font-semibold leading-[1.08] tracking-[-0.04em] sm:text-6xl">
              Expressions for data,
              <br className="hidden sm:block" /> without executing code.
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-muted-foreground">
              Yexp is a compact expression language that compiles familiar syntax to portable
              bytecode. Use it for rules, formulas, filters, and user-defined logic.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Button asChild>
                <Link href="/play">
                  Try the playground
                  <ArrowUpRight className="size-4" />
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/docs">Read the docs</Link>
              </Button>
            </div>

            <div className="mt-10 flex w-full items-center gap-3 rounded-md border bg-muted/30 px-3.5 py-2.5 font-mono text-sm sm:inline-flex sm:w-auto">
              <Terminal className="size-4 shrink-0 text-muted-foreground" />
              <code className="min-w-0 truncate">bun add @yexp/core</code>
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
              <h2 className="text-xl font-semibold tracking-tight">Small language. Clear boundary.</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Compile once, evaluate anywhere your application runs.
              </p>
            </div>
            <Button variant="outline" asChild>
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
