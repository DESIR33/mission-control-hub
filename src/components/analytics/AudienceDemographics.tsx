import { useMemo } from "react";
import { Users } from "lucide-react";
import {
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from "recharts";
import type { Demographics } from "@/hooks/use-youtube-analytics-api";
import { chartTooltipStyle, xAxisDefaults, yAxisDefaults, cartesianGridDefaults, barDefaults } from "@/lib/chart-theme";

const GENDER_COLORS: Record<string, string> = {
  male: "#3b82f6",
  female: "#ec4899",
  user_specified: "#8b5cf6",
};

const GENDER_LABELS: Record<string, string> = {
  male: "Male",
  female: "Female",
  user_specified: "Other",
};

const AGE_ORDER = [
  "age13-17",
  "age18-24",
  "age25-34",
  "age35-44",
  "age45-54",
  "age55-64",
  "age65-",
];

const AGE_LABELS: Record<string, string> = {
  "age13-17": "13-17",
  "age18-24": "18-24",
  "age25-34": "25-34",
  "age35-44": "35-44",
  "age45-54": "45-54",
  "age55-64": "55-64",
  "age65-": "65+",
};


interface Props {
  data: Demographics[];
}

export function AudienceDemographics({ data }: Props) {
  // Gender breakdown pie chart
  const genderData = useMemo(() => {
    const grouped: Record<string, number> = {};
    for (const d of data) {
      const key = d.gender.toLowerCase();
      grouped[key] = (grouped[key] ?? 0) + d.viewer_percentage;
    }
    return Object.entries(grouped).map(([gender, pct]) => ({
      name: GENDER_LABELS[gender] ?? gender,
      value: +pct.toFixed(1),
      color: GENDER_COLORS[gender] ?? "#9ca3af",
    }));
  }, [data]);

  // Age group breakdown (stacked by gender)
  const ageData = useMemo(() => {
    const grouped: Record<string, Record<string, number>> = {};
    for (const d of data) {
      if (!grouped[d.age_group]) grouped[d.age_group] = {};
      grouped[d.age_group][d.gender.toLowerCase()] = d.viewer_percentage;
    }

    return AGE_ORDER.filter((ag) => grouped[ag]).map((ag) => ({
      ageGroup: AGE_LABELS[ag] ?? ag,
      male: grouped[ag].male ?? 0,
      female: grouped[ag].female ?? 0,
      other: grouped[ag].user_specified ?? 0,
    }));
  }, [data]);

  // Find dominant demographic
  const dominantDemo = useMemo(() => {
    if (data.length === 0) return null;
    const sorted = [...data].sort((a, b) => b.viewer_percentage - a.viewer_percentage);
    const top = sorted[0];
    return {
      ageGroup: AGE_LABELS[top.age_group] ?? top.age_group,
      gender: GENDER_LABELS[top.gender.toLowerCase()] ?? top.gender,
      pct: top.viewer_percentage,
    };
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
        <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">
          No demographics data available. Sync YouTube Analytics to see your audience breakdown.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Summary */}
      {dominantDemo && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Audience Profile</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Your largest audience segment is{" "}
            <span className="font-semibold text-foreground">{dominantDemo.gender}, {dominantDemo.ageGroup}</span>{" "}
            making up <span className="font-mono font-semibold text-foreground">{dominantDemo.pct.toFixed(1)}%</span> of viewers.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Gender Pie Chart */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Gender Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={genderData}
                cx="50%"
                cy="50%"
                innerRadius="55%"
                outerRadius="85%"
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
                animationDuration={800}
                label={({ name, value }) => `${name}: ${value}%`}
              >
                {genderData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={chartTooltipStyle}
                formatter={(v: number) => [`${v}%`, "Viewers"]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Age Group Stacked Bar Chart */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Age Group Breakdown</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={ageData} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
              <CartesianGrid {...cartesianGridDefaults} />
              <XAxis dataKey="ageGroup" {...xAxisDefaults} />
              <YAxis {...yAxisDefaults} tickFormatter={(v) => `${v}%`} />
              <Tooltip
                contentStyle={chartTooltipStyle}
                formatter={(v: number, name: string) => [`${v.toFixed(1)}%`, GENDER_LABELS[name] ?? name]}
              />
              <Legend formatter={(value) => GENDER_LABELS[value] ?? value} />
              <Bar dataKey="male" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} maxBarSize={48} animationDuration={800} />
              <Bar dataKey="female" stackId="a" fill="#ec4899" radius={[0, 0, 0, 0]} maxBarSize={48} animationDuration={800} />
              <Bar dataKey="other" stackId="a" fill="#8b5cf6" radius={[6, 6, 0, 0]} maxBarSize={48} animationDuration={800} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Data table */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Detailed Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-2 text-xs text-muted-foreground font-medium">Age Group</th>
                <th className="text-right py-2 px-2 text-xs text-muted-foreground font-medium">Male %</th>
                <th className="text-right py-2 px-2 text-xs text-muted-foreground font-medium">Female %</th>
                <th className="text-right py-2 px-2 text-xs text-muted-foreground font-medium">Other %</th>
                <th className="text-right py-2 px-2 text-xs text-muted-foreground font-medium">Total %</th>
              </tr>
            </thead>
            <tbody>
              {ageData.map((row) => {
                const total = row.male + row.female + row.other;
                return (
                  <tr key={row.ageGroup} className="border-b border-border/50">
                    <td className="py-2 px-2 font-medium text-foreground">{row.ageGroup}</td>
                    <td className="py-2 px-2 text-right font-mono text-foreground">{row.male.toFixed(1)}%</td>
                    <td className="py-2 px-2 text-right font-mono text-foreground">{row.female.toFixed(1)}%</td>
                    <td className="py-2 px-2 text-right font-mono text-foreground">{row.other.toFixed(1)}%</td>
                    <td className="py-2 px-2 text-right font-mono font-semibold text-foreground">{total.toFixed(1)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
