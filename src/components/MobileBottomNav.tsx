// src/components/MobileBottomNav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, LayoutList, PackageSearch } from "lucide-react";
import { PokedexIcon } from "@/components/icons/PokedexIcon";
import { cn } from "@/lib/utils";

export function MobileBottomNav() {
  const pathname = usePathname();

  const navItems = [
    {
      label: "Search",
      href: "/search",
      icon: Search,
    },
    {
      label: "Collection",
      href: "/my-collection",
      icon: LayoutList,
    },
    {
      label: "Pokédex",
      href: "/pokedex",
      icon: PokedexIcon,
    },
    {
      label: "Sets",
      href: "/browse-sets",
      icon: PackageSearch,
    },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-md border-t border-border/60 shadow-lg px-4 py-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))] flex justify-around items-center h-[calc(4rem+env(safe-area-inset-bottom))]">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
        
        return (
          <Link 
            key={item.href} 
            href={item.href}
            className="flex flex-col items-center justify-center flex-1 py-1 text-center transition-all duration-200"
          >
            <div 
              className={cn(
                "p-1.5 rounded-full transition-all duration-300 flex items-center justify-center relative mb-0.5",
                isActive 
                  ? "bg-primary/10 text-primary scale-110" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {isActive && (
                <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />
              )}
              <Icon className="h-5 w-5" />
            </div>
            <span 
              className={cn(
                "text-[10px] font-medium tracking-wide transition-colors duration-200",
                isActive ? "text-primary font-semibold" : "text-muted-foreground"
              )}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
