import { useState } from 'react';
import { useUrlPreview } from '@/hooks/useUrlPreview';
import { LinkPreviewList } from '@/components/shared/LinkPreview';
import { useTrading } from '@/contexts/TradingContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Calendar, Shield, BarChart3, Target, TrendingUp, FileText, Eye, Save, Video, Newspaper, Layers } from 'lucide-react';
import { WeeklyPlan, PairAnalysis, ALL_ASSETS } from '@/types/trading';
import { cn } from '@/lib/utils';
import { UnifiedMediaBox } from '@/components/shared/UnifiedMediaBox';
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

function formatWeekRange(weekStart: string): string {
  const start = new Date(weekStart);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${start.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', opts)}, ${start.getFullYear()}`;
}

function BiasTag({ bias }: { bias: string }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border',
      bias === 'Bullish' && 'bg-success/10 text-success border-success/25',
      bias === 'Bearish' && 'bg-destructive/10 text-destructive border-destructive/25',
      bias === 'Neutral' && 'bg-muted text-muted-foreground border-border',
    )}>
      <span className={cn(
        'h-1.5 w-1.5 rounded-full',
        bias === 'Bullish' && 'bg-success',
        bias === 'Bearish' && 'bg-destructive',
        bias === 'Neutral' && 'bg-muted-foreground',
      )} />
      {bias}
    </span>
  );
}

function SectionCard({ title, icon, accent = 'primary', badge, children, className }: {
  title: string; icon?: React.ReactNode; accent?: 'primary' | 'success' | 'warning' | 'destructive';
  badge?: string; children: React.ReactNode; className?: string;
}) {
  const accentColors = {
    primary: 'border-l-primary',
    success: 'border-l-success',
    warning: 'border-l-warning',
    destructive: 'border-l-destructive',
  };
  const iconColors = {
    primary: 'text-primary bg-primary/10',
    success: 'text-success bg-success/10',
    warning: 'text-warning bg-warning/10',
    destructive: 'text-destructive bg-destructive/10',
  };

  return (
    <div className={cn(
      'rounded-xl border border-border/60 bg-card overflow-hidden border-l-[3px]',
      accentColors[accent],
      'shadow-[var(--shadow-card)]',
      className
    )}>
      <div className="px-5 py-3.5 border-b border-border/40 bg-muted/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {icon && (
              <div className={cn('h-7 w-7 rounded-lg flex items-center justify-center', iconColors[accent])}>
                {icon}
              </div>
            )}
            <h3 className="font-heading text-xs font-bold tracking-wide uppercase text-foreground">{title}</h3>
          </div>
          {badge && (
            <span className="text-[9px] font-mono font-semibold uppercase tracking-widest text-muted-foreground/70 bg-muted/50 px-2 py-0.5 rounded-full">
              {badge}
            </span>
          )}
        </div>
      </div>
      <div className="p-5 space-y-4">
        {children}
      </div>
    </div>
  );
}

