// src/app/page.tsx
"use client";

import { AppHeader } from "@/components/AppHeader";
import { BookOpen, Search, LayoutList, PlusCircle, PackageSearch, Camera, Sparkles, Award } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useUIStore } from "@/store/useUIStore";
import { useUserCollection } from "@/hooks/useUserCollection";
import { PokedexIcon } from "@/components/icons/PokedexIcon";

export default function Home() {
  const { user, loginAsDemoGuest } = useAuth();
  const { collection } = useUserCollection(user?.uid);
  const { openAuthModal } = useUIStore();
  
  const totalCards = collection?.length || 0;
  const uniqueSpecies = new Set(collection?.map(c => c.name.toLowerCase()) || []).size;

  const features = [
    {
      title: "My Collection",
      description: "Manage your personal card vault, trace card values, and view detailed statistics about your collection.",
      href: "/my-collection",
      icon: <LayoutList className="h-6 w-6 text-emerald-500" />,
      color: "hover:border-emerald-500/50 hover:shadow-emerald-500/10",
      badge: user ? `${totalCards} cards` : null
    },
    {
      title: "Advanced Search",
      description: "Instantly query thousands of cards by name, type, rarity, artist, or specific expansion sets.",
      href: "/search",
      icon: <Search className="h-6 w-6 text-blue-500" />,
      color: "hover:border-blue-500/50 hover:shadow-blue-500/10"
    },
    {
      title: "Browse Sets",
      description: "Explore all official Pokémon TCG expansions in numerical order with our smooth infinite scroll gallery.",
      href: "/browse-sets",
      icon: <PackageSearch className="h-6 w-6 text-amber-500" />,
      color: "hover:border-amber-500/50 hover:shadow-amber-500/10"
    },
    {
      title: "National Pokédex",
      description: "Track your species ownership progress across Gen 1 to Gen 9. Complete your National Dex!",
      href: "/pokedex",
      icon: <PokedexIcon className="h-6 w-6 text-rose-500" />,
      color: "hover:border-rose-500/50 hover:shadow-rose-500/10",
      badge: user ? `${uniqueSpecies} / 1025 Dex` : null
    },
    {
      title: "AI Card Scanner",
      description: "Scan card artwork using your device camera or upload an image to identify and catalog cards instantly.",
      href: "/add-card",
      icon: <Camera className="h-6 w-6 text-indigo-500" />,
      color: "hover:border-indigo-500/50 hover:shadow-indigo-500/10",
      badge: "AI Powered"
    }
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader />
      <main className="flex-grow container mx-auto p-4 md:p-8 space-y-12">
        
        {/* Welcome Section */}
        <section id="welcome" aria-labelledby="welcome-heading" className="relative overflow-hidden text-center p-8 md:p-12 bg-gradient-to-br from-card to-card/90 border shadow-2xl rounded-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl -z-10" />
          
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4">
            <Sparkles className="h-3 w-3" />
            <span>The Ultimate Pokémon TCG Companion</span>
          </div>
          
          <h1 id="welcome-heading" className="text-4xl md:text-5xl font-headline font-bold mb-4 tracking-tight">
            Welcome to <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">PokéTRKR</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Your master portal for managing, searching, and cataloging your Pokémon card collection. 
            Track market values, complete historic sets, and fulfill your dream of a complete National Pokédex.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            {user ? (
              <Link href="/my-collection">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 shadow-lg shadow-primary/20">
                  <BookOpen className="mr-2 h-5 w-5" /> Open My Collection
                </Button>
              </Link>
            ) : (
              <>
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 shadow-lg shadow-primary/20 w-full sm:w-auto" onClick={openAuthModal}>
                  <BookOpen className="mr-2 h-5 w-5" /> Start Your Collection
                </Button>
                <Button size="lg" variant="outline" className="border-primary/20 text-primary hover:bg-primary/5 font-semibold px-8 w-full sm:w-auto" onClick={() => loginAsDemoGuest()}>
                  <Sparkles className="mr-2 h-5 w-5" /> Explore in Sandbox Mode
                </Button>
              </>
            )}
          </div>
        </section>

        {/* Feature Dashboard Section */}
        <section className="space-y-6">
          <div className="text-center md:text-left space-y-1 px-2">
            <h2 className="text-2xl md:text-3xl font-headline font-bold">Explore Features</h2>
            <p className="text-muted-foreground">Every tool you need to complete your master set.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <Link href={feature.href} key={feature.title} className="block group">
                <div className={`h-full p-6 bg-card border rounded-xl transition-all duration-300 transform group-hover:-translate-y-1 shadow-md hover:shadow-xl flex flex-col justify-between ${feature.color}`}>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="p-3 bg-muted rounded-lg group-hover:bg-primary/5 transition-colors">
                        {feature.icon}
                      </div>
                      {feature.badge && (
                        <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-accent/10 text-accent border border-accent/20">
                          {feature.badge}
                        </span>
                      )}
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold tracking-tight group-hover:text-primary transition-colors">
                        {feature.title}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                  <div className="pt-4 flex items-center text-xs font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>Explore Page &rarr;</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
        
      </main>
      <footer className="text-center py-6 text-sm text-muted-foreground border-t border-border mt-auto">
        PokéTRKR &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
