'use client';

import { useMyCollectionState } from '@/hooks/useMyCollectionState';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, TrendingUp, Layers, Hash } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

export function DashboardStats() {
  const { user, collectionStats, loadingCollection } = useMyCollectionState();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !user) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mt-8">
      {/* Total Cards Stat */}
      <Card className="relative overflow-hidden group bg-white/40 dark:bg-zinc-900/40 backdrop-blur-md border-white/40 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
          <Layers className="h-16 w-16 text-blue-500" />
        </div>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Layers className="h-4 w-4 text-blue-500" />
            </div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Total Cards</h3>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-foreground">
              {loadingCollection ? '...' : collectionStats.totalCards}
            </span>
            <span className="text-sm text-muted-foreground font-medium">collected</span>
          </div>
        </CardContent>
      </Card>

      {/* Unique Species Stat */}
      <Card className="relative overflow-hidden group bg-white/40 dark:bg-zinc-900/40 backdrop-blur-md border-white/40 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
          <Hash className="h-16 w-16 text-emerald-500" />
        </div>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <Hash className="h-4 w-4 text-emerald-500" />
            </div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Unique Species</h3>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-foreground">
              {loadingCollection ? '...' : collectionStats.uniqueCards}
            </span>
            <span className="text-sm text-muted-foreground font-medium">/ 1025</span>
          </div>
          <div className="mt-3 h-1.5 w-full bg-emerald-500/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-emerald-500 transition-all duration-1000 ease-out"
              style={{ width: `${Math.min(100, (collectionStats.uniqueCards / 1025) * 100)}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Est. Value Stat */}
      <Card className="relative overflow-hidden group bg-gradient-to-br from-amber-500/10 to-transparent dark:from-amber-500/5 backdrop-blur-md border-amber-500/20 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
          <TrendingUp className="h-16 w-16 text-amber-500" />
        </div>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <TrendingUp className="h-4 w-4 text-amber-500" />
            </div>
            <h3 className="text-sm font-semibold text-amber-600 dark:text-amber-500 uppercase tracking-wider">Est. Value</h3>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-amber-600/70 dark:text-amber-500/70">$</span>
            <span className="text-3xl font-black text-amber-600 dark:text-amber-400">
              {loadingCollection ? '...' : collectionStats.totalCurrentValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
