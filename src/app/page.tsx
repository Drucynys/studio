// src/app/page.tsx
"use client";

import { AppHeader } from "@/components/AppHeader";
import { BookOpen } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export default function Home() {
  const { user, openAuthModal } = useAuth();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader />
      <main className="flex-grow container mx-auto p-4 md:p-8 space-y-10">
        
        <section id="welcome" aria-labelledby="welcome-heading" className="text-center p-10 bg-card shadow-lg rounded-lg">
          <h1 id="welcome-heading" className="text-4xl font-headline font-bold mb-4 text-primary">Welcome to PokéTRKR!</h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Your ultimate companion for managing your Pokémon card collection. Easily add, view, and browse sets, all saved to your personal account.
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            {user ? (
              <Link href="/my-collection">
                <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground w-full sm:w-auto">
                  <BookOpen className="mr-2" /> View My Collection
                </Button>
              </Link>
            ) : (
              <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground w-full sm:w-auto" onClick={openAuthModal}>
                <BookOpen className="mr-2" /> Get Started
              </Button>
            )}
          </div>
        </section>
        
      </main>
      <footer className="text-center py-4 text-sm text-muted-foreground border-t border-border mt-auto">
        PokéTRKR &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
