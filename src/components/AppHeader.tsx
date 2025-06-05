
import Link from "next/link";
import { PokeballIcon } from '@/components/icons/PokeballIcon';
import { Button } from "@/components/ui/button";
import { PackageSearch } from "lucide-react";

export function AppHeader() {
  return (
    <header className="bg-primary text-primary-foreground shadow-md">
      <div className="container mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
        <Link href="/" passHref legacyBehavior>
          <a className="flex items-center gap-3">
            <PokeballIcon className="h-8 w-8 md:h-10 md:w-10" />
            <h1 className="text-2xl md:text-3xl font-headline font-bold">
              Pokédex Tracker
            </h1>
          </a>
        </Link>
        <Link href="/browse-sets" passHref legacyBehavior>
          <Button variant="secondary" className="bg-primary-foreground/10 hover:bg-primary-foreground/20 text-primary-foreground">
            <PackageSearch className="mr-2 h-5 w-5" />
            Browse Sets
          </Button>
        </Link>
      </div>
    </header>
  );
}
