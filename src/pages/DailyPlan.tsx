import { useState, useMemo } from 'react';
import { useTrading } from '@/contexts/TradingContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Calendar, Shield, Target, TrendingUp, FileText, Eye, Clock, Crosshair, StickyNote, BarChart3, Save } from 'lucide-react';
import { DailyPlan, DailyPairPlan, ALL_ASSETS, Session } from '@/types/trading';
import { cn } from '@/lib/utils';
import { PlanSection } from '@/components/plans/PlanSection';
import { PlanImageUpload } from '@/components/plans/PlanImageUpload';
import { PlanVideoUpload } from '@/components/plans/PlanVideoUpload';
import { PlanListHeader, PlanDetailHeader, PlanEmptyState } from '@/components/plans/PlanHeader';
import { PlanListItem } from '@/components/plans/PlanListItem';
import { toast } from '@/hooks/use-toast';

const SESSIONS: Session[] = ['Asia', 'London', 'New York', 'New York Kill Zone', 'London Close'];

const emptyPairPlan = (): DailyPairPlan => ({
  id: crypto.randomUUID(),
  pair: '',
  bias: 'Neutral',
  setup: '',
  reasons: [],
  keyLevels: '',
  narrative: '',
});

function formatDayLabel(date: string): string {
  const d = new Date(date);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
}

function BiasChip({ bias }: { bias: string }) {
  const color = bias === 'Bullish' ? 'bg-success/15 text-success border-success/30'
    : bias === 'Bearish' ? 'bg-destructive/15 text-destructive border-destructive/30'
    : 'bg-muted text-muted-foreground border-border';
  return <span className={cn('text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border', color)}>{bias}</span>;
}

