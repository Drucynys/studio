// src/components/AppHeader.tsx
'use client';

import Link from 'next/link';
import { PokeballIcon } from '@/components/icons/PokeballIcon';
import { Button } from '@/components/ui/button';
import {
  PackageSearch,
  LayoutList,
  Search,
  Bell,
  Users,
  UserPlus,
  Replace,
  Menu,
  PlusCircle,
} from 'lucide-react';
import { AuthButton } from './AuthButton';
import { PokedexIcon } from './icons/PokedexIcon';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { notificationService } from '@/services/notificationService';
import { useUIStore } from '@/store/useUIStore';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { SwipeBackIndicator } from '@/components/SwipeBackIndicator';

export function AppHeader() {
  const { user } = useAuth();
  const { notifications } = useNotifications(user?.uid);
  const hasNotifications = notifications.length > 0;
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const handleMarkAllRead = () => {
    if (hasNotifications && user) {
      notificationService.markAsRead(user.uid, notifications);
    }
  };

  const closeSheet = () => setIsSheetOpen(false);

  return (
    <>
      <header className="bg-background/65 dark:bg-card/65 backdrop-blur-xl backdrop-saturate-150 text-foreground border-b border-border/40 shadow-sm fixed lg:sticky top-0 left-0 right-0 z-50">
        <div className="container mx-auto px-4 md:px-8 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <PokeballIcon className="h-8 w-8 md:h-10 md:w-10" />
            <h1 className="text-2xl md:text-3xl font-headline font-bold text-primary">PokéTRKR</h1>
          </Link>

          {/* Navigation - Desktop */}
          <nav className="hidden lg:flex items-center gap-1 mx-4">
            <Link href="/search">
              <Button variant="ghost" className="gap-2">
                <Search className="h-4 w-4" /> Search
              </Button>
            </Link>
            <Link href="/my-collection">
              <Button variant="ghost" className="gap-2">
                <LayoutList className="h-4 w-4" /> Collection
              </Button>
            </Link>
            <Link href="/add-card">
              <Button variant="ghost" className="gap-2 text-primary font-semibold">
                <PlusCircle className="h-4 w-4" /> Add Card
              </Button>
            </Link>
            <Link href="/browse-sets">
              <Button variant="ghost" className="gap-2">
                <PackageSearch className="h-4 w-4" /> Browse Sets
              </Button>
            </Link>
            <Link href="/pokedex">
              <Button variant="ghost" className="gap-2">
                <PokedexIcon className="h-4 w-4 text-primary" /> Pokédex
              </Button>
            </Link>
          </nav>

          {/* Right side icons */}
          <div className="flex items-center gap-1">
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
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
                      <Button
                        variant="link"
                        size="sm"
                        className="text-xs h-auto p-0"
                        onClick={handleMarkAllRead}
                      >
                        Mark all as read
                      </Button>
                    )}
                  </div>
                  <DropdownMenuSeparator />
                  {hasNotifications ? (
                    notifications.map((notif) => (
                      <DropdownMenuItem
                        key={notif.id}
                        className="flex gap-3 p-3 cursor-pointer"
                        asChild
                      >
                        <Link href="/friends">
                          <UserPlus className="h-4 w-4 text-primary mt-1" />
                          <div className="flex-1">
                            <p>
                              <span className="font-semibold">{notif.followerDisplayName}</span>{' '}
                              started following you.
                            </p>
                            <p className="text-xs text-muted-foreground pt-1">
                              {notif.timestamp?.toDate
                                ? formatDistanceToNow(notif.timestamp.toDate(), { addSuffix: true })
                                : ''}
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
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const { language, setLanguage } = useUIStore.getState();
                setLanguage(language === 'en' ? 'ja' : 'en');
              }}
              className="mr-2 font-bold px-3 transition-colors bg-card/45 hover:bg-primary/20 hover:text-primary"
            >
              {useUIStore((state) => state.language).toUpperCase()}
            </Button>
            
            <AuthButton />
          </div>
        </div>
      </header>
      <div className="h-[56px] lg:hidden" />
      <MobileBottomNav />
      <SwipeBackIndicator />
    </>
  );
}
