import { Footer, Layout, Navbar } from 'nextra-theme-docs';
import { Head } from 'nextra/components';
import { getPageMap } from 'nextra/page-map';

const navbar = (
  <Navbar
    logo={<span style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>Jext</span>}
    projectLink="https://github.com/cristianmartinez/Expr"
  />
);

const footer = <Footer>Jext Expression Engine</Footer>;

export default async function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pageMap = await getPageMap();

  return (
    <Layout
      navbar={navbar}
      pageMap={pageMap}
      docsRepositoryBase="https://github.com/cristianmartinez/Expr/tree/main/packages/playground"
      footer={footer}
    >
      {children}
    </Layout>
  );
}