export default function DailyPlanPage() {
  const { dailyPlans, addDailyPlan, updateDailyPlan, trades } = useTrading();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [localPlan, setLocalPlan] = useState<DailyPlan | null>(null);

  const startNew = () => {
    const plan: DailyPlan = {
      id: crypto.randomUUID(),
      date: new Date().toISOString().split('T')[0],
      dailyBias: 'Neutral',
      sessionFocus: 'New York',
      maxTrades: 3,
      riskLimit: '2% per trade',
      pairs: [emptyPairPlan()],
      newsItems: [],
      analysisVideoUrl: '',
      note: '',
    };
    addDailyPlan(plan);
    setActiveId(plan.id);
    setLocalPlan(plan);
  };

  const openPlan = (id: string) => {
    const plan = dailyPlans.find(p => p.id === id);
    if (plan) {
      setActiveId(id);
      setLocalPlan({ ...plan, pairs: plan.pairs.map(pp => ({ ...pp })) });
    }
  };

  const update = (updates: Partial<DailyPlan>) => {
    if (!localPlan) return;
    setLocalPlan({ ...localPlan, ...updates });
  };

  const updatePair = (pairId: string, updates: Partial<DailyPairPlan>) => {
    if (!localPlan) return;
    setLocalPlan({
      ...localPlan,
      pairs: localPlan.pairs.map(p => p.id === pairId ? { ...p, ...updates } : p),
    });
  };

  const addPair = () => {
    if (!localPlan) return;
    update({ pairs: [...localPlan.pairs, emptyPairPlan()] });
  };

  const removePair = (id: string) => {
    if (!localPlan) return;
    update({ pairs: localPlan.pairs.filter(p => p.id !== id) });
  };

  const handleSave = () => {
    if (!localPlan) return;
    updateDailyPlan(localPlan);
    toast({ title: 'Saved!', description: 'Daily plan saved successfully.' });
  };

  const dayTrades = useMemo(() => {
    if (!localPlan) return [];
    return trades.filter(t => t.date === localPlan.date);
  }, [localPlan?.date, trades]);

  // List view
  if (!activeId) {
    return (
      <div className="p-6 max-w-[820px] mx-auto space-y-8 pb-20">
        <PlanListHeader title="Daily Plans" subtitle="Execution-focused daily journal" onNew={startNew} newLabel="New Day" />

        {dailyPlans.length === 0 ? (
          <PlanEmptyState
            message="No daily plans yet. Start your first session."
            actionLabel="Create your first plan"
            onAction={startNew}
            icon={<Clock className="h-7 w-7 text-muted-foreground/60" />}
          />
        ) : (
          <div className="space-y-2">
            {[...dailyPlans].reverse().map(plan => (
              <PlanListItem
                key={plan.id}
                onClick={() => openPlan(plan.id)}
                title={formatDayLabel(plan.date)}
                subtitle={plan.sessionFocus}
                meta={`${plan.pairs.length} pairs`}
                icon={<Crosshair className="h-4 w-4 text-primary" />}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (!localPlan) return null;

  return (
    <div className="p-6 max-w-[820px] mx-auto space-y-8 pb-24">
      <PlanDetailHeader onBack={() => { setActiveId(null); setLocalPlan(null); }} backLabel="All days" />

      {/* Day title banner */}
      <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/15 p-6">
        <p className="text-xs font-mono font-semibold uppercase tracking-widest text-primary mb-1">Daily Plan</p>
        <h1 className="font-heading text-2xl font-extrabold tracking-tight text-foreground">
          {formatDayLabel(localPlan.date)}
        </h1>
      </div>

      {/* SETUP */}
      <PlanSection title="Setup" icon={<Shield className="h-4 w-4" />} badge="Config">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground tracking-wide uppercase">Date</Label>
            <Input type="date" value={localPlan.date} onChange={e => update({ date: e.target.value })} className="rounded-lg" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground tracking-wide uppercase">Session Focus</Label>
            <Select value={localPlan.sessionFocus} onValueChange={v => update({ sessionFocus: v as Session })}>
              <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
              <SelectContent>{SESSIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground tracking-wide uppercase">Max Trades</Label>
            <Input type="number" min={1} max={20} value={localPlan.maxTrades} onChange={e => update({ maxTrades: parseInt(e.target.value) || 3 })} className="rounded-lg" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground tracking-wide uppercase">Risk Limit</Label>
            <Input value={localPlan.riskLimit} onChange={e => update({ riskLimit: e.target.value })} placeholder="Max 2% per trade" className="rounded-lg" />
          </div>
        </div>
      </PlanSection>

      {/* GLOBAL NEWS */}
      <PlanSection title="Global News" icon={<Calendar className="h-4 w-4" />} accent="warning" badge="News">
        <PlanImageUpload
          value={(localPlan.newsItems?.[0]?.image) || ''}
          onChange={v => {
            const items = localPlan.newsItems && localPlan.newsItems.length > 0
              ? [{ ...localPlan.newsItems[0], image: v }]
              : [{ id: crypto.randomUUID(), date: '', event: '', currency: '', impact: 'High' as const, image: v }];
            update({ newsItems: items });
          }}
          label="News Screenshot"
        />
        <Textarea
          value={(localPlan.newsItems?.[0]?.notes) || ''}
          onChange={e => {
            const items = localPlan.newsItems && localPlan.newsItems.length > 0
              ? [{ ...localPlan.newsItems[0], notes: e.target.value }]
              : [{ id: crypto.randomUUID(), date: '', event: '', currency: '', impact: 'High' as const, notes: e.target.value }];
            update({ newsItems: items });
          }}
          placeholder="Short notes about today's news context..."
          className="min-h-[70px] text-sm rounded-lg"
        />
      </PlanSection>

      {/* PAIR EXECUTION PLANS */}
      {localPlan.pairs.map((pp, idx) => (
        <div key={pp.id} className="space-y-6">
          {/* Pair header */}
          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-border/50" />
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs font-bold text-muted-foreground/50">#{idx + 1}</span>
              <Select value={pp.pair || 'none'} onValueChange={v => updatePair(pp.id, { pair: v === 'none' ? '' : v })}>
                <SelectTrigger className="w-[180px] text-lg font-heading font-extrabold border-none shadow-none p-0 h-auto bg-transparent">
                  <SelectValue placeholder="Select Pair..." />
                </SelectTrigger>
                <SelectContent>{ALL_ASSETS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
              </Select>
              {pp.bias !== 'Neutral' && <BiasChip bias={pp.bias} />}
            </div>
            <div className="h-px flex-1 bg-border/50" />
            {localPlan.pairs.length > 1 && (
              <Button variant="ghost" size="icon" onClick={() => removePair(pp.id)} className="shrink-0 h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>

          {/* Bias */}
          <PlanSection title="Bias" icon={<TrendingUp className="h-4 w-4" />}>
            <Select value={pp.bias} onValueChange={v => updatePair(pp.id, { bias: v as any })}>
              <SelectTrigger className="w-48 rounded-lg"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Bullish">Bullish</SelectItem>
                <SelectItem value="Bearish">Bearish</SelectItem>
                <SelectItem value="Neutral">Neutral</SelectItem>
              </SelectContent>
            </Select>
          </PlanSection>

          {/* Prediction Chart */}
          <PlanSection title="Prediction" icon={<Eye className="h-4 w-4" />} accent="primary">
            <PlanImageUpload value={pp.chartImage} onChange={v => updatePair(pp.id, { chartImage: v })} label="Prediction Chart" />
            <Textarea value={pp.narrative || ''} onChange={e => updatePair(pp.id, { narrative: e.target.value })} placeholder="Expected price movement and why..." className="min-h-[70px] text-sm rounded-lg" />
          </PlanSection>

          {/* Reasons - free text */}
          <PlanSection title="Reasons" icon={<FileText className="h-4 w-4" />}>
            <Textarea
              value={typeof pp.reasons === 'string' ? pp.reasons : pp.reasons?.join?.(', ') || ''}
              onChange={e => updatePair(pp.id, { reasons: e.target.value as any })}
              placeholder="Type your technical reasons for this bias..."
              className="min-h-[80px] text-sm rounded-lg"
            />
          </PlanSection>

          {/* Execution Plan */}
          <PlanSection title="Execution Plan" icon={<Target className="h-4 w-4" />} accent="warning">
            <Textarea value={pp.keyLevels} onChange={e => updatePair(pp.id, { keyLevels: e.target.value })} placeholder="Entry idea / SL idea / TP idea / Key levels..." className="min-h-[80px] text-sm font-mono rounded-lg" />
          </PlanSection>

          {/* Result */}
          <PlanSection title="Result" icon={<BarChart3 className="h-4 w-4" />} accent="success" badge="Post-Session">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground tracking-wide uppercase">Actual Bias</Label>
              <Select value={(pp as any).actualBias || 'none'} onValueChange={v => updatePair(pp.id, { ...pp, actualBias: v === 'none' ? '' : v } as any)}>
                <SelectTrigger className="w-48 rounded-lg"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  <SelectItem value="Bullish">Bullish</SelectItem>
                  <SelectItem value="Bearish">Bearish</SelectItem>
                  <SelectItem value="Neutral">Neutral</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <PlanImageUpload value={pp.resultChartImage} onChange={v => updatePair(pp.id, { resultChartImage: v })} label="Result Chart" />
            <Textarea value={pp.resultNarrative || ''} onChange={e => updatePair(pp.id, { resultNarrative: e.target.value })} placeholder="What actually happened..." className="min-h-[70px] text-sm rounded-lg" />
          </PlanSection>

          {/* Note */}
          <PlanSection title="Note" icon={<StickyNote className="h-4 w-4" />}>
            <Textarea value={pp.note || ''} onChange={e => updatePair(pp.id, { note: e.target.value })} placeholder="Additional thoughts..." className="min-h-[70px] text-sm rounded-lg" />
          </PlanSection>
        </div>
      ))}

      {/* Add Pair Button */}
      <Button variant="outline" onClick={addPair} className="w-full gap-2 rounded-xl h-12 border-dashed border-2 hover:border-primary/40 hover:bg-primary/[0.03] font-semibold">
        <Plus className="h-4 w-4" /> Add Pair
      </Button>

      {/* TRADE ACTIVITY */}
      <PlanSection title="Trade Activity" icon={<BarChart3 className="h-4 w-4" />} accent="primary">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Label className="text-sm font-medium">Did you take any trade?</Label>
            <div className="flex gap-2">
              <Button size="sm" variant={localPlan.tookTrades === true ? 'default' : 'outline'} onClick={() => update({ tookTrades: true })} className="rounded-lg font-semibold">Yes</Button>
              <Button size="sm" variant={localPlan.tookTrades === false ? 'default' : 'outline'} onClick={() => update({ tookTrades: false })} className="rounded-lg font-semibold">No</Button>
            </div>
          </div>

          {localPlan.tookTrades === true && (
            dayTrades.length > 0 ? (
              <div className="space-y-3">
                {dayTrades.map(t => (
                  <div key={t.id} className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-heading font-bold">{t.asset}</span>
                      <span className={cn('text-[10px] font-mono font-bold uppercase px-2.5 py-1 rounded-full',
                        t.result === 'Win' ? 'bg-success/15 text-success' :
                        t.result === 'Loss' ? 'bg-destructive/15 text-destructive' :
                        'bg-muted text-muted-foreground'
                      )}>{t.result}</span>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 text-xs text-muted-foreground">
                      <div><span className="block text-foreground font-semibold">{t.direction}</span>Direction</div>
                      <div><span className="block text-foreground font-mono">{t.entryPrice}</span>Entry</div>
                      <div><span className="block text-foreground font-mono">{t.stopLoss}</span>SL</div>
                      <div><span className="block text-foreground font-mono">{t.takeProfit}</span>TP</div>
                      <div><span className="block text-foreground font-mono">{t.exitPrice || '—'}</span>Exit</div>
                      <div><span className={cn('block font-mono font-bold', t.profitLoss >= 0 ? 'text-success' : 'text-destructive')}>${t.profitLoss.toFixed(2)}</span>P/L</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No trades found for {localPlan.date}. Log trades in the Trades page.</p>
            )
          )}

          {localPlan.tookTrades === false && (
            <p className="text-sm text-muted-foreground italic">No trades taken.</p>
          )}
        </div>
      </PlanSection>

      {/* RESULT */}
      <PlanSection title="Result" icon={<BarChart3 className="h-4 w-4" />} accent="success" badge="Post-Day">
        <Textarea value={localPlan.resultNarrative || ''} onChange={e => update({ resultNarrative: e.target.value })} placeholder="What happened in the market today..." className="min-h-[80px] text-sm rounded-lg" />
      </PlanSection>

      {/* NOTE */}
      <PlanSection title="Note" icon={<StickyNote className="h-4 w-4" />}>
        <Textarea value={localPlan.note || ''} onChange={e => update({ note: e.target.value })} placeholder="Final thoughts for the day..." className="min-h-[80px] text-sm rounded-lg" />
      </PlanSection>

      {/* ANALYSIS VIDEO */}
      <PlanSection title="Analysis Video" icon={<Save className="h-4 w-4" />}>
        <PlanVideoUpload value={localPlan.analysisVideoUrl || ''} onChange={v => update({ analysisVideoUrl: v })} label="Upload or link analysis video" />
      </PlanSection>

      {/* SAVE BUTTON */}
      <Button onClick={handleSave} className="w-full h-12 rounded-xl font-heading font-bold text-sm uppercase tracking-wide shadow-sm gap-2">
        <Save className="h-4 w-4" /> Save Daily Plan
      </Button>
    </div>
  );
}
