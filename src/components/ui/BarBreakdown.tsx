"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "./chart";

export interface BarDatum {
  name: string;
  value: number;
}

/**
 * Horizontal shadcn/ui bar breakdown — one bar per category, ranked. Good for
 * "top N" lists (products, departments) where labels need room to read.
 */
export function BarBreakdown({
  data,
  height = 260,
  color = "var(--chart-1)",
  valueFormatter = (v) => v.toLocaleString(),
}: {
  data: BarDatum[];
  height?: number;
  color?: string;
  valueFormatter?: (v: number) => string;
}) {
  const config: ChartConfig = { value: { label: "Value", color } };

  return (
    <ChartContainer config={config} className="aspect-auto w-full" style={{ height }}>
      <BarChart data={data} layout="vertical" margin={{ left: 6, right: 16, top: 4, bottom: 4 }}>
        <CartesianGrid horizontal={false} strokeDasharray="3 3" />
        <XAxis type="number" dataKey="value" tickLine={false} axisLine={false} tickFormatter={valueFormatter} />
        <YAxis
          type="category"
          dataKey="name"
          tickLine={false}
          axisLine={false}
          width={128}
          tickFormatter={(v: string) => (v.length > 18 ? `${v.slice(0, 17)}…` : v)}
        />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent hideLabel formatter={(value, name, item) => (
            <span className="flex w-full items-center justify-between gap-3">
              <span className="text-muted-foreground">{String(item?.payload?.name ?? name)}</span>
              <span className="font-mono font-medium tabular-nums">{valueFormatter(Number(value))}</span>
            </span>
          )} />}
        />
        <Bar dataKey="value" fill={color} radius={[0, 6, 6, 0]} barSize={22} />
      </BarChart>
    </ChartContainer>
  );
}
