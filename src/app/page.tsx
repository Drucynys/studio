
"use client";

import { useState, useEffect } from "react";
import { AppHeader } from "@/components/AppHeader";
import { ImageGallery } from "@/components/ImageGallery";
import { Separator } from "@/components/ui/separator";
import { Images, BookOpen, PlusSquare } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <AppHeader />
        <main className="flex-grow container mx-auto p-4 md:p-8 flex items-center justify-center">
          <p className="text-xl text-muted-foreground animate-pulse">Loading Pokédex Tracker...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader />
      <main className="flex-grow container mx-auto p-4 md:p-8 space-y-10">
        
        <section id="welcome" aria-labelledby="welcome-heading" className="text-center py-12 bg-card shadow-lg rounded-lg">
          <h1 id="welcome-heading" className="text-4xl font-headline font-bold mb-4 text-primary">Welcome to Pokédex Tracker!</h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Your ultimate companion for managing your Pokémon card collection. Easily add, view, and browse sets.
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/my-collection" passHref legacyBehavior>
              <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <BookOpen className="mr-2" /> View My Collection
              </Button>
            </Link>
            <Link href="/add-card" passHref legacyBehavior>
              <Button variant="outline" size="lg">
                <PlusSquare className="mr-2" /> Add New Card
              </Button>
            </Link>
          </div>
        </section>
        
        <Separator className="my-8" />
        
        <section id="image-gallery" aria-labelledby="image-gallery-heading">
          <h2 id="image-gallery-heading" className="text-3xl font-headline font-semibold mb-6 text-foreground flex items-center gap-2">
            <Images className="h-7 w-7 text-primary" />
            Featured Card Art
          </h2>
          <ImageGallery />
        </section>

      </main>
      <footer className="text-center py-4 text-sm text-muted-foreground border-t border-border mt-auto">
        Pokédex Tracker &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
