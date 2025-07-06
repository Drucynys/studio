// This component has been removed because it was using illustrative mock data
// which could be misleading. Real-time, historical price data is not available
// through the current `pokemontcg.io` API.

"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

export function MarketPriceHistoryChart() {
  return (
    <Card className="shadow-lg bg-muted/30 border-dashed">
      <CardHeader>
        <CardTitle className="font-headline text-xl text-muted-foreground flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Market Price History
        </CardTitle>
        <CardDescription>
          Historical pricing data is currently unavailable.
        </CardDescription>
      </CardHeader>
      <CardContent className="h-[300px] flex items-center justify-center">
        <p className="text-muted-foreground">No data to display.</p>
      </CardContent>
    </Card>
  );
}
