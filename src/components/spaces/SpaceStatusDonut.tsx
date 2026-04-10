import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface DonutData {
  name: string;
  value: number;
  color: string;
}

interface Props {
  data: DonutData[];
  centerLabel: string;
  centerSub: string;
}

export function SpaceStatusDonut({ data, centerLabel, centerSub }: Props) {
  return (
    <div className="flex items-center gap-6">
      <div className="relative w-[140px] h-[140px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={42}
              outerRadius={62}
              paddingAngle={3}
              dataKey="value"
              strokeWidth={0}
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-foreground">{centerLabel}</span>
          <span className="text-[10px] text-muted-foreground">{centerSub}</span>
        </div>
      </div>
      <div className="space-y-2">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: d.color }} />
            <span className="text-xs text-muted-foreground">
              {d.name}: {d.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
