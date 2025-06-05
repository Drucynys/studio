import { PokeballIcon } from '@/components/icons/PokeballIcon';

export function AppHeader() {
  return (
    <header className="bg-primary text-primary-foreground shadow-md">
      <div className="container mx-auto px-4 md:px-8 py-4 flex items-center gap-3">
        <PokeballIcon className="h-8 w-8 md:h-10 md:w-10" />
        <h1 className="text-2xl md:text-3xl font-headline font-bold">
          Pokédex Tracker
        </h1>
      </div>
    </header>
  );
}
