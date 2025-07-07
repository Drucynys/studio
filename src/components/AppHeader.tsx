// src/components/AppHeader.tsx
import Link from "next/link";
import { PokeballIcon } from '@/components/icons/PokeballIcon';
import { Button } from "@/components/ui/button";
import { PackageSearch, LayoutList, Search, Bell, Users, UserPlus } from "lucide-react";
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
import { formatDistanceToNow } from 'date-fns';


export function AppHeader() {
  const { notifications, markNotificationsAsRead } = useAuth();
  const hasNotifications = notifications.length > 0;

  const handleMarkAllRead = () => {
    if (hasNotifications) {
      markNotificationsAsRead(notifications);
    }
  };

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
          <Link href="/friends">
            <Button variant="ghost" className="hover:bg-primary-foreground/10 text-primary-foreground px-2 md:px-3">
              <Users className="mr-0 md:mr-2 h-5 w-5" />
              <span className="hidden md:inline">Friends</span>
            </Button>
          </Link>
          <div className="ml-2 md:ml-4 flex items-center gap-1">
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
          </div>
        </nav>
      </div>
    </header>
  );
}