export default function WeeklyPlanPage() {
  const { weeklyPlans, addWeeklyPlan, updateWeeklyPlan } = useTrading();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [localPlan, setLocalPlan] = useState<WeeklyPlan | null>(null);
  const { previews: notePreviews, loading: noteLoading, detectAndFetch: detectNoteUrls, removePreview: removeNotePreview } = useUrlPreview();

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
    toast({ title: '✅ Saved!', description: 'Weekly plan saved successfully.' });
  };

  // List view
  if (!activeId) {
    return (
      <div className="p-4 sm:p-6 max-w-[900px] mx-auto space-y-6 pb-20">
        <PlanListHeader title="Weekly Plans" subtitle="Strategic market analysis & bias journal" onNew={startNew} newLabel="New Week" />

        {weeklyPlans.length === 0 ? (
          <PlanEmptyState
            message="No weekly plans yet. Start your first analysis."
            actionLabel="Create your first plan"
            onAction={startNew}
            icon={<Calendar className="h-7 w-7 text-muted-foreground/60" />}
          />
        ) : (
          <div className="grid gap-2">
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
    <div className="p-4 sm:p-6 max-w-[900px] mx-auto space-y-5 pb-28">
      <PlanDetailHeader onBack={() => { setActiveId(null); setLocalPlan(null); }} backLabel="All weeks" />

      {/* Hero Banner */}
      <div className="relative rounded-2xl overflow-hidden border border-primary/20">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent" />
        <div className="relative px-6 py-5">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="h-3.5 w-3.5 text-primary" />
            <span className="text-[10px] font-mono font-semibold uppercase tracking-widest text-primary">Weekly Plan</span>
          </div>
          <h1 className="font-heading text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
            {formatWeekLabel(localPlan.weekStart)}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">{formatWeekRange(localPlan.weekStart)}</p>
        </div>
      </div>

      {/* Config */}
      <SectionCard title="Week Config" icon={<Shield className="h-3.5 w-3.5" />} badge="Setup">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Week Starting</Label>
            <Input type="date" value={localPlan.weekStart} onChange={e => update({ weekStart: e.target.value })} className="rounded-lg h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Markets Focus</Label>
            <Input value={localPlan.markets.join(', ')} onChange={e => update({ markets: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} placeholder="EURUSD, XAUUSD, NAS100" className="rounded-lg h-9 text-sm" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Risk Plan</Label>
          <Textarea value={localPlan.risk} onChange={e => update({ risk: e.target.value })} className="min-h-[60px] text-sm rounded-lg" placeholder="Max 2% per trade, 5% daily drawdown..." />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Weekly Goals</Label>
          <Textarea value={localPlan.goals} onChange={e => update({ goals: e.target.value })} className="min-h-[60px] text-sm rounded-lg" placeholder="Focus on A+ setups only, max 3 trades per day..." />
        </div>
      </SectionCard>

      {/* Economic Calendar */}
      <SectionCard title="Economic Calendar" icon={<Newspaper className="h-3.5 w-3.5" />} accent="warning" badge="News">
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
            detectNoteUrls(e.target.value);
          }}
          placeholder="Key events and expected impact this week... Paste URLs for auto-preview"
          className="min-h-[60px] text-sm rounded-lg"
        />
        <LinkPreviewList previews={notePreviews} loading={noteLoading} onRemove={removeNotePreview} />
      </SectionCard>

      {/* PAIR ANALYSES */}
      {localPlan.pairAnalyses.map((pa, idx) => (
        <div key={pa.id} className="space-y-4">
          {/* Pair Divider */}
          <div className="flex items-center gap-3 pt-2">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
            <div className="flex items-center gap-2.5 bg-muted/50 rounded-full px-4 py-2 border border-border/50">
              <span className="font-mono text-[10px] font-bold text-muted-foreground/50">#{idx + 1}</span>
              <Select value={pa.pair || 'none'} onValueChange={v => updatePair(pa.id, { pair: v === 'none' ? '' : v })}>
                <SelectTrigger className="w-[150px] text-sm font-heading font-extrabold border-none shadow-none p-0 h-auto bg-transparent">
                  <SelectValue placeholder="Select Pair" />
                </SelectTrigger>
                <SelectContent>{ALL_ASSETS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
              </Select>
              {pa.bias !== 'Neutral' && <BiasTag bias={pa.bias} />}
            </div>
            <div className="h-px flex-1 bg-gradient-to-r from-border via-transparent to-transparent" />
            {localPlan.pairAnalyses.length > 1 && (
              <Button variant="ghost" size="icon" onClick={() => removePair(pa.id)} className="shrink-0 h-7 w-7 rounded-lg hover:bg-destructive/10 hover:text-destructive">
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>

          {/* Primary View */}
          <SectionCard title="Chart Analysis" icon={<Eye className="h-3.5 w-3.5" />} accent="primary">
            <PlanImageUpload value={pa.chartImage} onChange={v => updatePair(pa.id, { chartImage: v })} label="Prediction Chart" />
            <Textarea value={pa.narrative || ''} onChange={e => updatePair(pa.id, { narrative: e.target.value })} placeholder="Liquidity zones, order flow expectations..." className="min-h-[70px] text-sm rounded-lg" />
          </SectionCard>

          {/* Bias & Reasons side-by-side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SectionCard title="Bias" icon={<TrendingUp className="h-3.5 w-3.5" />}>
              <Select value={pa.bias} onValueChange={v => updatePair(pa.id, { bias: v as any })}>
                <SelectTrigger className="w-full rounded-lg h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bullish">Bullish</SelectItem>
                  <SelectItem value="Bearish">Bearish</SelectItem>
                  <SelectItem value="Neutral">Neutral</SelectItem>
                </SelectContent>
              </Select>
            </SectionCard>

            <SectionCard title="Reasons" icon={<FileText className="h-3.5 w-3.5" />}>
              <Textarea
                value={(pa.reasons as any).__freeText || (typeof pa.reasons === 'string' ? pa.reasons : pa.reasons?.join?.(', ') || '')}
                onChange={e => updatePair(pa.id, { reasons: e.target.value as any })}
                placeholder="Technical reasons for this bias..."
                className="min-h-[60px] text-sm rounded-lg"
              />
            </SectionCard>
          </div>

          {/* Key Levels */}
          <SectionCard title="Key Levels" icon={<Target className="h-3.5 w-3.5" />} accent="warning">
            <Textarea value={pa.keyLevels} onChange={e => updatePair(pa.id, { keyLevels: e.target.value })} placeholder="1.08500 - major resistance&#10;1.08200 - support zone" className="min-h-[70px] text-sm font-mono rounded-lg" />
          </SectionCard>

          {/* Scenarios */}
          <SectionCard title="Scenarios" icon={<Layers className="h-3.5 w-3.5" />} badge="If / Then">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-3 p-4 rounded-xl bg-success/[0.04] border border-success/15">
                <Label className="text-[10px] font-bold text-success uppercase tracking-wider">Bullish Scenario</Label>
                <Textarea placeholder="Condition: If price sweeps lows..." className="min-h-[55px] text-sm rounded-lg bg-transparent border-success/20 focus:border-success/40" />
                <Textarea placeholder="Reaction: Buy entries at OB..." className="min-h-[55px] text-sm rounded-lg bg-transparent border-success/20 focus:border-success/40" />
              </div>
              <div className="space-y-3 p-4 rounded-xl bg-destructive/[0.04] border border-destructive/15">
                <Label className="text-[10px] font-bold text-destructive uppercase tracking-wider">Bearish Scenario</Label>
                <Textarea placeholder="Condition: If price fails to break..." className="min-h-[55px] text-sm rounded-lg bg-transparent border-destructive/20 focus:border-destructive/40" />
                <Textarea placeholder="Reaction: Short from FVG..." className="min-h-[55px] text-sm rounded-lg bg-transparent border-destructive/20 focus:border-destructive/40" />
              </div>
            </div>
          </SectionCard>

          {/* Result */}
          <SectionCard title="Result" icon={<BarChart3 className="h-3.5 w-3.5" />} accent="success" badge="Post-Week">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Actual Direction</Label>
              <Select value={pa.actualDirection || 'none'} onValueChange={v => updatePair(pa.id, { actualDirection: v === 'none' ? '' : v as any })}>
                <SelectTrigger className="w-48 rounded-lg h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  <SelectItem value="Bullish">Bullish</SelectItem>
                  <SelectItem value="Bearish">Bearish</SelectItem>
                  <SelectItem value="Neutral">Neutral</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <PlanImageUpload value={pa.resultChartImage} onChange={v => updatePair(pa.id, { resultChartImage: v })} label="Result Chart" />
            <Textarea value={pa.note || ''} onChange={e => { updatePair(pa.id, { note: e.target.value }); detectNoteUrls(e.target.value); }} placeholder="What actually happened... Paste URLs for auto-preview" className="min-h-[60px] text-sm rounded-lg" />
            <LinkPreviewList previews={notePreviews} loading={noteLoading} onRemove={removeNotePreview} />
          </SectionCard>
        </div>
      ))}

      {/* Add Pair */}
      <button
        onClick={addPair}
        className="w-full py-3.5 rounded-xl border-2 border-dashed border-border/60 hover:border-primary/40 hover:bg-primary/[0.03] transition-all flex items-center justify-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary"
      >
        <Plus className="h-4 w-4" /> Add Pair Analysis
      </button>

      {/* Calendar Result */}
      <SectionCard title="Calendar Result" icon={<Calendar className="h-3.5 w-3.5" />} accent="warning" badge="Post-Week">
        <Textarea
          value={localPlan.newsResult || ''}
          onChange={e => update({ newsResult: e.target.value })}
          placeholder="Which events impacted the market? Was the reaction expected?"
          className="min-h-[70px] text-sm rounded-lg"
        />
      </SectionCard>

      {/* Video */}
      <SectionCard title="Analysis Video" icon={<Video className="h-3.5 w-3.5" />}>
        <PlanVideoUpload value={localPlan.analysisVideoUrl || ''} onChange={v => update({ analysisVideoUrl: v })} label="Upload analysis video" />
      </SectionCard>

      {/* Sticky Save */}
      <div className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-background/80 backdrop-blur-lg border-t border-border/50">
        <div className="max-w-[900px] mx-auto">
          <Button onClick={handleSave} className="w-full h-11 rounded-xl font-heading font-bold text-sm uppercase tracking-wider shadow-lg gap-2">
            <Save className="h-4 w-4" /> Save Weekly Plan
          </Button>
        </div>
      </div>
    </div>
  );
}
