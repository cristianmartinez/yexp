import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Expr Playground',
  description: 'Interactive playground for the Expr expression language',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
