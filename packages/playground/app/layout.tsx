import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Jext Playground',
  description: 'Interactive playground for the Jext expression language',
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
