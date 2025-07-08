
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TrendingUp, Loader2, ServerCrash } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format } from 'date-fns';

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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!cardApiId) return;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/price-history/${cardApiId}`);
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
  }, [cardApiId]);

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
          <p className="text-xs text-center">Not enough price data to display a chart. Check back after the next daily sync.</p>
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
        <CardTitle className="font-headline text-base text-muted-foreground flex items-center gap-2 mb-2">
          <TrendingUp className="h-4 w-4" />
          30-Day Price History
        </CardTitle>
      <div className="h-[200px]">
        {renderContent()}
      </div>
    </div>
  );
}
