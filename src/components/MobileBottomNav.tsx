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
    <div className="lg:hidden fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-4 right-4 z-40 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-2xl backdrop-saturate-150 border border-white/20 dark:border-white/10 shadow-xl px-2 py-1.5 rounded-full flex justify-around items-center h-16">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
        
        return (
          <Link 
            key={item.href} 
            href={item.href}
            className="flex flex-col items-center justify-center flex-1 py-1 text-center transition-all duration-200 h-full"
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
