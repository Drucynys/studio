
"use client";

import { useState, useEffect } from "react";
import { Card, CardTitle } from "@/components/ui/card";
import { TrendingUp, Loader2, ServerCrash } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PriceHistoryEntry {
  date: string;
  prices: {
    tcgplayer?: {
      [key: string]: {
        market?: number | null;
      }
    }
  };
}

interface ChartDataPoint {
  date: string;
  price?: number;
}

type Range = '30d' | '90d' | '180d' | '365d';

const getPrimaryMarketPrice = (entry: PriceHistoryEntry): number | undefined => {
  const prices = entry.prices?.tcgplayer;
  if (!prices) return undefined;

  const variantPriority = ['normal', 'holofoil', 'reverseHolofoil', '1stEditionNormal', '1stEditionHolofoil', 'unlimitedHolofoil', 'unlimitedNormal'];
  for (const v of variantPriority) {
    if (prices[v]?.market) {
      return prices[v]!.market!;
    }
  }
  for (const key in prices) {
    if (Object.prototype.hasOwnProperty.call(prices, key) && prices[key]?.market) {
      return prices[key]!.market!;
    }
  }
  return undefined;
};

export function MarketPriceHistoryChart({ cardApiId }: { cardApiId: string | null }) {
  const [data, setData] = useState<ChartDataPoint[]>([]);
  const [range, setRange] = useState<Range>('30d');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!cardApiId) return;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/price-history/${cardApiId}?range=${range}`);
        if (!response.ok) {
          throw new Error("Failed to fetch price history.");
        }
        const history: PriceHistoryEntry[] = await response.json();
        
        if (history.length === 0) {
           setData([]);
           return;
        }

        const chartData = history.map(entry => ({
          date: format(new Date(entry.date), 'MMM d'),
          price: getPrimaryMarketPrice(entry),
        })).filter(point => point.price !== undefined);

        setData(chartData);

      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [cardApiId, range]);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      );
    }
    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-destructive">
          <ServerCrash className="h-6 w-6 mb-2" />
          <p className="text-xs">{error}</p>
        </div>
      );
    }
    if (data.length < 2) {
      return (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <p className="text-xs text-center">Not enough price data to display a chart for this range. Check back later.</p>
        </div>
      );
    }

    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 20, left: -15, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
          <Tooltip
            contentStyle={{
              background: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 'var(--radius)',
              fontSize: '12px',
              padding: '8px'
            }}
            labelStyle={{ color: 'hsl(var(--foreground))' }}
            formatter={(value: number) => [`$${value.toFixed(2)}`, 'Price']}
          />
          <Line type="monotone" dataKey="price" name="Market Price" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3, fill: 'hsl(var(--primary))' }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  return (
    <div>
        <div className="flex justify-between items-center mb-2">
            <CardTitle className="font-headline text-base text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Price History
            </CardTitle>
            <div className="flex items-center gap-1 rounded-md bg-muted p-0.5">
                {(['30d', '90d', '180d', '365d'] as const).map((r) => (
                    <Button
                        key={r}
                        variant="ghost"
                        size="sm"
                        className={cn(
                            "h-6 px-2 text-xs",
                            range === r && "bg-background shadow-sm"
                        )}
                        onClick={() => setRange(r)}
                    >
                        {r === '30d' ? '1M' : r === '90d' ? '3M' : r === '180d' ? '6M' : '1Y'}
                    </Button>
                ))}
            </div>
        </div>
      <div className="h-[200px]">
        {renderContent()}
      </div>
    </div>
  );
}
