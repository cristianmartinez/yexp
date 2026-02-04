import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Vlot Playground',
  description: 'Interactive playground for the Vlot expression language',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">{children}</body>
    </html>
  );
}
