import { useState, useMemo } from 'react';
import { MultiMediaBox } from '@/components/shared/MultiMediaBox';
import { useTrading } from '@/contexts/TradingContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Calendar, Shield, Target, TrendingUp, FileText, Eye, Clock, Crosshair, StickyNote, BarChart3, Save, Newspaper, Video } from 'lucide-react';
import { DailyPlan, DailyPairPlan, ALL_ASSETS } from '@/types/trading';
import { cn } from '@/lib/utils';
import { UnifiedMediaBox } from '@/components/shared/UnifiedMediaBox';
import { RichJournalBlock } from '@/components/shared/RichJournalBlock';
import { JournalVideoUpload } from '@/components/shared/JournalVideoUpload';
import { coerceRichJournal, serializeJournal } from '@/lib/journalData';
import { PlanListHeader, PlanDetailHeader, PlanEmptyState } from '@/components/plans/PlanHeader';
import { PlanListItem } from '@/components/plans/PlanListItem';
import { toast } from '@/hooks/use-toast';

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

function formatFullDate(date: string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function BiasTag({ bias }: { bias: string }) {
  if (bias === 'Neutral') return null;
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border',
      bias === 'Bullish' && 'bg-success/10 text-success border-success/25',
      bias === 'Bearish' && 'bg-destructive/10 text-destructive border-destructive/25',
    )}>
      <span className={cn(
        'h-1.5 w-1.5 rounded-full',
        bias === 'Bullish' && 'bg-success',
        bias === 'Bearish' && 'bg-destructive',
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

export default function DailyPlanPage() {
  const { dailyPlans, addDailyPlan, updateDailyPlan, deleteDailyPlan, trades, sessions } = useTrading();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [localPlan, setLocalPlan] = useState<DailyPlan | null>(null);
  

  const startNew = () => {
    const plan: DailyPlan = {
      id: crypto.randomUUID(),
      date: new Date().toISOString().split('T')[0],
      dailyBias: 'Neutral',
      sessionFocus: sessions[0] || 'New York',
      maxTrades: 2,
      riskLimit: '1%',
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
    toast({ title: '✅ Saved!', description: 'Daily plan saved successfully.' });
    setActiveId(null);
    setLocalPlan(null);
  };

  // Parse sessionFocus as potentially comma-separated for multi-select
  const selectedSessions = useMemo(() => {
    if (!localPlan) return [];
    const sf = localPlan.sessionFocus as string;
    return sf ? sf.split(',').map(s => s.trim()).filter(Boolean) : [];
  }, [localPlan?.sessionFocus]);

  const toggleSession = (session: string) => {
    const current = selectedSessions;
    const updated = current.includes(session)
      ? current.filter(s => s !== session)
      : [...current, session];
    update({ sessionFocus: updated.join(', ') as any });
  };

  const dayTrades = useMemo(() => {
    if (!localPlan) return [];
    return trades.filter(t => t.date === localPlan.date);
  }, [localPlan?.date, trades]);

  // List view
  if (!activeId) {
    return (
      <div className="p-4 sm:p-6 max-w-[900px] mx-auto space-y-6 pb-20">
        <PlanListHeader title="Daily Plans" subtitle="Execution-focused daily journal" onNew={startNew} newLabel="New Day" />

        {/* Stats Bar */}
        {dailyPlans.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-card border border-border rounded-xl p-4 text-center">
              <p className="text-2xl font-mono font-bold text-foreground">{dailyPlans.length}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Total Days</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 text-center">
              <p className="text-2xl font-mono font-bold text-success">{dailyPlans.filter(p => p.tookTrades).length}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Trading Days</p>
            </div>
          </div>
        )}

        {dailyPlans.length === 0 ? (
          <PlanEmptyState
            message="No daily plans yet. Start your first session."
            actionLabel="Create your first plan"
            onAction={startNew}
            icon={<Clock className="h-7 w-7 text-muted-foreground/60" />}
          />
        ) : (
          <div className="grid gap-2">
            {[...dailyPlans].reverse().map(plan => (
              <PlanListItem
                key={plan.id}
                onClick={() => openPlan(plan.id)}
                onDelete={() => deleteDailyPlan(plan.id)}
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
    <div className="p-4 sm:p-6 max-w-[900px] mx-auto space-y-5 pb-28">
      <PlanDetailHeader onBack={() => { setActiveId(null); setLocalPlan(null); }} backLabel="All days" />

      {/* Hero Banner - no Neutral badge */}
      <div className="relative rounded-2xl overflow-hidden border border-primary/20">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent" />
        <div className="relative px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] font-mono font-semibold uppercase tracking-widest text-primary">Daily Plan</span>
            </div>
            <h1 className="font-heading text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
              {formatFullDate(localPlan.date)}
            </h1>
          </div>
        </div>
      </div>

      {/* Config Section - removed daily bias */}
      <SectionCard title="Session Config" icon={<Shield className="h-3.5 w-3.5" />} badge="Setup">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Date</Label>
            <Input type="date" value={localPlan.date} onChange={e => update({ date: e.target.value })} className="rounded-lg h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Max Trades</Label>
            <Input type="number" min={1} max={20} value={localPlan.maxTrades} onChange={e => update({ maxTrades: parseInt(e.target.value) || 2 })} className="rounded-lg h-9 text-sm" />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Risk Limit</Label>
            <Input value={localPlan.riskLimit} onChange={e => update({ riskLimit: e.target.value })} placeholder="1%" className="rounded-lg h-9 text-sm" />
          </div>
        </div>
        {/* Multi-session select using checkboxes */}
        <div className="space-y-1.5">
          <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Session Focus (multi-select)</Label>
          <div className="flex flex-wrap gap-2">
            {sessions.map(s => (
              <label key={s} className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-all',
                selectedSessions.includes(s)
                  ? 'bg-primary/10 border-primary/30 text-primary'
                  : 'bg-muted/30 border-border/50 text-muted-foreground hover:bg-muted/50'
              )}>
                <Checkbox
                  checked={selectedSessions.includes(s)}
                  onCheckedChange={() => toggleSession(s)}
                  className="h-3 w-3"
                />
                {s}
              </label>
            ))}
          </div>
        </div>
      </SectionCard>

      {/* News */}
      <SectionCard title="News & Events" icon={<Newspaper className="h-3.5 w-3.5" />} accent="warning" badge="Macro">
        <MultiMediaBox
          values={(() => {
            const img = localPlan.newsItems?.[0]?.image;
            if (!img) return [];
            return img.includes('|||') ? img.split('|||').filter(Boolean) : [img];
          })()}
          onChange={vals => {
            const joined = vals.filter(Boolean).join('|||');
            const items = localPlan.newsItems && localPlan.newsItems.length > 0
              ? [{ ...localPlan.newsItems[0], image: joined }]
              : [{ id: crypto.randomUUID(), date: '', event: '', currency: '', impact: 'High' as const, image: joined }];
            update({ newsItems: items });
          }}
          label="Economic Calendar / News Screenshots"
          maxItems={5}
        />
      </SectionCard>

      {/* PAIR CARDS */}
      {localPlan.pairs.map((pp, idx) => (
        <div key={pp.id} className="space-y-4">
          {/* Pair Divider */}
          <div className="flex items-center gap-3 pt-2">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
            <div className="flex items-center gap-2.5 bg-muted/50 rounded-full px-4 py-2 border border-border/50">
              <span className="font-mono text-[10px] font-bold text-muted-foreground/50">#{idx + 1}</span>
              <Select value={pp.pair || 'none'} onValueChange={v => updatePair(pp.id, { pair: v === 'none' ? '' : v })}>
                <SelectTrigger className="w-[150px] text-sm font-heading font-extrabold border-none shadow-none p-0 h-auto bg-transparent">
                  <SelectValue placeholder="Select Pair" />
                </SelectTrigger>
                <SelectContent>{ALL_ASSETS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
              </Select>
              <BiasTag bias={pp.bias} />
            </div>
            <div className="h-px flex-1 bg-gradient-to-r from-border via-transparent to-transparent" />
            {localPlan.pairs.length > 1 && (
              <Button variant="ghost" size="icon" onClick={() => removePair(pp.id)} className="shrink-0 h-7 w-7 rounded-lg hover:bg-destructive/10 hover:text-destructive">
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>

          {/* Bias & Reasons */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SectionCard title="Bias" icon={<TrendingUp className="h-3.5 w-3.5" />}>
              <Select value={pp.bias} onValueChange={v => updatePair(pp.id, { bias: v as any })}>
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
                value={typeof pp.reasons === 'string' ? pp.reasons : pp.reasons?.join?.(', ') || ''}
                onChange={e => updatePair(pp.id, { reasons: e.target.value as any })}
                placeholder="Technical reasons for this bias..."
                className="min-h-[60px] text-sm rounded-lg"
              />
            </SectionCard>
          </div>

          {/* Prediction Chart - Notion-style notes */}
          <SectionCard title="Prediction" icon={<Eye className="h-3.5 w-3.5" />} accent="primary">
            <UnifiedMediaBox value={pp.chartImage} onChange={v => updatePair(pp.id, { chartImage: v })} label="Prediction Chart" />
            <RichJournalBlock
              title="Prediction Notes"
              scope={`daily/${localPlan.id}/pair-${pp.id}/analysis`}
              value={coerceRichJournal(pp.analysisJournal, pp.narrative)}
              onChange={v => updatePair(pp.id, { analysisJournal: serializeJournal(v), narrative: v.text })}
              placeholder="Expected price movement, key reasoning…"
              className="border-0 shadow-none p-0 bg-transparent"
            />
          </SectionCard>

          {/* Result */}
          <SectionCard title="Result" icon={<BarChart3 className="h-3.5 w-3.5" />} accent="success" badge="Post-Session">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Actual Bias</Label>
              <Select value={pp.actualBias || 'none'} onValueChange={v => updatePair(pp.id, { actualBias: v === 'none' ? '' : v as DailyPairPlan['actualBias'] })}>
                <SelectTrigger className="w-48 rounded-lg h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  <SelectItem value="Bullish">Bullish</SelectItem>
                  <SelectItem value="Bearish">Bearish</SelectItem>
                  <SelectItem value="Neutral">Neutral</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <UnifiedMediaBox value={pp.resultChartImage} onChange={v => updatePair(pp.id, { resultChartImage: v })} label="Result Chart" />
            <Textarea value={pp.resultNarrative || ''} onChange={e => updatePair(pp.id, { resultNarrative: e.target.value })} placeholder="What actually happened…" className="min-h-[60px] text-sm rounded-lg" />
          </SectionCard>
        </div>
      ))}

      {/* Add Pair */}
      <button
        onClick={addPair}
        className="w-full py-3.5 rounded-xl border-2 border-dashed border-border/60 hover:border-primary/40 hover:bg-primary/[0.03] transition-all flex items-center justify-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary"
      >
        <Plus className="h-4 w-4" /> Add Pair
      </button>

      {/* Trade Activity */}
      <SectionCard title="Trade Activity" icon={<BarChart3 className="h-3.5 w-3.5" />} accent="primary">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Label className="text-sm font-medium">Did you take any trade?</Label>
            <div className="flex gap-2">
              <Button size="sm" variant={localPlan.tookTrades === true ? 'default' : 'outline'} onClick={() => update({ tookTrades: true })} className="rounded-lg h-8 text-xs font-semibold px-4">Yes</Button>
              <Button size="sm" variant={localPlan.tookTrades === false ? 'default' : 'outline'} onClick={() => update({ tookTrades: false })} className="rounded-lg h-8 text-xs font-semibold px-4">No</Button>
            </div>
          </div>

          {localPlan.tookTrades === true && (
            dayTrades.length > 0 ? (
              <div className="space-y-2">
                {dayTrades.map(t => (
                  <div key={t.id} className="rounded-lg border border-border/50 bg-muted/20 p-3.5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-heading font-bold">{t.asset}</span>
                      <span className={cn('text-[10px] font-mono font-bold uppercase px-2.5 py-1 rounded-full',
                        t.result === 'Win' ? 'bg-success/10 text-success' :
                        t.result === 'Loss' ? 'bg-destructive/10 text-destructive' :
                        'bg-muted text-muted-foreground'
                      )}>{t.result}</span>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-[11px] text-muted-foreground">
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
              <p className="text-sm text-muted-foreground">No trades found for {localPlan.date}.</p>
            )
          )}
          {localPlan.tookTrades === false && (
            <p className="text-sm text-muted-foreground italic">No trades taken today.</p>
          )}
        </div>
      </SectionCard>

      {/* Day Summary - Notion */}
      <SectionCard title="Day Summary" icon={<BarChart3 className="h-3.5 w-3.5" />} accent="success" badge="Review">
        <RichJournalBlock
          title="Summary"
          scope={`daily/${localPlan.id}/summary`}
          value={coerceRichJournal((localPlan as DailyPlan).daySummary, localPlan.resultNarrative)}
          onChange={v => update({ daySummary: serializeJournal(v), resultNarrative: v.text } as Partial<DailyPlan>)}
          placeholder="What happened in the market today…"
          className="border-0 shadow-none p-0 bg-transparent"
        />
      </SectionCard>

      {/* Notes - Notion */}
      <SectionCard title="Notes" icon={<StickyNote className="h-3.5 w-3.5" />}>
        <RichJournalBlock
          title="Notes"
          scope={`daily/${localPlan.id}/notes`}
          value={coerceRichJournal((localPlan as DailyPlan).notesJournal, localPlan.note)}
          onChange={v => update({ notesJournal: serializeJournal(v), note: v.text } as Partial<DailyPlan>)}
          placeholder="Final thoughts, screenshots, video clips…"
          className="border-0 shadow-none p-0 bg-transparent"
        />
      </SectionCard>

      {/* Video - real upload */}
      <SectionCard title="Analysis Video" icon={<Video className="h-3.5 w-3.5" />}>
        <JournalVideoUpload
          url={localPlan.analysisVideoUrl}
          path={(localPlan as DailyPlan).analysisVideoPath}
          scope={`daily/${localPlan.id}/video`}
          onChange={(next) => update({ analysisVideoUrl: next.url, analysisVideoPath: next.path } as Partial<DailyPlan>)}
        />
      </SectionCard>

      {/* Sticky Save */}
      <div className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-background/80 backdrop-blur-lg border-t border-border/50">
        <div className="max-w-[900px] mx-auto">
          <Button onClick={handleSave} className="w-full h-11 rounded-xl font-heading font-bold text-sm uppercase tracking-wider shadow-lg gap-2">
            <Save className="h-4 w-4" /> Save Daily Plan
          </Button>
        </div>
      </div>
    </div>
  );
}
