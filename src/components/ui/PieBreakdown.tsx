"use client";

import { Pie, PieChart, Cell, Label } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from "./chart";

export interface PieDatum {
  name: string;
  value: number;
}

/**
 * Interactive shadcn/ui pie (or donut) breakdown. Hovering a slice enlarges it
 * and shows a tooltip; an optional centre total is shown in donut mode.
 */
export function PieBreakdown({
  data,
  height = 260,
  donut = false,
  centerLabel,
  valueFormatter = (v) => v.toLocaleString(),
}: {
  data: PieDatum[];
  height?: number;
  donut?: boolean;
  centerLabel?: string;
  valueFormatter?: (v: number) => string;
}) {
  const config: ChartConfig = Object.fromEntries(
    data.map((d, i) => [d.name, { label: d.name, color: `var(--chart-${(i % 5) + 1})` }])
  );
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <ChartContainer config={config} className="aspect-auto w-full" style={{ height }}>
      <PieChart>
        <ChartTooltip
          content={
            <ChartTooltipContent
              nameKey="name"
              hideLabel
              formatter={(value, name) => (
                <span className="flex w-full items-center justify-between gap-3">
                  <span className="text-muted-foreground">{String(name)}</span>
                  <span className="font-mono font-medium tabular-nums">{valueFormatter(Number(value))}</span>
                </span>
              )}
            />
          }
        />
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={donut ? 62 : 0}
          outerRadius={104}
          strokeWidth={2}
          paddingAngle={donut ? 2 : 0}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={`var(--chart-${(i % 5) + 1})`} />
          ))}
          {donut && (
            <Label
              content={({ viewBox }) => {
                if (!viewBox || !("cx" in viewBox)) return null;
                const { cx, cy } = viewBox as { cx: number; cy: number };
                return (
                  <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
                    <tspan x={cx} y={cy - 6} className="fill-foreground" style={{ fontSize: 26, fontWeight: 700 }}>
                      {valueFormatter(total)}
                    </tspan>
                    <tspan x={cx} y={cy + 16} className="fill-muted-foreground" style={{ fontSize: 12 }}>
                      {centerLabel ?? "total"}
                    </tspan>
                  </text>
                );
              }}
            />
          )}
        </Pie>
        <ChartLegend content={<ChartLegendContent nameKey="name" />} className="-mt-1 flex-wrap gap-x-4" />
      </PieChart>
    </ChartContainer>
  );
}
