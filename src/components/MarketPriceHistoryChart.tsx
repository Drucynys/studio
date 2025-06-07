
"use client";

import { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { format, subMonths, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval } from "date-fns";

type TimeRange = "1M" | "3M" | "6M" | "1Y";

interface PriceDataPoint {
  date: string; // YYYY-MM-DD
  price: number;
}

// Mock data generation
const generateMockData = (months: number, basePrice: number = 10): PriceDataPoint[] => {
  const endDate = new Date();
  const startDate = subMonths(endDate, months);
  let intervalFunc: (interval: Interval) => Date[];
  let dateFormat: string;

  if (months <= 3) {
    intervalFunc = eachDayOfInterval;
    dateFormat = "dd/MM";
  } else if (months <= 6) {
    intervalFunc = eachWeekOfInterval;
    dateFormat = "dd/MM";
  } else {
    intervalFunc = eachMonthOfInterval;
    dateFormat = "MM/yy";
  }
  
  const dates = intervalFunc({ start: startDate, end: endDate });

  let lastPrice = basePrice * (Math.random() * 0.4 + 0.8); // Fluctuate around basePrice

  return dates.map((date, index) => {
    if (index === dates.length -1 && basePrice > 0) { // Make last point match current market price
        lastPrice = basePrice;
    } else {
        const change = (Math.random() - 0.45) * (basePrice * 0.1); 
        lastPrice = Math.max(basePrice * 0.2, lastPrice + change); 
    }
    return {
      date: format(date, dateFormat),
      price: parseFloat(lastPrice.toFixed(2)),
    };
  });
};


const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background/80 backdrop-blur-sm p-2 border border-border rounded-md shadow-lg">
        <p className="label text-sm text-muted-foreground">{`Date: ${label}`}</p>
        <p className="intro text-sm text-foreground">{`Price: $${payload[0].value.toFixed(2)}`}</p>
      </div>
    );
  }
  return null;
};

interface CustomLegendProps {
  payload?: Array<{ color: string; value: string }>;
  variantName?: string;
  variantMarketPrice?: number;
}

const CustomLegend = (props: CustomLegendProps) => {
  const { payload, variantName, variantMarketPrice } = props;
  const priceEntry = payload?.find((entry: any) => entry.value === 'Price');
  
  // Illustrative percentage change (mock)
  const illustrativePercentageChange = (Math.random() * 10 - 5); // Random change between -5% and +5%

  return (
    <div className="flex items-center justify-start mb-2 ml-12">
      {priceEntry && variantName && typeof variantMarketPrice === 'number' && (
        <div className="flex items-center bg-secondary text-secondary-foreground px-3 py-1 rounded-full text-sm">
          <TrendingUp className="h-4 w-4 mr-2" style={{ color: priceEntry.color }} />
          <span>{variantName}</span>
          <span className="font-semibold mx-1.5">${variantMarketPrice.toFixed(2)}</span>
          <span className={illustrativePercentageChange >= 0 ? "text-green-600" : "text-red-600"}>
            ({illustrativePercentageChange >= 0 ? "+" : ""}{illustrativePercentageChange.toFixed(2)}%
            <span className="text-xs italic ml-1"> mock trend</span>)
          </span>
        </div>
      )}
       {(!variantName || typeof variantMarketPrice !== 'number') && priceEntry && (
         <div className="flex items-center bg-secondary text-secondary-foreground px-3 py-1 rounded-full text-sm">
            <TrendingUp className="h-4 w-4 mr-2" style={{ color: priceEntry.color }} />
            <span>Market Price Trend</span>
            <span className="text-xs italic ml-1">(illustrative)</span>
         </div>
       )}
    </div>
  );
};

interface MarketPriceHistoryChartProps {
    variantName?: string;
    variantMarketPrice?: number;
}

export function MarketPriceHistoryChart({ variantName, variantMarketPrice }: MarketPriceHistoryChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("3M");

  const chartData = useMemo(() => {
    const basePriceForMock = variantMarketPrice !== undefined && variantMarketPrice > 0 ? variantMarketPrice : 10;
    switch(timeRange) {
        case "1M": return generateMockData(1, basePriceForMock);
        case "3M": return generateMockData(3, basePriceForMock);
        case "6M": return generateMockData(6, basePriceForMock);
        case "1Y": return generateMockData(12, basePriceForMock);
        default: return generateMockData(3, basePriceForMock);
    }
  }, [timeRange, variantMarketPrice]);

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-xl">Market Price History (Illustrative)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.5)" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis 
                yAxisId="left" 
                tickFormatter={(value) => `$${value.toFixed(2)}`} 
                tick={{ fontSize: 12 }} 
                stroke="hsl(var(--muted-foreground))"
                domain={['dataMin - 1', 'dataMax + 1']}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                content={<CustomLegend variantName={variantName} variantMarketPrice={variantMarketPrice} />} 
                verticalAlign="top" 
                wrapperStyle={{paddingBottom: '10px'}}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="price"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
                name="Price"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center space-x-2">
          {(["1M", "3M", "6M", "1Y"] as TimeRange[]).map((range) => (
            <Button
              key={range}
              variant={timeRange === range ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeRange(range)}
              className={timeRange === range ? "bg-primary text-primary-foreground" : ""}
            >
              {range}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

