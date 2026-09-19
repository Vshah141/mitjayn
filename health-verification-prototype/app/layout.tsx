import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'VeriHealth — verified health reports',
  description: 'Pitch-ready health report verification and lab booking prototype.'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
