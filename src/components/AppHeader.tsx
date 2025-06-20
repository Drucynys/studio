
import Link from "next/link";
import { PokeballIcon } from '@/components/icons/PokeballIcon';
import { Button } from "@/components/ui/button";
import { PackageSearch, LayoutList, PlusSquare, Target } from "lucide-react"; // Changed ListChecks to Target

export function AppHeader() {
  return (
    <header className="bg-primary text-primary-foreground shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 md:px-8 py-3 flex items-center justify-between">
        <Link href="/" passHref legacyBehavior>
          <a className="flex items-center gap-3">
            <PokeballIcon className="h-8 w-8 md:h-10 md:w-10" />
            <h1 className="text-2xl md:text-3xl font-headline font-bold">
              Pokédex Tracker
            </h1>
          </a>
        </Link>
        <nav className="flex items-center gap-1 md:gap-2">
          <Link href="/my-collection" passHref legacyBehavior>
            <Button variant="ghost" className="hover:bg-primary-foreground/10 text-primary-foreground px-2 md:px-3">
              <LayoutList className="mr-0 md:mr-2 h-5 w-5" />
              <span className="hidden md:inline">My Collection</span>
            </Button>
          </Link>
          <Link href="/add-card" passHref legacyBehavior>
            <Button variant="ghost" className="hover:bg-primary-foreground/10 text-primary-foreground px-2 md:px-3">
              <PlusSquare className="mr-0 md:mr-2 h-5 w-5" />
               <span className="hidden md:inline">Add Card</span>
            </Button>
          </Link>
          <Link href="/browse-sets" passHref legacyBehavior>
            <Button variant="ghost" className="hover:bg-primary-foreground/10 text-primary-foreground px-2 md:px-3">
              <PackageSearch className="mr-0 md:mr-2 h-5 w-5" />
              <span className="hidden md:inline">Browse Sets</span>
            </Button>
          </Link>
           <Link href="/pokedex" passHref legacyBehavior>
            <Button variant="secondary" className="bg-primary-foreground/10 hover:bg-primary-foreground/20 text-primary-foreground px-2 md:px-3">
              <Target className="mr-0 md:mr-2 h-5 w-5" /> {/* Changed ListChecks to Target */}
              <span className="hidden md:inline">Pokédex</span>
            </Button>
          </Link>
        </nav>
      </div>
    </header>
  );
}
