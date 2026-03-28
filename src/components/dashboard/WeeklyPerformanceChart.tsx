import { useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';
import { Trade } from '@/types/trading';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const entry = payload[0]?.payload;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2.5 shadow-lg">
      <p className="text-xs font-semibold text-foreground mb-1">{label}</p>
      <p className={`font-mono text-sm ${entry?.pl >= 0 ? 'text-success' : 'text-destructive'}`}>
        P/L: {entry?.pl >= 0 ? '+' : ''}{entry?.pl?.toFixed(2)}
      </p>
      <p className="font-mono text-xs text-muted-foreground">
        Trades: {entry?.trades}
      </p>
    </div>
  );
};

export function WeeklyPerformanceChart({ trades }: { trades: Trade[] }) {
  const data = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const valid = trades.filter(t => {
      if (t.result === 'Untriggered Setup' || t.result === 'Cancelled') return false;
      const d = new Date(t.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const weeks = [
      { name: 'Week 1', range: [1, 7], pl: 0, trades: 0 },
      { name: 'Week 2', range: [8, 14], pl: 0, trades: 0 },
      { name: 'Week 3', range: [15, 21], pl: 0, trades: 0 },
      { name: 'Week 4', range: [22, 28], pl: 0, trades: 0 },
      { name: 'Week 5', range: [29, 31], pl: 0, trades: 0 },
    ];

    valid.forEach(t => {
      const day = new Date(t.date).getDate();
      for (const week of weeks) {
        if (day >= week.range[0] && day <= week.range[1]) {
          week.pl += t.profitLoss;
          week.trades++;
          break;
        }
      }
    });

    return weeks.map(w => ({
      name: w.name,
      pl: Math.round(w.pl * 100) / 100,
      trades: w.trades,
    }));
  }, [trades]);

  if (data.every(d => d.trades === 0)) {
    return <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No trades this month</div>;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
          interval={0}
        />
        <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="pl" name="P/L" radius={[4, 4, 0, 0]} opacity={0.8}>
          {data.map((entry, i) => (
            <Cell
              key={i}
              fill={entry.pl > 0 ? 'hsl(var(--success))' : entry.pl < 0 ? 'hsl(var(--destructive))' : 'hsl(var(--muted-foreground))'}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
