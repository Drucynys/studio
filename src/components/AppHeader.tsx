// src/components/AppHeader.tsx
import Link from "next/link";
import { PokeballIcon } from '@/components/icons/PokeballIcon';
import { Button } from "@/components/ui/button";
import { PackageSearch, LayoutList, Search } from "lucide-react";
import { AuthButton } from "./AuthButton";
import { PokedexIcon } from "./icons/PokedexIcon";

export function AppHeader() {
  return (
    <header className="bg-primary text-primary-foreground shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 md:px-8 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <PokeballIcon className="h-8 w-8 md:h-10 md:w-10" />
          <h1 className="text-2xl md:text-3xl font-headline font-bold">
            Pokédex Tracker
          </h1>
        </Link>
        <nav className="flex items-center gap-1 md:gap-2">
          <Link href="/search">
            <Button variant="ghost" className="hover:bg-primary-foreground/10 text-primary-foreground px-2 md:px-3">
              <Search className="mr-0 md:mr-2 h-5 w-5" />
              <span className="hidden md:inline">Search</span>
            </Button>
          </Link>
          <Link href="/my-collection">
            <Button variant="ghost" className="hover:bg-primary-foreground/10 text-primary-foreground px-2 md:px-3">
              <LayoutList className="mr-0 md:mr-2 h-5 w-5" />
              <span className="hidden md:inline">My Collection</span>
            </Button>
          </Link>
          <Link href="/browse-sets">
            <Button variant="ghost" className="hover:bg-primary-foreground/10 text-primary-foreground px-2 md:px-3">
              <PackageSearch className="mr-0 md:mr-2 h-5 w-5" />
              <span className="hidden md:inline">Browse</span>
            </Button>
          </Link>
           <Link href="/pokedex">
            <Button variant="secondary" className="bg-primary-foreground/10 hover:bg-primary-foreground/20 text-primary-foreground px-2 md:px-3">
              <PokedexIcon className="mr-0 md:mr-2 h-5 w-5" />
              <span className="hidden md:inline">Pokédex</span>
            </Button>
          </Link>
          <div className="ml-2 md:ml-4">
            <AuthButton />
          </div>
        </nav>
      </div>
    </header>
  );
}
