"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatShortDate } from "@/lib/format";

export type ActivityPoint = {
  day: string;
  checks: number;
  changes: number;
};

export function ActivityChart({ data }: { data: ActivityPoint[] }) {
  const hasActivity = data.some((point) => point.checks > 0 || point.changes > 0);

  if (!hasActivity) {
    return (
      <div className="flex h-[220px] flex-col items-center justify-center px-6 text-center">
        <div className="flex items-end gap-1.5 opacity-30" aria-hidden="true">
          {[16, 28, 20, 36, 26, 44, 32, 50, 38, 56].map((height, index) => (
            <span
              key={index}
              className="w-2 rounded-t bg-gradient-to-t from-violet-500/20 to-violet-400"
              style={{ height }}
            />
          ))}
        </div>
        <p className="mt-4 text-[12.5px] font-medium text-white/50">
          No monitoring activity yet
        </p>
        <p className="mt-1 max-w-[36ch] text-[11.5px] leading-relaxed text-white/30">
          Checks and detected changes will appear here once your first monitor
          runs.
        </p>
      </div>
    );
  }

  return (
    <div className="h-[220px] w-full px-2 pt-2">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="checksFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.32} />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="changesFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.24} />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.055)" vertical={false} />
          <XAxis
            dataKey="day"
            tickFormatter={(value: string) => {
              const date = new Date(`${value}T00:00:00`);
              return formatShortDate(date);
            }}
            tick={{ fill: "rgba(255,255,255,0.32)", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            minTickGap={20}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: "rgba(255,255,255,0.32)", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={38}
          />
          <Tooltip
            contentStyle={{
              background: "#12141f",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8,
              fontSize: 11,
              color: "rgba(255,255,255,0.8)",
              boxShadow: "0 12px 40px -12px rgba(0,0,0,0.8)",
            }}
            labelFormatter={(value) => {
              const date = new Date(`${value}T00:00:00`);
              return date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              });
            }}
            itemStyle={{ color: "rgba(255,255,255,0.6)" }}
          />
          <Area
            type="monotone"
            dataKey="checks"
            name="Checks"
            stroke="#a78bfa"
            strokeWidth={1.8}
            fill="url(#checksFill)"
          />
          <Area
            type="monotone"
            dataKey="changes"
            name="Changes"
            stroke="#22d3ee"
            strokeWidth={1.6}
            fill="url(#changesFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
