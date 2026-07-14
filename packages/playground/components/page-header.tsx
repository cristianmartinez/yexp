import { Button } from '@/components/ui/button';
import { BookOpen, FileText, Home, Zap } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

interface PageHeaderProps {
  currentPage: 'home' | 'playground' | 'notebook' | 'docs';
}

export function PageHeader({ currentPage }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
        <Image
          src="/yexp-logo.svg"
          alt="Yexp"
          width={40}
          height={40}
          className="h-10 w-10 dark:invert"
        />
        <h1 className="text-sm font-bold text-primary">YEXP</h1>
      </Link>
      <div className="flex gap-2">
        <Button
          variant={currentPage === 'home' ? 'default' : 'outline'}
          className="gap-2"
          asChild={currentPage !== 'home'}
        >
          {currentPage === 'home' ? (
            <>
              <Home className="w-4 h-4" />
              Home
            </>
          ) : (
            <Link href="/">
              <Home className="w-4 h-4" />
              Home
            </Link>
          )}
        </Button>
        <Button
          variant={currentPage === 'playground' ? 'default' : 'outline'}
          className="gap-2"
          asChild={currentPage !== 'playground'}
        >
          {currentPage === 'playground' ? (
            <>
              <Zap className="w-4 h-4" />
              Playground
            </>
          ) : (
            <Link href="/play">
              <Zap className="w-4 h-4" />
              Playground
            </Link>
          )}
        </Button>
        <Button
          variant={currentPage === 'notebook' ? 'default' : 'outline'}
          className="gap-2"
          asChild={currentPage !== 'notebook'}
        >
          {currentPage === 'notebook' ? (
            <>
              <BookOpen className="w-4 h-4" />
              Notebook
            </>
          ) : (
            <Link href="/notebook">
              <BookOpen className="w-4 h-4" />
              Notebook
            </Link>
          )}
        </Button>
        <Button
          variant={currentPage === 'docs' ? 'default' : 'outline'}
          className="gap-2"
          asChild={currentPage !== 'docs'}
        >
          {currentPage === 'docs' ? (
            <>
              <FileText className="w-4 h-4" />
              Docs
            </>
          ) : (
            <Link href="/docs">
              <FileText className="w-4 h-4" />
              Docs
            </Link>
          )}
        </Button>
      </div>
    </div>
  );
}
