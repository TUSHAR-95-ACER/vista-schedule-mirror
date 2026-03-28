import { useMemo } from 'react';
import { Trade, TRADE_GRADES, TradeGrade } from '@/types/trading';
import { cn } from '@/lib/utils';

export function PerformanceByGradeChart({ trades }: { trades: Trade[] }) {
  const data = useMemo(() => {
    const valid = trades.filter(t => t.result !== 'Untriggered Setup' && t.result !== 'Cancelled');

    return TRADE_GRADES.map(grade => {
      const gradeTrades = valid.filter(t => t.grade === grade);
      const wins = gradeTrades.filter(t => t.result === 'Win').length;
      const total = gradeTrades.length;
      const winRate = total > 0 ? Math.round((wins / total) * 1000) / 10 : 0;
      const avgPl = total > 0 ? Math.round((gradeTrades.reduce((s, t) => s + t.profitLoss, 0) / total) * 100) / 100 : 0;

      return { grade, trades: total, winRate, avgPl };
    });
  }, [trades]);

  const gradeColors: Record<TradeGrade, string> = {
    'A+': 'text-success',
    'A': 'text-blue-500',
    'B': 'text-foreground',
    'C': 'text-destructive',
  };

  return (
    <div className="space-y-1">
      <div className="grid grid-cols-4 gap-2 px-2 py-2 text-[10px] uppercase tracking-[0.12em] text-muted-foreground border-b border-border">
        <span>Grade</span>
        <span className="text-center">Trades</span>
        <span className="text-center">Win %</span>
        <span className="text-right">Avg P/L</span>
      </div>
      {data.map(row => (
        <div key={row.grade} className="grid grid-cols-4 gap-2 px-2 py-2.5 border-b border-border/50 text-sm">
          <span className={cn('font-bold', gradeColors[row.grade as TradeGrade])}>{row.grade}</span>
          <span className="text-center text-muted-foreground">{row.trades}</span>
          <span className="text-center text-muted-foreground">{row.winRate.toFixed(1)}%</span>
          <span className={cn('text-right font-mono text-xs', row.avgPl >= 0 ? 'text-success' : 'text-destructive')}>
            {row.avgPl.toFixed(2)}
          </span>
        </div>
      ))}
    </div>
  );
}
