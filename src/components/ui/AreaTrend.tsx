"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "./chart";

export interface AreaSeries {
  key: string;
  label: string;
  /** CSS color (defaults to a chart token). */
  color?: string;
}

/**
 * Brand-themed area chart built on the shadcn/ui chart primitives (Recharts).
 * Renders one or more stacked area series over a categorical x-axis.
 */
export function AreaTrend({
  data,
  xKey,
  series,
  height = 240,
  yFormatter,
  xFormatter,
  stacked = true,
}: {
  data: Record<string, unknown>[];
  xKey: string;
  series: AreaSeries[];
  height?: number;
  yFormatter?: (v: number) => string;
  xFormatter?: (v: string) => string;
  /** Stack series (true) or overlay them for comparison (false). */
  stacked?: boolean;
}) {
  const config: ChartConfig = Object.fromEntries(
    series.map((s, i) => [s.key, { label: s.label, color: s.color ?? `var(--chart-${(i % 5) + 1})` }])
  );

  return (
    <ChartContainer config={config} className="aspect-auto w-full" style={{ height }}>
      <AreaChart data={data} margin={{ left: 4, right: 12, top: 8, bottom: 0 }}>
        <defs>
          {series.map((s) => (
            <linearGradient key={s.key} id={`fill-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={`var(--color-${s.key})`} stopOpacity={0.35} />
              <stop offset="95%" stopColor={`var(--color-${s.key})`} stopOpacity={0.04} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey={xKey} tickLine={false} axisLine={false} tickMargin={8} minTickGap={16} tickFormatter={xFormatter} />
        <YAxis tickLine={false} axisLine={false} width={44} tickFormatter={yFormatter} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
        {series.map((s) => (
          <Area
            key={s.key}
            dataKey={s.key}
            type="natural"
            fill={`url(#fill-${s.key})`}
            stroke={`var(--color-${s.key})`}
            strokeWidth={2}
            stackId={stacked ? "a" : undefined}
          />
        ))}
      </AreaChart>
    </ChartContainer>
  );
}
