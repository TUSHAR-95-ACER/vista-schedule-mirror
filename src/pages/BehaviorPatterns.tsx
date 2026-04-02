import { useMemo } from 'react';
import { useTrading } from '@/contexts/TradingContext';
import { PageHeader, MetricCard } from '@/components/shared/MetricCard';
import { ChartHeader } from '@/components/shared/InfoTooltip';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line, ScatterChart, Scatter, ZAxis, Cell } from 'recharts';
import { Lightbulb } from 'lucide-react';

const Tip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-md px-3 py-2 shadow-lg text-xs">
      <p className="text-muted-foreground mb-1">{label}</p>
      {payload.map((p: any, i: number) =>
        <p key={i} className="font-mono" style={{ color: p.color }}>{p.name}: {typeof p.value === 'number' ? p.value.toFixed(2) : p.value}</p>
      )}
    </div>
  );
};

export default function BehaviorPatterns() {
  const { trades } = useTrading();
  const valid = useMemo(() => trades.filter(t => t.result !== 'Untriggered Setup' && t.result !== 'Cancelled'), [trades]);

  const dailyTradeCount = useMemo(() => {
    const map = new Map<string, number>();
    valid.forEach(t => map.set(t.date, (map.get(t.date) || 0) + 1));
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([date, count]) => ({ date: date.slice(5), count }));
  }, [valid]);

  const revengePatterns = useMemo(() => {
    const byDate = new Map<string, typeof valid>();
    valid.forEach(t => { const arr = byDate.get(t.date) || []; arr.push(t); byDate.set(t.date, arr); });
    let count = 0;
    byDate.forEach(dayTrades => {
      let consec = 0;
      dayTrades.forEach(t => { if (t.result === 'Loss') { consec++; if (consec >= 2) count++; } else consec = 0; });
    });
    return count;
  }, [valid]);

  const timeOfDay = useMemo(() => {
    const buckets: Record<string, { pl: number; count: number }> = {};
    valid.forEach(t => {
      if (!t.entryTime) return;
      const h = parseInt(t.entryTime.split(':')[0]);
      const bucket = `${String(h).padStart(2, '0')}:00`;
      if (!buckets[bucket]) buckets[bucket] = { pl: 0, count: 0 };
      buckets[bucket].pl += t.profitLoss;
      buckets[bucket].count++;
    });
    return Object.entries(buckets).sort((a, b) => a[0].localeCompare(b[0])).map(([time, d]) => ({ time, pl: Math.round(d.pl * 100) / 100, count: d.count }));
  }, [valid]);

  const disciplineScore = useMemo(() => {
    const withPsych = valid.filter(t => t.psychology);
    if (withPsych.length === 0) return 0;
    let total = 0;
    withPsych.forEach(t => {
      const c = t.psychology!.checklist;
      let s = 0;
      if (c.followPlan) s += 20; if (c.noFomo) s += 20; if (c.noRevenge) s += 20;
      if (c.waitedConfirmation) s += 20; if (c.riskRespected) s += 20;
      total += s;
    });
    return Math.round(total / withPsych.length);
  }, [valid]);

  // Emotional stability: inverse of emotional trade frequency
  const emotionalStability = useMemo(() => {
    if (valid.length === 0) return 100;
    const emotional = valid.filter(t => t.mistakes.includes('Emotional') || t.mistakes.includes('FOMO') || t.psychology?.emotion === 'Fearful' || t.psychology?.emotion === 'Greedy');
    return Math.round((1 - emotional.length / valid.length) * 100);
  }, [valid]);

  const emotionalPct = useMemo(() => {
    if (valid.length === 0) return 0;
    const emotional = valid.filter(t => t.mistakes.includes('Emotional') || t.mistakes.includes('FOMO'));
    return Math.round((emotional.length / valid.length) * 100);
  }, [valid]);

  const ruleAdherence = useMemo(() => {
    const withPsych = valid.filter(t => t.psychology);
    if (withPsych.length === 0) return 100;
    const following = withPsych.filter(t => t.psychology!.checklist.followPlan && t.psychology!.checklist.riskRespected);
    return Math.round((following.length / withPsych.length) * 100);
  }, [valid]);

  const overtradingIndex = useMemo(() => {
    if (dailyTradeCount.length === 0) return 0;
    const over = dailyTradeCount.filter(d => d.count > 3).length;
    return Math.round((over / dailyTradeCount.length) * 100);
  }, [dailyTradeCount]);

  // Fear-based exits
  const fearExits = useMemo(() => {
    const withPsych = valid.filter(t => t.psychology);
    if (withPsych.length === 0) return 0;
    const fearful = withPsych.filter(t => (t.psychology!.emotion === 'Fearful' || t.psychology!.emotion === 'Anxious') && t.result === 'Loss');
    return fearful.length;
  }, [valid]);

  const checklistStats = useMemo(() => {
    const withPsych = valid.filter(t => t.psychology);
    if (withPsych.length === 0) return [];
    const keys: (keyof typeof withPsych[0]['psychology']['checklist'])[] = ['followPlan', 'noFomo', 'noRevenge', 'waitedConfirmation', 'riskRespected'];
    const labels: Record<string, string> = { followPlan: 'Follow Plan', noFomo: 'No FOMO', noRevenge: 'No Revenge', waitedConfirmation: 'Waited Confirm', riskRespected: 'Risk Discipline' };
    return keys.map(k => {
      const checked = withPsych.filter(t => t.psychology!.checklist[k]).length;
      return { name: labels[k], rate: Math.round(checked / withPsych.length * 100) };
    });
  }, [valid]);

  const disciplineTrend = useMemo(() => {
    const withPsych = valid.filter(t => t.psychology).sort((a, b) => a.date.localeCompare(b.date));
    if (withPsych.length < 3) return [];
    const weeks = new Map<string, number[]>();
    withPsych.forEach(t => {
      const d = new Date(t.date);
      const weekKey = `${d.getMonth() + 1}/${Math.ceil(d.getDate() / 7)}`;
      const c = t.psychology!.checklist;
      let s = 0;
      if (c.followPlan) s += 20; if (c.noFomo) s += 20; if (c.noRevenge) s += 20;
      if (c.waitedConfirmation) s += 20; if (c.riskRespected) s += 20;
      const arr = weeks.get(weekKey) || [];
      arr.push(s);
      weeks.set(weekKey, arr);
    });
    return [...weeks.entries()].map(([week, scores]) => ({
      week, score: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    }));
  }, [valid]);

  const behaviorVsPnl = useMemo(() => {
    return valid.filter(t => t.psychology).map(t => {
      const c = t.psychology!.checklist;
      let s = 0;
      if (c.followPlan) s += 20; if (c.noFomo) s += 20; if (c.noRevenge) s += 20;
      if (c.waitedConfirmation) s += 20; if (c.riskRespected) s += 20;
      return { discipline: s, pl: t.profitLoss, size: Math.abs(t.profitLoss) + 10 };
    });
  }, [valid]);

  // Mistake impact by session
  const mistakeBySession = useMemo(() => {
    const map = new Map<string, number>();
    valid.forEach(t => {
      if (t.mistakes.length > 0) {
        map.set(t.session, (map.get(t.session) || 0) + t.mistakes.length);
      }
    });
    return [...map.entries()].map(([session, count]) => ({ session, mistakes: count })).sort((a, b) => b.mistakes - a.mistakes);
  }, [valid]);

  // Insights
  const insights = useMemo(() => {
    const result: string[] = [];
    if (disciplineScore >= 80) result.push(`Discipline score of ${disciplineScore}/100 is excellent. Your psychology is a strength.`);
    else if (disciplineScore < 50) result.push(`Discipline score of ${disciplineScore}/100 needs improvement. Focus on following your checklist.`);
    if (overtradingIndex > 20) result.push(`Overtrading pattern detected on ${overtradingIndex}% of trading days. Set strict daily trade limits.`);
    if (revengePatterns > 0) result.push(`${revengePatterns} potential revenge trading instances detected. Take breaks after consecutive losses.`);
    if (fearExits > 0) result.push(`${fearExits} trades closed with fear-based emotions that resulted in losses. Work on holding positions.`);
    if (mistakeBySession.length > 0) result.push(`Most mistakes happen during ${mistakeBySession[0].session} session (${mistakeBySession[0].mistakes} total).`);
    return result;
  }, [disciplineScore, overtradingIndex, revengePatterns, fearExits, mistakeBySession]);

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <PageHeader title="Behavior Patterns" subtitle="Detect behavioral flaws & recurring patterns">
        <ThemeToggle />
      </PageHeader>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <MetricCard label="Discipline Score" value={`${disciplineScore}/100`} trend={disciplineScore >= 60 ? 'up' : 'down'} tooltip="Overall score based on checklist compliance and emotional control" />
        <MetricCard label="Emotional Stability" value={`${emotionalStability}%`} trend={emotionalStability >= 70 ? 'up' : 'down'} tooltip="How consistent your emotional state is across trades" />
        <MetricCard label="Rule Adherence" value={`${ruleAdherence}%`} trend={ruleAdherence >= 70 ? 'up' : 'down'} tooltip="How often you follow your trading rules and checklist" />
        <MetricCard label="Revenge Index" value={revengePatterns} subtitle="2+ consec losses/day" trend={revengePatterns > 0 ? 'down' : 'up'} tooltip="Days where 2+ consecutive losses suggest revenge trading behavior" />
        <MetricCard label="Overtrade Index" value={`${overtradingIndex}%`} subtitle=">3 trades/day" trend={overtradingIndex > 10 ? 'down' : 'up'} tooltip="Percentage of trading days where you took more than 3 trades" />
        <MetricCard label="Fear-Based Exits" value={fearExits} trend={fearExits > 0 ? 'down' : 'up'} tooltip="Trades closed early due to fear emotions that resulted in losses" />
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Behavior Insights</span>
          </div>
          <div className="space-y-2">
            {insights.map((insight, i) => <p key={i} className="text-sm text-foreground/80">{insight}</p>)}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <ChartHeader title="Trades Per Day" tooltip="Daily trade count — red bars highlight days with more than 3 trades (potential overtrading)" />
          <div className="h-[220px]">
            {dailyTradeCount.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyTradeCount}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="date" tick={{ fontSize: 8, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip content={<Tip />} />
                  <Bar dataKey="count" name="Trades" radius={[4, 4, 0, 0]} opacity={0.8}>
                    {dailyTradeCount.map((d, i) => (
                      <Cell key={i} fill={d.count > 3 ? 'hsl(0 70% 60%)' : 'hsl(210 70% 60%)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No data</div>}
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <ChartHeader title="Mistakes by Session" tooltip="Which trading session has the highest mistake count" />
          <div className="h-[220px]">
            {mistakeBySession.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mistakeBySession} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis dataKey="session" type="category" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} width={110} />
                  <Tooltip content={<Tip />} />
                  <Bar dataKey="mistakes" name="Mistakes" fill="hsl(0 65% 55%)" radius={[0, 4, 4, 0]} opacity={0.8} />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No mistake data</div>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <ChartHeader title="Discipline vs Profit" tooltip="Scatter plot — does higher discipline score lead to better profits?" />
          <div className="h-[250px]">
            {behaviorVsPnl.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="discipline" name="Discipline" domain={[0, 100]} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis dataKey="pl" name="P/L" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <ZAxis dataKey="size" range={[20, 200]} />
                  <Tooltip content={<Tip />} />
                  <Scatter data={behaviorVsPnl} fill="hsl(210 70% 60%)" opacity={0.6} />
                </ScatterChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No psychology data</div>}
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <ChartHeader title="Checklist Compliance" tooltip="How well you follow each item on your pre-trade checklist" />
          <div className="h-[250px]">
            {checklistStats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={checklistStats} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} width={110} />
                  <Tooltip content={<Tip />} />
                  <Bar dataKey="rate" name="Compliance %" fill="hsl(142 55% 50%)" radius={[0, 4, 4, 0]} opacity={0.8} />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No data</div>}
          </div>
        </div>
      </div>

      {disciplineTrend.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Discipline Trend (Weekly)</h3>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={disciplineTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="week" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip content={<Tip />} />
                <Line type="monotone" dataKey="score" name="Discipline" stroke="hsl(210 70% 55%)" strokeWidth={2} dot={{ r: 3 }} opacity={0.8} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
