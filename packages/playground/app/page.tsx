import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { HomePlayground } from '@/components/home-playground';

const features = [
  {
    title: 'Interactive playground',
    body: 'A live editor with instant feedback, AST visualization, and bytecode inspection.',
  },
  {
    title: 'Compiled to bytecode',
    body: 'Expressions compile to optimized bytecode and run on a small stack-based VM.',
  },
  {
    title: 'First-class TypeScript',
    body: 'Typed APIs, thorough documentation, and tooling built for everyday use.',
  },
  {
    title: 'Familiar syntax',
    body: 'Operators, lambdas, filters, and safe property access in a JavaScript-like grammar.',
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/yexp-logo.svg" alt="Yexp" width={28} height={28} className="dark:invert" />
            <span className="text-sm font-medium tracking-wide">yexp</span>
          </Link>
          <nav className="flex items-center gap-1">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/docs">Docs</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/play">Playground</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6">
        {/* Hero */}
        <section className="pt-20 pb-16">
          <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
            Write expressions, not code.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Yexp is a fast, secure expression language that compiles to bytecode — built for
            user-defined rules, formulas, and dynamic logic.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/play">Open full playground</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/docs">Read the docs</Link>
            </Button>
          </div>

          {/* Interactive mini playground */}
          <div className="mt-16">
            <HomePlayground />
            <p className="mt-3 text-xs text-muted-foreground">
              Edit the expression and step through how it compiles to bytecode and runs on the
              stack VM.
            </p>
          </div>
        </section>

        {/* Features */}
        <section className="border-t border-border py-20">
          <div className="grid gap-x-12 gap-y-10 sm:grid-cols-2">
            {features.map((f) => (
              <div key={f.title}>
                <h3 className="text-base font-medium">{f.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-border py-20">
          <h2 className="text-2xl font-semibold tracking-tight">Ready to try it?</h2>
          <p className="mt-3 max-w-xl text-muted-foreground">
            Jump into the playground and start writing expressions. No installation required.
          </p>
          <div className="mt-8">
            <Button asChild>
              <Link href="/play">Launch playground</Link>
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-3 px-6 py-8 text-sm text-muted-foreground sm:flex-row">
          <span>Yexp Expression Language</span>
          <div className="flex gap-6">
            <Link href="/docs" className="transition-colors hover:text-foreground">
              Docs
            </Link>
            <Link href="/play" className="transition-colors hover:text-foreground">
              Playground
            </Link>
            <Link href="/notebook" className="transition-colors hover:text-foreground">
              Notebook
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
