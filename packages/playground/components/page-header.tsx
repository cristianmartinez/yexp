import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { BookOpen, Zap } from 'lucide-react';

interface PageHeaderProps {
  currentPage: 'playground' | 'notebook';
}

export function PageHeader({ currentPage }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Image src="/vlot-logo.svg" alt="Vlot" width={40} height={40} className="dark:invert" />
        <h1 className="text-sm font-bold text-primary">VLOT</h1>
      </div>
      <div className="flex gap-2">
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
            <Link href="/">
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
      </div>
    </div>
  );
}
