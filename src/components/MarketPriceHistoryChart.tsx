
"use client";

import { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
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
import { format, subMonths, subYears, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval } from "date-fns";

type TimeRange = "1M" | "3M" | "6M" | "1Y";

interface PriceDataPoint {
  date: string; // YYYY-MM-DD
  price: number;
  volume?: number; // Optional volume data
}

// Mock data generation
const generateMockData = (months: number): PriceDataPoint[] => {
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

  let lastPrice = Math.random() * 10 + 5; // Start price between $5 and $15

  return dates.map((date) => {
    // Simulate price fluctuation
    const change = (Math.random() - 0.45) * 1; // Small daily/weekly/monthly change
    lastPrice = Math.max(2, lastPrice + change); // Ensure price doesn't go below $2
    return {
      date: format(date, dateFormat),
      price: parseFloat(lastPrice.toFixed(2)),
      volume: Math.floor(Math.random() * 200) + 50, // Random volume
    };
  });
};

const mockDataSets: Record<TimeRange, PriceDataPoint[]> = {
  "1M": generateMockData(1),
  "3M": generateMockData(3),
  "6M": generateMockData(6),
  "1Y": generateMockData(12),
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background/80 backdrop-blur-sm p-2 border border-border rounded-md shadow-lg">
        <p className="label text-sm text-muted-foreground">{`Date: ${label}`}</p>
        <p className="intro text-sm text-foreground">{`Price: $${payload[0].value.toFixed(2)}`}</p>
        {payload[1] && <p className="text-sm text-foreground">{`Volume: ${payload[1].value}`}</p>}
      </div>
    );
  }
  return null;
};

const CustomLegend = (props: any) => {
  const { payload } = props;
  const priceEntry = payload.find((entry: any) => entry.value === 'Price');
  const currentData = mockDataSets["3M"]; // Use 3M for legend example, or pass current data
  const lastPricePoint = currentData[currentData.length -1];
  const firstPricePoint = currentData[0];
  const percentageChange = lastPricePoint && firstPricePoint ? ((lastPricePoint.price - firstPricePoint.price) / firstPricePoint.price) * 100 : 0;
  
  return (
    <div className="flex items-center justify-start mb-2 ml-12">
      {priceEntry && lastPricePoint && (
        <div className="flex items-center bg-secondary text-secondary-foreground px-3 py-1 rounded-full text-sm">
          <TrendingUp className="h-4 w-4 mr-2" style={{ color: priceEntry.color }} />
          <span>Near Mint Holofoil {/* Placeholder variant */}</span>
          <span className="font-semibold mx-1.5">${lastPricePoint.price.toFixed(2)}</span>
          <span className={percentageChange >= 0 ? "text-green-600" : "text-red-600"}>
            ({percentageChange >= 0 ? "+" : ""}{percentageChange.toFixed(2)}%)
          </span>
        </div>
      )}
    </div>
  );
};


export function MarketPriceHistoryChart() {
  const [timeRange, setTimeRange] = useState<TimeRange>("3M");

  const chartData = useMemo(() => mockDataSets[timeRange], [timeRange]);

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-xl">Market Price History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 0, left: -25, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.5)" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis 
                yAxisId="left" 
                tickFormatter={(value) => `$${value.toFixed(2)}`} 
                tick={{ fontSize: 12 }} 
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis 
                yAxisId="right" 
                orientation="right" 
                tick={{ fontSize: 12 }} 
                stroke="hsl(var(--muted-foreground))"
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend content={<CustomLegend />} verticalAlign="top" wrapperStyle={{paddingBottom: '10px'}}/>
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="price"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
                name="Price"
              />
              {/* The Bar for volume is removed to match the image which only shows line, legend and X/Y axis for price */}
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
