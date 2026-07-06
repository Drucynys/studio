// src/components/ClientComponents.tsx
"use client";

import dynamic from 'next/dynamic';

// Dynamic imports for better code splitting - client-side only
const Toaster = dynamic(() => 
  import("@/components/ui/toaster").then(mod => ({ default: mod.Toaster })), 
  { 
    ssr: false,
    loading: () => null // No loading UI needed for these components
  }
);

const AuthModal = dynamic(() => 
  import('@/components/AuthModal').then(mod => ({ default: mod.AuthModal })), 
  { 
    ssr: false,
    loading: () => null
  }
);

const ThemeCustomizer = dynamic(() => 
  import('@/components/ThemeCustomizer').then(mod => ({ default: mod.ThemeCustomizer })), 
  { 
    ssr: false,
    loading: () => null
  }
);

export function ClientComponents() {
  return (
    <>
      <Toaster />
      <AuthModal />
      <ThemeCustomizer />
    </>
  );
}