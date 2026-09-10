import { ArrowUpRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Footer, Layout, Navbar } from 'nextra-theme-docs';
import { getPageMap } from 'nextra/page-map';
import './docs.css';

const navbar = (
  <Navbar
    logo={
      <span className="docs-wordmark">
        <Image src="/yexp-logo.svg" alt="" width={24} height={24} />
        <strong>
          yexp<span>.</span>
        </strong>
        <span className="docs-badge">docs</span>
      </span>
    }
    projectLink="https://github.com/cristianmartinez/yexp"
  >
    <Link href="/play" className="docs-play-link">
      Playground <ArrowUpRight size={14} />
    </Link>
  </Navbar>
);

const footer = (
  <Footer>
    <div className="docs-footer">
      <strong>yexp.</strong>
      <span>A small language for big data ideas.</span>
      <span>MIT licensed</span>
    </div>
  </Footer>
);

export default async function DocsLayout({ children }: { children: React.ReactNode }) {
  const pageMap = await getPageMap('/docs');
  return (
    <div className="docs-site">
      <Layout
        navbar={navbar}
        pageMap={pageMap}
        docsRepositoryBase="https://github.com/cristianmartinez/yexp/tree/main/packages/playground"
        footer={footer}
        nextThemes={{ defaultTheme: 'dark' }}
        toc={{ title: 'On this page' }}
      >
        {children}
      </Layout>
    </div>
  );
}
