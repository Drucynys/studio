'use client';

import { useState, useMemo } from 'react';
import { Card, CardTitle } from '@/components/ui/card';
import { TrendingUp, Loader2, ServerCrash } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { format, subDays, isAfter } from 'date-fns';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { usePriceHistory } from '@/hooks/usePriceHistory';

interface ChartDataPoint {
  date: string;
  price?: number;
}

type Range = '30d' | '90d' | '180d' | '365d';

export function MarketPriceHistoryChart({ cardApiId }: { cardApiId: string | null }) {
  const { data: priceHistory, loading, error } = usePriceHistory(cardApiId);
  const [range, setRange] = useState<Range>('30d');

  const chartData = useMemo(() => {
    if (!priceHistory?.data) return [];

    // Find the best variant to display
    const keys = Object.keys(priceHistory.data);
    if (keys.length === 0) return [];

    // Priority: 'normal-nearmint', 'holo-nearmint', 'reverse holo-nearmint', etc.
    let selectedKey = keys.find(k => k.includes('nearmint')) || keys[0];

    const historyData = priceHistory.data[selectedKey]?.history;
    if (!historyData) return [];

    const daysToSubtract = range === '30d' ? 30 : range === '90d' ? 90 : range === '180d' ? 180 : 365;
    
    // Find the latest date in the history data to use as our reference point instead of new Date()
    // This ensures we always show data even if the repository hasn't been updated recently.
    const allDates = Object.keys(historyData).sort();
    const latestDateStr = allDates[allDates.length - 1];
    const latestDate = latestDateStr ? new Date(latestDateStr) : new Date();
    
    const cutoffDate = subDays(latestDate, daysToSubtract);

    // Convert to array and sort by date
    const sortedEntries = Object.entries(historyData)
      .map(([dateStr, entry]) => ({
        rawDate: new Date(dateStr),
        date: format(new Date(dateStr), 'MMM d, yyyy'),
        price: entry.avg ? entry.avg / 100 : undefined,
      }))
      .filter(entry => isAfter(entry.rawDate, cutoffDate) && entry.price !== undefined)
      .sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime());

    return sortedEntries;
  }, [priceHistory, range]);

  const renderContent = () => {
    if (loading) {
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
    if (chartData.length < 2) {
      return (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <p className="text-xs text-center">
            Not enough price data to display a chart for this range. Check back later.
          </p>
        </div>
      );
    }

    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 20, left: -15, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="date"
            stroke="hsl(var(--muted-foreground))"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            minTickGap={20}
          />
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `$${value}`}
          />
          <Tooltip
            contentStyle={{
              background: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 'var(--radius)',
              fontSize: '12px',
              padding: '8px',
            }}
            labelStyle={{ color: 'hsl(var(--foreground))' }}
            formatter={(value: any) => [`$${Number(value).toFixed(2)}`, 'Avg Price']}
          />
          <Line
            type="monotone"
            dataKey="price"
            name="Avg Price"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  };

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
              className={cn('h-6 px-2 text-xs', range === r && 'bg-background shadow-sm')}
              onClick={() => setRange(r)}
            >
              {r === '30d' ? '1M' : r === '90d' ? '3M' : r === '180d' ? '6M' : '1Y'}
            </Button>
          ))}
        </div>
      </div>
      <div className="h-[200px]">{renderContent()}</div>
    </div>
  );
}
