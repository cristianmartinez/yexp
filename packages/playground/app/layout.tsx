import type { Metadata } from 'next';
import './globals.css';
import './site.css';

export const metadata: Metadata = {
  title: { default: 'Yexp — An expression language for JSON', template: '%s | Yexp' },
  description:
    'Query, transform, and make decisions with JSON. A compact, embeddable expression language with JavaScript-shaped syntax and a bytecode runtime.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  );
}
