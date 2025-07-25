// src/components/AppHeader.tsx
import Link from "next/link";
import { PokeballIcon } from '@/components/icons/PokeballIcon';
import { Button } from "@/components/ui/button";
import { PackageSearch, LayoutList, Search, Bell, Users, UserPlus, Replace, Menu } from "lucide-react";
import { AuthButton } from "./AuthButton";
import { PokedexIcon } from "./icons/PokedexIcon";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { formatDistanceToNow } from 'date-fns';
import { useState } from "react";


export function AppHeader() {
  const { notifications, markNotificationsAsRead } = useAuth();
  const hasNotifications = notifications.length > 0;
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const handleMarkAllRead = () => {
    if (hasNotifications) {
      markNotificationsAsRead(notifications);
    }
  };

  const closeSheet = () => setIsSheetOpen(false);

  return (
    <header className="bg-primary text-primary-foreground shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 md:px-8 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <PokeballIcon className="h-8 w-8 md:h-10 md:w-10" />
          <h1 className="text-2xl md:text-3xl font-headline font-bold">
            PokéTRKR
          </h1>
        </Link>
        
        {/* Right side icons */}
        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative hover:bg-primary-foreground/10 text-primary-foreground">
                <Bell className="h-5 w-5" />
                {hasNotifications && (
                  <span className="absolute top-2 right-2 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-accent"></span>
                  </span>
                )}
                <span className="sr-only">Notifications</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 md:w-96">
              <div className="flex items-center justify-between p-2">
                  <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                  {hasNotifications && (
                      <Button variant="link" size="sm" className="text-xs h-auto p-0" onClick={handleMarkAllRead}>
                          Mark all as read
                      </Button>
                  )}
              </div>
              <DropdownMenuSeparator />
              {hasNotifications ? (
                notifications.map((notif) => (
                  <DropdownMenuItem key={notif.id} className="flex gap-3 p-3 cursor-pointer" asChild>
                    <Link href="/friends">
                      <UserPlus className="h-4 w-4 text-primary mt-1"/>
                      <div className="flex-1">
                        <p><span className="font-semibold">{notif.followerDisplayName}</span> started following you.</p>
                        <p className="text-xs text-muted-foreground pt-1">
                          {notif.timestamp?.toDate ? formatDistanceToNow(notif.timestamp.toDate(), { addSuffix: true }) : ''}
                        </p>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                ))
              ) : (
                 <div className="text-center text-sm text-muted-foreground p-4">
                  You're all caught up!
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <AuthButton />
           {/* Mobile Navigation */}
          <div>
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="hover:bg-primary-foreground/10 text-primary-foreground">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[240px]">
                <SheetHeader>
                  <SheetTitle>
                    <Link href="/" className="flex items-center gap-3" onClick={closeSheet}>
                      <PokeballIcon className="h-8 w-8" />
                      <span className="text-2xl font-headline font-bold">PokéTRKR</span>
                    </Link>
                  </SheetTitle>
                </SheetHeader>
                <nav className="mt-8 flex flex-col gap-2">
                  <Link href="/search" onClick={closeSheet}>
                    <Button variant="ghost" className="w-full justify-start gap-2 text-md">
                      <Search /> Search
                    </Button>
                  </Link>
                  <Link href="/my-collection" onClick={closeSheet}>
                    <Button variant="ghost" className="w-full justify-start gap-2 text-md">
                      <LayoutList /> My Collection
                    </Button>
                  </Link>
                  <Link href="/browse-sets" onClick={closeSheet}>
                    <Button variant="ghost" className="w-full justify-start gap-2 text-md">
                      <PackageSearch /> Browse
                    </Button>
                  </Link>
                  <Link href="/pokedex" onClick={closeSheet}>
                    <Button variant="ghost" className="w-full justify-start gap-2 text-md">
                      <PokedexIcon className="h-6 w-6"/> Pokédex
                    </Button>
                  </Link>
                  <Link href="/exchange" onClick={closeSheet}>
                    <Button variant="ghost" className="w-full justify-start gap-2 text-md">
                      <Replace /> Exchange
                    </Button>
                  </Link>
                  <Link href="/friends" onClick={closeSheet}>
                    <Button variant="ghost" className="w-full justify-start gap-2 text-md">
                      <Users /> Friends
                    </Button>
                  </Link>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
