'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import {
  Zap,
  Code2,
  Rocket,
  Sparkles,
  ArrowRight,
  Terminal,
  Cpu,
  BookOpen,
  PlayCircle,
} from 'lucide-react';

const codeExamples = [
  'data.items[0].name',
  'items.filter(x => x.age > 25).map(x => x.name)',
  'users.find(u => u.id == currentUserId)?.profile',
  'price * quantity * (1 - discount / 100)',
  'env.API_URL + "/users/" + userId',
];

export default function HomePage() {
  const [currentExample, setCurrentExample] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentExample((prev) => (prev + 1) % codeExamples.length);
        setIsAnimating(false);
      }, 300);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      {/* Header */}
      <header className="border-b backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image
                src="/jext-logo.svg"
                alt="Jext"
                width={40}
                height={40}
                className="dark:invert"
              />
              <h1 className="text-xl font-bold text-primary">JEXT</h1>
            </div>
            <nav className="flex items-center gap-3">
              <Button variant="ghost" asChild>
                <Link href="/docs">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Docs
                </Link>
              </Button>
              <Button variant="default" asChild className="gap-2">
                <Link href="/play">
                  <PlayCircle className="w-4 h-4" />
                  Try Playground
                </Link>
              </Button>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-6 pt-20 pb-32">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border bg-muted/50 text-sm font-medium mb-4 animate-fade-in">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>Powerful expression language for JavaScript</span>
          </div>

          <h1 className="text-6xl md:text-7xl font-bold tracking-tight animate-fade-in-up">
            Write expressions,
            <br />
            <span className="text-primary">not code</span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto animate-fade-in-up animation-delay-200">
            Jext is a fast, secure, and intuitive expression language that compiles to optimized
            bytecode. Perfect for user-defined rules, formulas, and dynamic logic.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in-up animation-delay-400">
            <Button size="lg" asChild className="gap-2 text-lg px-8 py-6">
              <Link href="/play">
                <Zap className="w-5 h-5" />
                Try Interactive Playground
                <ArrowRight className="w-5 h-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="gap-2 text-lg px-8 py-6">
              <Link href="/docs">
                <BookOpen className="w-5 h-5" />
                Read Documentation
              </Link>
            </Button>
          </div>

          {/* Animated Code Example */}
          <div className="mt-16 animate-fade-in-up animation-delay-600">
            <div className="max-w-2xl mx-auto">
              <div className="bg-card border rounded-lg shadow-2xl overflow-hidden">
                <div className="bg-muted/50 px-4 py-2 border-b flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                    <div className="w-3 h-3 rounded-full bg-green-500/80" />
                  </div>
                  <span className="text-xs text-muted-foreground ml-2">Expression</span>
                </div>
                <div className="p-8 font-mono text-2xl text-primary min-h-[120px] flex items-center justify-center">
                  <span
                    className={`transition-all duration-300 ${
                      isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
                    }`}
                  >
                    {codeExamples[currentExample]}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-6 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Why Jext?</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Built for developers who need safe, fast, and flexible user-defined logic
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Feature 1: Interactive Playground */}
            <div className="group bg-card border rounded-xl p-8 hover:shadow-xl transition-all duration-300 hover:border-primary/50 hover:-translate-y-1">
              <div className="bg-primary/10 w-14 h-14 rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Terminal className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-2xl font-semibold mb-3">Interactive Playground</h3>
              <p className="text-muted-foreground mb-4">
                Live code editor with instant feedback, AST visualization, and bytecode inspection.
                See your expressions come to life in real-time.
              </p>
              <Button variant="link" asChild className="gap-2 p-0 h-auto text-primary">
                <Link href="/play">
                  Try it now <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </div>

            {/* Feature 2: Performance & Bytecode */}
            <div className="group bg-card border rounded-xl p-8 hover:shadow-xl transition-all duration-300 hover:border-primary/50 hover:-translate-y-1">
              <div className="bg-primary/10 w-14 h-14 rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Cpu className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-2xl font-semibold mb-3">Blazing Fast</h3>
              <p className="text-muted-foreground mb-4">
                Compiles expressions to optimized bytecode for lightning-fast execution. Stack-based
                VM designed for performance and efficiency.
              </p>
              <div className="flex items-center gap-2 text-sm text-primary">
                <Rocket className="w-4 h-4" />
                <span className="font-mono">Optimized bytecode compilation</span>
              </div>
            </div>

            {/* Feature 3: Developer Experience */}
            <div className="group bg-card border rounded-xl p-8 hover:shadow-xl transition-all duration-300 hover:border-primary/50 hover:-translate-y-1">
              <div className="bg-primary/10 w-14 h-14 rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Code2 className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-2xl font-semibold mb-3">Amazing DX</h3>
              <p className="text-muted-foreground mb-4">
                First-class TypeScript support, comprehensive documentation, and powerful tooling.
                Built by developers, for developers.
              </p>
              <div className="flex flex-wrap gap-2 mt-4">
                <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-mono rounded-full">
                  TypeScript
                </span>
                <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-mono rounded-full">
                  Great Docs
                </span>
                <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-mono rounded-full">
                  Testing Tools
                </span>
              </div>
            </div>

            {/* Feature 4: Rich Language */}
            <div className="group bg-card border rounded-xl p-8 hover:shadow-xl transition-all duration-300 hover:border-primary/50 hover:-translate-y-1">
              <div className="bg-primary/10 w-14 h-14 rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Sparkles className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-2xl font-semibold mb-3">Powerful Expressions</h3>
              <p className="text-muted-foreground mb-4">
                Rich syntax with operators, functions, property access, array/object operations, and
                more. Familiar JavaScript-like syntax that&apos;s easy to learn.
              </p>
              <div className="space-y-1 text-sm font-mono text-muted-foreground">
                <div>✓ Arithmetic & logical operators</div>
                <div>✓ Lambda functions & filters</div>
                <div>✓ Safe property access</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 border border-primary/20 rounded-2xl p-12 text-center">
            <h2 className="text-4xl font-bold mb-4">Ready to get started?</h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Jump into the interactive playground and start writing expressions in seconds. No
              installation required.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild className="gap-2 text-lg px-8 py-6">
                <Link href="/play">
                  <PlayCircle className="w-5 h-5" />
                  Launch Playground
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="gap-2 text-lg px-8 py-6">
                <Link href="/docs">View Documentation</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t mt-20">
        <div className="container mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Image
                src="/jext-logo.svg"
                alt="Jext"
                width={24}
                height={24}
                className="dark:invert"
              />
              <span className="text-sm text-muted-foreground">Jext Expression Language</span>
            </div>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <Link href="/docs" className="hover:text-primary transition-colors">
                Documentation
              </Link>
              <Link href="/play" className="hover:text-primary transition-colors">
                Playground
              </Link>
              <Link href="/notebook" className="hover:text-primary transition-colors">
                Notebook
              </Link>
            </div>
          </div>
        </div>
      </footer>

      <style jsx global>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }

        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out;
        }

        .animation-delay-200 {
          animation-delay: 0.2s;
          opacity: 0;
          animation-fill-mode: forwards;
        }

        .animation-delay-400 {
          animation-delay: 0.4s;
          opacity: 0;
          animation-fill-mode: forwards;
        }

        .animation-delay-600 {
          animation-delay: 0.6s;
          opacity: 0;
          animation-fill-mode: forwards;
        }
      `}</style>
    </div>
  );
}
