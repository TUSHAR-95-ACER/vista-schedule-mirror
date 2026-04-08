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

/**
 * Groups trades into calendar-row-based weeks.
 * Week 1 = first row of the calendar grid (starts at day 1, ends at first Saturday).
 * Subsequent weeks follow row boundaries.
 */
function getCalendarRowWeeks(year: number, month: number) {
  const firstDayOffset = new Date(year, month, 1).getDay(); // 0=Sun..6=Sat
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const weeks: { name: string; days: number[] }[] = [];
  let currentDay = 1;

  // First row: day 1 to first Saturday
  const firstRowDays: number[] = [];
  const remainingInFirstRow = 7 - firstDayOffset;
  for (let i = 0; i < remainingInFirstRow && currentDay <= daysInMonth; i++) {
    firstRowDays.push(currentDay++);
  }
  weeks.push({ name: 'Week 1', days: firstRowDays });

  // Subsequent full rows (Sun-Sat)
  let weekNum = 2;
  while (currentDay <= daysInMonth) {
    const rowDays: number[] = [];
    for (let i = 0; i < 7 && currentDay <= daysInMonth; i++) {
      rowDays.push(currentDay++);
    }
    weeks.push({ name: `Week ${weekNum}`, days: rowDays });
    weekNum++;
  }

  return weeks;
}

export function WeeklyPerformanceChart({ trades, month, year }: { trades: Trade[]; month?: number; year?: number }) {
  const data = useMemo(() => {
    // Determine the month to analyze
    let targetYear: number;
    let targetMonth: number;

    if (year !== undefined && month !== undefined) {
      targetYear = year;
      targetMonth = month;
    } else {
      // Infer from trades or use current date
      const now = new Date();
      targetYear = now.getFullYear();
      targetMonth = now.getMonth();
    }

    const monthPrefix = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}`;
    const monthTrades = trades.filter(t => t.date.startsWith(monthPrefix));

    const weeks = getCalendarRowWeeks(targetYear, targetMonth);

    return weeks.map(w => {
      const daySet = new Set(w.days);
      const weekTrades = monthTrades.filter(t => {
        const day = parseInt(t.date.split('-')[2], 10);
        return daySet.has(day);
      });

      return {
        name: w.name,
        pl: Math.round(weekTrades.reduce((s, t) => s + t.profitLoss, 0) * 100) / 100,
        trades: weekTrades.length,
      };
    });
  }, [trades, month, year]);

  if (data.every(d => d.trades === 0)) {
    return <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No trades logged</div>;
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
