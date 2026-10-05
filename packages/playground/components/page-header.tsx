import { Button } from '@/components/ui/button';
import { BookOpen, FileText, Home, Zap } from 'lucide-react';

interface PageHeaderProps {
  currentPage: 'home' | 'playground' | 'notebook' | 'docs';
}

export function PageHeader({ currentPage }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <a href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
        <img
          src="/yexp-logo.svg"
          alt="Yexp"
          width={40}
          height={40}
          className="h-10 w-10 dark:invert"
        />
        <h1 className="text-sm font-bold text-primary">YEXP</h1>
      </a>
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
            <a href="/">
              <Home className="w-4 h-4" />
              Home
            </a>
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
            <a href="/play">
              <Zap className="w-4 h-4" />
              Playground
            </a>
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
            <a href="/notebook">
              <BookOpen className="w-4 h-4" />
              Notebook
            </a>
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
            <a href="/docs">
              <FileText className="w-4 h-4" />
              Docs
            </a>
          )}
        </Button>
      </div>
    </div>
  );
}
