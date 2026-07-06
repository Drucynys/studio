// src/app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';
import './card-styles.css'; // Import the new card styles
import { AuthProvider } from '@/context/AuthContext';
import { ClientComponents } from '@/components/ClientComponents';
import { QueryProvider } from '@/components/QueryProvider';

export const metadata: Metadata = {
  title: 'PokéTRKR',
  description: 'Track your Pokémon card collection',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased pb-20 lg:pb-0" suppressHydrationWarning={true}>
        <QueryProvider>
          <AuthProvider>
            {children}
            <ClientComponents />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
