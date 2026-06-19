import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Ørigenes Quantum Platform',
  description: 'Fermentation R&D powered by quantum simulation and AI · Oba★',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
