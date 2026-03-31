import { useState } from 'react';
import { useTrading } from '@/contexts/TradingContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Calendar, Shield, BarChart3, Target, TrendingUp, FileText, Eye, Save } from 'lucide-react';
import { WeeklyPlan, PairAnalysis, ALL_ASSETS } from '@/types/trading';
import { cn } from '@/lib/utils';
import { PlanSection } from '@/components/plans/PlanSection';
import { PlanImageUpload } from '@/components/plans/PlanImageUpload';
import { PlanVideoUpload } from '@/components/plans/PlanVideoUpload';
import { PlanListHeader, PlanDetailHeader, PlanEmptyState } from '@/components/plans/PlanHeader';
import { PlanListItem } from '@/components/plans/PlanListItem';
import { toast } from '@/hooks/use-toast';

const emptyPairAnalysis = (): PairAnalysis => ({
  id: crypto.randomUUID(),
  pair: '',
  bias: 'Neutral',
  setupFocus: '',
  reasons: [],
  keyLevels: '',
  narrative: '',
  expectedDirection: 'Buy',
  actualDirection: '',
  actualResult: '',
  note: '',
});

function formatWeekLabel(weekStart: string): string {
  const date = new Date(weekStart);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const day = date.getDate();
  const weekNum = Math.ceil(day / 7);
  return `Week ${weekNum} ${month}`;
}

function BiasChip({ bias }: { bias: string }) {
  const color = bias === 'Bullish' ? 'bg-success/15 text-success border-success/30'
    : bias === 'Bearish' ? 'bg-destructive/15 text-destructive border-destructive/30'
    : 'bg-muted text-muted-foreground border-border';
  return <span className={cn('text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border', color)}>{bias}</span>;
}

