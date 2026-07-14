import { Footer, Layout, Navbar } from 'nextra-theme-docs';
import { Head } from 'nextra/components';
import { getPageMap } from 'nextra/page-map';

const navbar = (
  <Navbar
    logo={<span style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>Yexp</span>}
    projectLink="https://github.com/cristianmartinez/yexp"
  />
);

const footer = <Footer>Yexp — familiar expressions for serious data queries.</Footer>;

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
      docsRepositoryBase="https://github.com/cristianmartinez/yexp/tree/main/packages/playground/content"
      footer={footer}
    >
      {children}
    </Layout>
  );
}
