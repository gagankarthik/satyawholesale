"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "./chart";

export interface BarDatum {
  name: string;
  value: number;
}

/* one distinct hue per bar so a "top N" list reads as a palette, not a
   wall of the same colour */
const BAR_PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

/**
 * Horizontal shadcn/ui bar breakdown — one bar per category, ranked. Good for
 * "top N" lists (products, departments) where labels need room to read.
 * Each bar takes its own colour from the chart palette. Pass `color` to force
 * a single colour instead.
 */
export function BarBreakdown({
  data,
  height = 260,
  color,
  valueFormatter = (v) => v.toLocaleString(),
}: {
  data: BarDatum[];
  height?: number;
  color?: string;
  valueFormatter?: (v: number) => string;
}) {
  const barColor = (i: number) => color ?? BAR_PALETTE[i % BAR_PALETTE.length];
  const config: ChartConfig = { value: { label: "Value", color: color ?? "var(--chart-1)" } };

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
        <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={22}>
          {data.map((_, i) => (
            <Cell key={i} fill={barColor(i)} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