export default function WeeklyPlanPage() {
  const { weeklyPlans, addWeeklyPlan, updateWeeklyPlan } = useTrading();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [localPlan, setLocalPlan] = useState<WeeklyPlan | null>(null);

  const startNew = () => {
    const plan: WeeklyPlan = {
      id: crypto.randomUUID(),
      weekStart: new Date().toISOString().split('T')[0],
      bias: '',
      markets: [],
      setups: [],
      levels: '',
      risk: '',
      goals: '',
      pairAnalyses: [emptyPairAnalysis()],
      newsItems: [],
      newsResult: '',
      analysisVideoUrl: '',
    };
    addWeeklyPlan(plan);
    setActiveId(plan.id);
    setLocalPlan(plan);
  };

  const openPlan = (id: string) => {
    const plan = weeklyPlans.find(p => p.id === id);
    if (plan) {
      setActiveId(id);
      setLocalPlan({ ...plan, pairAnalyses: plan.pairAnalyses.map(pa => ({ ...pa })) });
    }
  };

  const update = (updates: Partial<WeeklyPlan>) => {
    if (!localPlan) return;
    setLocalPlan({ ...localPlan, ...updates });
  };

  const updatePair = (pairId: string, updates: Partial<PairAnalysis>) => {
    if (!localPlan) return;
    setLocalPlan({
      ...localPlan,
      pairAnalyses: localPlan.pairAnalyses.map(p => p.id === pairId ? { ...p, ...updates } : p),
    });
  };

  const addPair = () => {
    if (!localPlan) return;
    update({ pairAnalyses: [...localPlan.pairAnalyses, emptyPairAnalysis()] });
  };

  const removePair = (id: string) => {
    if (!localPlan) return;
    update({ pairAnalyses: localPlan.pairAnalyses.filter(p => p.id !== id) });
  };

  const handleSave = () => {
    if (!localPlan) return;
    updateWeeklyPlan(localPlan);
    toast({ title: 'Saved!', description: 'Weekly plan saved successfully.' });
  };

  // Plan list
  if (!activeId) {
    return (
      <div className="p-6 max-w-[820px] mx-auto space-y-8 pb-20">
        <PlanListHeader title="Weekly Plans" subtitle="Strategic market analysis & bias journal" onNew={startNew} newLabel="New Week" />

        {weeklyPlans.length === 0 ? (
          <PlanEmptyState
            message="No weekly plans yet. Start your first analysis."
            actionLabel="Create your first plan"
            onAction={startNew}
            icon={<Calendar className="h-7 w-7 text-muted-foreground/60" />}
          />
        ) : (
          <div className="space-y-2">
            {[...weeklyPlans].reverse().map(plan => (
              <PlanListItem
                key={plan.id}
                onClick={() => openPlan(plan.id)}
                title={formatWeekLabel(plan.weekStart)}
                subtitle={plan.markets.length > 0 ? plan.markets.slice(0, 4).join(' · ') : undefined}
                meta={`${plan.pairAnalyses.length} pairs`}
                icon={<BarChart3 className="h-4 w-4 text-primary" />}
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
      <PlanDetailHeader onBack={() => { setActiveId(null); setLocalPlan(null); }} backLabel="All weeks" />

      {/* Week title banner */}
      <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/15 p-6">
        <p className="text-xs font-mono font-semibold uppercase tracking-widest text-primary mb-1">Weekly Plan</p>
        <h1 className="font-heading text-2xl font-extrabold tracking-tight text-foreground">
          {formatWeekLabel(localPlan.weekStart)}
        </h1>
      </div>

      {/* SETUP */}
      <PlanSection title="Setup" icon={<Shield className="h-4 w-4" />} badge="Config">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground tracking-wide uppercase">Week Starting</Label>
            <Input type="date" value={localPlan.weekStart} onChange={e => update({ weekStart: e.target.value })} className="rounded-lg" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground tracking-wide uppercase">Markets Focus</Label>
            <Input value={localPlan.markets.join(', ')} onChange={e => update({ markets: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} placeholder="EURUSD, XAUUSD, NAS100" className="rounded-lg" />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground tracking-wide uppercase">Risk Plan</Label>
          <Textarea value={localPlan.risk} onChange={e => update({ risk: e.target.value })} className="min-h-[70px] text-sm rounded-lg" placeholder="Max 2% per trade, 5% daily drawdown..." />
        </div>
      </PlanSection>

      {/* ECONOMIC CALENDAR */}
      <PlanSection title="Economic Calendar" icon={<Calendar className="h-4 w-4" />} accent="warning" badge="News">
        <PlanImageUpload
          value={(localPlan.newsItems?.[0]?.image) || ''}
          onChange={v => {
            const items = localPlan.newsItems && localPlan.newsItems.length > 0
              ? [{ ...localPlan.newsItems[0], image: v }]
              : [{ id: crypto.randomUUID(), date: '', event: '', currency: '', impact: 'High' as const, image: v }];
            update({ newsItems: items });
          }}
          label="Forex Factory / Economic Calendar"
        />
        <Textarea
          value={(localPlan.newsItems?.[0]?.notes) || ''}
          onChange={e => {
            const items = localPlan.newsItems && localPlan.newsItems.length > 0
              ? [{ ...localPlan.newsItems[0], notes: e.target.value }]
              : [{ id: crypto.randomUUID(), date: '', event: '', currency: '', impact: 'High' as const, notes: e.target.value }];
            update({ newsItems: items });
          }}
          placeholder="Notes about key events this week..."
          className="min-h-[70px] text-sm rounded-lg"
        />
      </PlanSection>

      {/* PAIR ANALYSES */}
      {localPlan.pairAnalyses.map((pa, idx) => (
        <div key={pa.id} className="space-y-6">
          {/* Pair header */}
          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-border/50" />
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs font-bold text-muted-foreground/50">#{idx + 1}</span>
              <Select value={pa.pair || 'none'} onValueChange={v => updatePair(pa.id, { pair: v === 'none' ? '' : v })}>
                <SelectTrigger className="w-[180px] text-lg font-heading font-extrabold border-none shadow-none p-0 h-auto bg-transparent">
                  <SelectValue placeholder="Select Pair..." />
                </SelectTrigger>
                <SelectContent>{ALL_ASSETS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
              </Select>
              {pa.bias !== 'Neutral' && <BiasChip bias={pa.bias} />}
            </div>
            <div className="h-px flex-1 bg-border/50" />
            {localPlan.pairAnalyses.length > 1 && (
              <Button variant="ghost" size="icon" onClick={() => removePair(pa.id)} className="shrink-0 h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>

          {/* Primary View */}
          <PlanSection title="Primary View" icon={<Eye className="h-4 w-4" />} accent="primary">
            <PlanImageUpload value={pa.chartImage} onChange={v => updatePair(pa.id, { chartImage: v })} label="Prediction Chart" />
            <Textarea value={pa.narrative || ''} onChange={e => updatePair(pa.id, { narrative: e.target.value })} placeholder="Liquidity above highs → expect sweep then bearish move..." className="min-h-[80px] text-sm rounded-lg" />
          </PlanSection>

          {/* Bias */}
          <PlanSection title="Bias" icon={<TrendingUp className="h-4 w-4" />}>
            <Select value={pa.bias} onValueChange={v => updatePair(pa.id, { bias: v as any })}>
              <SelectTrigger className="w-48 rounded-lg"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Bullish">Bullish</SelectItem>
                <SelectItem value="Bearish">Bearish</SelectItem>
                <SelectItem value="Neutral">Neutral</SelectItem>
              </SelectContent>
            </Select>
          </PlanSection>

          {/* Reasons - free text */}
          <PlanSection title="Reasons" icon={<FileText className="h-4 w-4" />}>
            <Textarea
              value={(pa.reasons as any).__freeText || (typeof pa.reasons === 'string' ? pa.reasons : pa.reasons?.join?.(', ') || '')}
              onChange={e => updatePair(pa.id, { reasons: e.target.value as any })}
              placeholder="Type your technical reasons for this bias..."
              className="min-h-[80px] text-sm rounded-lg"
            />
          </PlanSection>

          {/* Key Levels */}
          <PlanSection title="Key Levels" icon={<Target className="h-4 w-4" />} accent="warning">
            <Textarea value={pa.keyLevels} onChange={e => updatePair(pa.id, { keyLevels: e.target.value })} placeholder="1.08500 - major resistance&#10;1.08200 - support zone&#10;..." className="min-h-[80px] text-sm font-mono rounded-lg" />
          </PlanSection>

          {/* Scenarios */}
          <PlanSection title="Scenarios" badge="If / Then">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-3 p-4 rounded-xl bg-success/[0.04] border border-success/15">
                <Label className="text-xs font-bold text-success uppercase tracking-wide">Bullish Scenario</Label>
                <Textarea placeholder="Condition: If price sweeps lows and reclaims..." className="min-h-[60px] text-sm rounded-lg bg-transparent border-success/20 focus:border-success/40" />
                <Textarea placeholder="Reaction: Look for buy entries at OB..." className="min-h-[60px] text-sm rounded-lg bg-transparent border-success/20 focus:border-success/40" />
              </div>
              <div className="space-y-3 p-4 rounded-xl bg-destructive/[0.04] border border-destructive/15">
                <Label className="text-xs font-bold text-destructive uppercase tracking-wide">Bearish Scenario</Label>
                <Textarea placeholder="Condition: If price fails to break above..." className="min-h-[60px] text-sm rounded-lg bg-transparent border-destructive/20 focus:border-destructive/40" />
                <Textarea placeholder="Reaction: Short from FVG with SL above highs..." className="min-h-[60px] text-sm rounded-lg bg-transparent border-destructive/20 focus:border-destructive/40" />
              </div>
            </div>
          </PlanSection>

          {/* Result */}
          <PlanSection title="Result" icon={<BarChart3 className="h-4 w-4" />} accent="success" badge="Post-Week">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground tracking-wide uppercase">Actual Bias</Label>
              <Select value={pa.actualDirection || 'none'} onValueChange={v => updatePair(pa.id, { actualDirection: v === 'none' ? '' : v as any })}>
                <SelectTrigger className="w-48 rounded-lg"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  <SelectItem value="Bullish">Bullish</SelectItem>
                  <SelectItem value="Bearish">Bearish</SelectItem>
                  <SelectItem value="Neutral">Neutral</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <PlanImageUpload value={pa.resultChartImage} onChange={v => updatePair(pa.id, { resultChartImage: v })} label="Result Chart" />
            <Textarea value={pa.note || ''} onChange={e => updatePair(pa.id, { note: e.target.value })} placeholder="What actually happened..." className="min-h-[70px] text-sm rounded-lg" />
          </PlanSection>
        </div>
      ))}

      {/* Add Pair Button */}
      <Button variant="outline" onClick={addPair} className="w-full gap-2 rounded-xl h-12 border-dashed border-2 hover:border-primary/40 hover:bg-primary/[0.03] font-semibold">
        <Plus className="h-4 w-4" /> Add Pair Analysis
      </Button>

      {/* CALENDAR RESULT */}
      <PlanSection title="Calendar Result" icon={<Calendar className="h-4 w-4" />} accent="warning" badge="Post-Week">
        <Textarea
          value={localPlan.newsResult || ''}
          onChange={e => update({ newsResult: e.target.value })}
          placeholder="Which economic events impacted market this week? Was the reaction expected?"
          className="min-h-[80px] text-sm rounded-lg"
        />
      </PlanSection>

      {/* ANALYSIS VIDEO */}
      <PlanSection title="Analysis Video" icon={<Save className="h-4 w-4" />}>
        <PlanVideoUpload value={localPlan.analysisVideoUrl || ''} onChange={v => update({ analysisVideoUrl: v })} label="Upload or link analysis video" />
      </PlanSection>

      {/* SAVE BUTTON */}
      <Button onClick={handleSave} className="w-full h-12 rounded-xl font-heading font-bold text-sm uppercase tracking-wide shadow-sm gap-2">
        <Save className="h-4 w-4" /> Save Weekly Plan
      </Button>
    </div>
  );
}
