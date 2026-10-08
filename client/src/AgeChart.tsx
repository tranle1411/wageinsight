import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Prediction } from "./types";
const dollars = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
export default function AgeChart({ curve }: { curve: Prediction["curve"] }) {
  const chart = curve.map((p) => ({ ...p, band: [p.lower, p.upper] }));
  return (
    <ResponsiveContainer width="100%" height={235}>
      <AreaChart
        data={chart}
        margin={{ left: 0, right: 15, top: 10, bottom: 0 }}
      >
        <CartesianGrid vertical={false} stroke="#e9ece7" />
        <XAxis
          dataKey="age"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11 }}
        />
        <YAxis
          tickFormatter={(n) => "$" + Math.round(n / 1000) + "k"}
          width={55}
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11 }}
        />
        <Tooltip
          formatter={(value) =>
            Array.isArray(value)
              ? value.map(Number).map(dollars).join(" – ")
              : dollars(Number(value))
          }
          labelFormatter={(l) => "Age " + l}
        />
        <Area
          dataKey="band"
          name="Range"
          fill="#e2ece6"
          stroke="none"
          type="monotone"
        />
        <Area
          dataKey="estimate"
          name="Estimate"
          stroke="#216650"
          fill="transparent"
          strokeWidth={2.5}
          type="monotone"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
