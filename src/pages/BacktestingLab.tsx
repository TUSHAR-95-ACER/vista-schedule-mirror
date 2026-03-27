import { useState, useCallback, useMemo } from 'react';
import { format, parse } from 'date-fns';
import {
  FlaskConical, Play, Square, Plus, X, ImagePlus, Upload,
  Target, TrendingUp, TrendingDown, Minus, Eye, EyeOff,
  BarChart3, AlertTriangle, CheckCircle2, XCircle, Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { ALL_ASSETS } from '@/types/trading';

// ── Types ──────────────────────────────────────────────
interface BacktestEntry {
  id: string;
  type: 'valid' | 'taken' | 'missed' | 'invalid';
  day: string; // YYYY-MM-DD
  setupType?: string;
  bias?: 'Bullish' | 'Bearish';
  result?: 'Win' | 'Loss' | 'BE';
  rr?: number;
  notes?: string;
  image?: string;
  timestamp: number;
}

interface BacktestSession {
  id: string;
  pair: string;
  month: string; // YYYY-MM
  timeframe: string;
  entries: BacktestEntry[];
  startedAt: number;
  endedAt?: number;
}

const SETUP_TYPES = ['OB', 'FVG', 'Breakout', 'CHoCH', 'BOS', 'Liquidity Sweep', 'SMT', 'Pullback', 'Volume Candle'];
const TIMEFRAMES = ['1m', '5m', '15m', '30m', '1H', '4H', 'Daily', 'Weekly'];
const MONTHS = Array.from({ length: 12 }, (_, i) => {
  const d = new Date(2026, i, 1);
  return { value: format(d, 'yyyy-MM'), label: format(d, 'MMMM yyyy') };
});

// ── Component ──────────────────────────────────────────
export default function BacktestingLab() {
  const [sessions, setSessions] = useState<BacktestSession[]>([]);
  const [activeSession, setActiveSession] = useState<BacktestSession | null>(null);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [summarySession, setSummarySession] = useState<BacktestSession | null>(null);

  // Session form
  const [pair, setPair] = useState('');
  const [month, setMonth] = useState('');
  const [timeframe, setTimeframe] = useState('');

  // Detail dialog for entry
  const [detailOpen, setDetailOpen] = useState(false);
  const [pendingType, setPendingType] = useState<BacktestEntry['type'] | null>(null);
  const [entryForm, setEntryForm] = useState({
    day: '', setupType: '', bias: '' as '' | 'Bullish' | 'Bearish',
    result: '' as '' | 'Win' | 'Loss' | 'BE', rr: '', notes: '', image: ''
  });

  // Expanded card view
  const [expandedEntry, setExpandedEntry] = useState<BacktestEntry | null>(null);

  // ── Session controls ──
  const startSession = () => {
    if (!pair || !month || !timeframe) return;
    const session: BacktestSession = {
      id: crypto.randomUUID(), pair, month, timeframe,
      entries: [], startedAt: Date.now()
    };
    setActiveSession(session);
  };

  const endSession = () => {
    if (!activeSession) return;
    const ended = { ...activeSession, endedAt: Date.now() };
    setSessions(prev => [...prev, ended]);
    setSummarySession(ended);
    setActiveSession(null);
    setShowSummary(true);
    setShowEndConfirm(false);
  };

  // ── Quick log ──
  const openQuickLog = (type: BacktestEntry['type']) => {
    setPendingType(type);
    setEntryForm({
      day: format(new Date(), 'yyyy-MM-dd'), setupType: '', bias: '',
      result: '', rr: '', notes: '', image: ''
    });
    setDetailOpen(true);
  };

  const saveEntry = () => {
    if (!activeSession || !pendingType) return;
    const entry: BacktestEntry = {
      id: crypto.randomUUID(),
      type: pendingType,
      day: entryForm.day || format(new Date(), 'yyyy-MM-dd'),
      setupType: entryForm.setupType || undefined,
      bias: entryForm.bias as any || undefined,
      result: entryForm.result as any || undefined,
      rr: entryForm.rr ? parseFloat(entryForm.rr) : undefined,
      notes: entryForm.notes || undefined,
      image: entryForm.image || undefined,
      timestamp: Date.now(),
    };
    setActiveSession(prev => prev ? { ...prev, entries: [...prev.entries, entry] } : prev);
    setDetailOpen(false);
  };

  // Image handling
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setEntryForm(f => ({ ...f, image: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    for (const item of e.clipboardData.items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (!file) continue;
        const reader = new FileReader();
        reader.onload = () => setEntryForm(f => ({ ...f, image: reader.result as string }));
        reader.readAsDataURL(file);
        e.preventDefault();
        break;
      }
    }
  }, []);

  // ── Computed stats ──
  const stats = useMemo(() => {
    const entries = activeSession?.entries || [];
    const valid = entries.filter(e => e.type === 'valid').length;
    const taken = entries.filter(e => e.type === 'taken').length;
    const missed = entries.filter(e => e.type === 'missed').length;
    const invalid = entries.filter(e => e.type === 'invalid').length;
    const wins = entries.filter(e => e.result === 'Win').length;
    const losses = entries.filter(e => e.result === 'Loss').length;
    const total = entries.length;
    return { valid, taken, missed, invalid, wins, losses, total };
  }, [activeSession?.entries]);

  const computeSessionStats = (session: BacktestSession) => {
    const e = session.entries;
    const taken = e.filter(x => x.type === 'taken').length;
    const missed = e.filter(x => x.type === 'missed').length;
    const valid = e.filter(x => x.type === 'valid').length;
    const wins = e.filter(x => x.result === 'Win').length;
    const losses = e.filter(x => x.result === 'Loss').length;
    const totalSetups = valid + taken + missed;
    const rrs = e.filter(x => x.rr !== undefined).map(x => x.rr!);
    const avgRR = rrs.length ? (rrs.reduce((a, b) => a + b, 0) / rrs.length).toFixed(2) : '—';
    const winRate = (wins + losses) > 0 ? ((wins / (wins + losses)) * 100).toFixed(1) : '—';
    const takenPct = totalSetups > 0 ? ((taken / totalSetups) * 100).toFixed(1) : '0';
    const missedPct = totalSetups > 0 ? ((missed / totalSetups) * 100).toFixed(1) : '0';

    // Edge insights
    const setupCounts: Record<string, { taken: number; missed: number; wins: number; total: number }> = {};
    e.forEach(entry => {
      const s = entry.setupType || 'Unknown';
      if (!setupCounts[s]) setupCounts[s] = { taken: 0, missed: 0, wins: 0, total: 0 };
      setupCounts[s].total++;
      if (entry.type === 'taken') setupCounts[s].taken++;
      if (entry.type === 'missed') setupCounts[s].missed++;
      if (entry.result === 'Win') setupCounts[s].wins++;
    });
    const bestSetup = Object.entries(setupCounts).sort((a, b) => b[1].wins - a[1].wins)[0];
    const mostMissed = Object.entries(setupCounts).sort((a, b) => b[1].missed - a[1].missed)[0];

    return { totalSetups, taken, missed, wins, losses, winRate, avgRR, takenPct, missedPct, bestSetup, mostMissed };
  };

  // Daily breakdown
  const dailyBreakdown = useMemo(() => {
    const entries = activeSession?.entries || [];
    const grouped: Record<string, BacktestEntry[]> = {};
    entries.forEach(e => {
      if (!grouped[e.day]) grouped[e.day] = [];
      grouped[e.day].push(e);
    });
    return Object.entries(grouped).sort((a, b) => a[0].localeCompare(b[0]));
  }, [activeSession?.entries]);

  const typeConfig = {
    valid: { label: 'Valid Setup', color: 'bg-primary text-primary-foreground', icon: CheckCircle2 },
    taken: { label: 'Trade Taken', color: 'bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]', icon: TrendingUp },
    missed: { label: 'Missed Trade', color: 'bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))]', icon: EyeOff },
    invalid: { label: 'Invalid Setup', color: 'bg-muted text-muted-foreground', icon: XCircle },
  };

  const resultColor = (r?: string) => {
    if (r === 'Win') return 'bg-[hsl(var(--success))]/15 text-[hsl(var(--success))] border-[hsl(var(--success))]/30';
    if (r === 'Loss') return 'bg-destructive/15 text-destructive border-destructive/30';
    if (r === 'BE') return 'bg-muted text-muted-foreground border-border';
    return '';
  };

  // ── No active session: show setup form ──
  if (!activeSession) {
    return (
      <div className="space-y-6 p-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <FlaskConical className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-heading text-foreground">Manual Backtesting Lab</h1>
            <p className="text-sm text-muted-foreground">Replay charts externally and log every setup manually</p>
          </div>
        </div>

        {/* Start session card */}
        <Card className="border-border/60">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Play className="h-4 w-4 text-primary" />
              Start New Session
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Pair</Label>
                <Select value={pair} onValueChange={setPair}>
                  <SelectTrigger><SelectValue placeholder="Select pair" /></SelectTrigger>
                  <SelectContent>
                    {ALL_ASSETS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Month</Label>
                <Select value={month} onValueChange={setMonth}>
                  <SelectTrigger><SelectValue placeholder="Select month" /></SelectTrigger>
                  <SelectContent>
                    {MONTHS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Timeframe</Label>
                <Select value={timeframe} onValueChange={setTimeframe}>
                  <SelectTrigger><SelectValue placeholder="Select TF" /></SelectTrigger>
                  <SelectContent>
                    {TIMEFRAMES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={startSession} disabled={!pair || !month || !timeframe} className="w-full sm:w-auto gap-2">
              <Play className="h-4 w-4" /> Start Session
            </Button>
          </CardContent>
        </Card>

        {/* Past sessions */}
        {sessions.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold font-heading text-foreground">Past Sessions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {sessions.map(s => {
                const ss = computeSessionStats(s);
                return (
                  <Card key={s.id} className="border-border/50 hover:border-border transition-colors cursor-pointer"
                    onClick={() => { setSummarySession(s); setShowSummary(true); }}>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">{s.pair}</span>
                        <Badge variant="secondary" className="text-[10px]">{s.timeframe}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{s.month}</p>
                      <div className="flex gap-3 text-xs text-muted-foreground">
                        <span>{ss.totalSetups} setups</span>
                        <span className="text-[hsl(var(--success))]">{ss.wins}W</span>
                        <span className="text-destructive">{ss.losses}L</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Summary dialog */}
        {renderSummaryDialog()}
      </div>
    );
  }

  // ── Active session view ──
  return (
    <div className="space-y-5 p-6 max-w-6xl mx-auto" onPaste={handlePaste}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <FlaskConical className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-heading text-foreground flex items-center gap-2">
              {activeSession.pair}
              <Badge variant="secondary" className="text-[10px] font-mono">{activeSession.timeframe}</Badge>
            </h1>
            <p className="text-xs text-muted-foreground">{activeSession.month} • Session active</p>
          </div>
        </div>
        <Button variant="destructive" size="sm" className="gap-1.5" onClick={() => setShowEndConfirm(true)}>
          <Square className="h-3.5 w-3.5" /> End Session
        </Button>
      </div>

      {/* Live counters */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {[
          { label: 'Total', value: stats.total, icon: BarChart3, cls: 'text-foreground' },
          { label: 'Valid', value: stats.valid, icon: CheckCircle2, cls: 'text-primary' },
          { label: 'Taken', value: stats.taken, icon: TrendingUp, cls: 'text-[hsl(var(--success))]' },
          { label: 'Missed', value: stats.missed, icon: EyeOff, cls: 'text-[hsl(var(--warning))]' },
          { label: 'Wins', value: stats.wins, icon: TrendingUp, cls: 'text-[hsl(var(--success))]' },
          { label: 'Losses', value: stats.losses, icon: TrendingDown, cls: 'text-destructive' },
        ].map(c => (
          <Card key={c.label} className="border-border/50">
            <CardContent className="p-3 flex flex-col items-center gap-1">
              <c.icon className={`h-4 w-4 ${c.cls}`} />
              <span className={`text-2xl font-bold font-mono ${c.cls}`}>{c.value}</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{c.label}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick log buttons */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Quick Log</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(['valid', 'taken', 'missed', 'invalid'] as const).map(type => {
              const cfg = typeConfig[type];
              const Icon = cfg.icon;
              return (
                <Button key={type} variant="outline" className="h-auto py-4 flex flex-col gap-2 hover:scale-[1.02] transition-transform"
                  onClick={() => openQuickLog(type)}>
                  <div className={`h-9 w-9 rounded-lg ${cfg.color} flex items-center justify-center`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-medium">{cfg.label}</span>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Visual log grid */}
      {activeSession.entries.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Session Entries</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {activeSession.entries.map(entry => {
              const cfg = typeConfig[entry.type];
              return (
                <Card key={entry.id} className="border-border/50 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group"
                  onClick={() => setExpandedEntry(entry)}>
                  {entry.image ? (
                    <div className="aspect-video overflow-hidden bg-muted/20">
                      <img src={entry.image} alt="chart" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                    </div>
                  ) : (
                    <div className="aspect-video bg-muted/10 flex items-center justify-center">
                      <ImagePlus className="h-6 w-6 text-muted-foreground/30" />
                    </div>
                  )}
                  <CardContent className="p-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Badge className={`${cfg.color} text-[10px] px-2 py-0.5`}>{cfg.label}</Badge>
                      {entry.result && (
                        <Badge variant="outline" className={`text-[10px] px-1.5 ${resultColor(entry.result)}`}>{entry.result}</Badge>
                      )}
                    </div>
                    {entry.setupType && <p className="text-xs font-medium text-foreground">{entry.setupType}</p>}
                    <p className="text-[10px] text-muted-foreground">{entry.day}{entry.rr !== undefined ? ` • ${entry.rr}R` : ''}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Daily breakdown */}
      {dailyBreakdown.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Daily Breakdown</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {dailyBreakdown.map(([day, entries]) => {
              const t = entries.filter(e => e.type === 'taken').length;
              const m = entries.filter(e => e.type === 'missed').length;
              const v = entries.filter(e => e.type === 'valid').length;
              return (
                <Card key={day} className="border-border/50">
                  <CardContent className="p-4">
                    <p className="font-semibold text-sm text-foreground mb-2">{format(new Date(day), 'MMMM d')}</p>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>{v + t + m} setups</span>
                      <span className="text-[hsl(var(--success))]">{t} taken</span>
                      <span className="text-[hsl(var(--warning))]">{m} missed</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Entry detail dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-md" onPaste={handlePaste}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              {pendingType && (() => { const Icon = typeConfig[pendingType].icon; return <Icon className="h-4 w-4" />; })()}
              Log: {pendingType && typeConfig[pendingType].label}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Day</Label>
                <Input type="date" value={entryForm.day} onChange={e => setEntryForm(f => ({ ...f, day: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Setup Type</Label>
                <Select value={entryForm.setupType} onValueChange={v => setEntryForm(f => ({ ...f, setupType: v }))}>
                  <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>{SETUP_TYPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Bias</Label>
                <Select value={entryForm.bias} onValueChange={v => setEntryForm(f => ({ ...f, bias: v as any }))}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Bullish">Bullish</SelectItem>
                    <SelectItem value="Bearish">Bearish</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Result</Label>
                <Select value={entryForm.result} onValueChange={v => setEntryForm(f => ({ ...f, result: v as any }))}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Win">Win</SelectItem>
                    <SelectItem value="Loss">Loss</SelectItem>
                    <SelectItem value="BE">BE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">RR</Label>
                <Input type="number" step="0.1" placeholder="e.g. 2.5" value={entryForm.rr}
                  onChange={e => setEntryForm(f => ({ ...f, rr: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Notes</Label>
              <Textarea placeholder="Optional notes..." value={entryForm.notes} rows={2}
                onChange={e => setEntryForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            {/* Image */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Chart Image</Label>
              {entryForm.image ? (
                <div className="relative group rounded-lg overflow-hidden border border-border/50">
                  <img src={entryForm.image} alt="chart" className="w-full max-h-48 object-contain bg-muted/10" />
                  <button onClick={() => setEntryForm(f => ({ ...f, image: '' }))}
                    className="absolute top-2 right-2 h-7 w-7 rounded-md bg-background/90 border border-border/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="relative border-2 border-dashed border-border/50 rounded-lg p-6 text-center hover:border-primary/40 transition-colors cursor-pointer">
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-5 w-5 text-muted-foreground/50" />
                    <p className="text-xs text-muted-foreground">Upload or paste (Ctrl+V)</p>
                  </div>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>
              )}
            </div>
            <Button onClick={saveEntry} className="w-full gap-2">
              <Plus className="h-4 w-4" /> Log Entry
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Expanded entry view */}
      <Dialog open={!!expandedEntry} onOpenChange={() => setExpandedEntry(null)}>
        <DialogContent className="max-w-lg">
          {expandedEntry && (
            <>
              <DialogHeader>
                <DialogTitle className="text-foreground">{typeConfig[expandedEntry.type].label}</DialogTitle>
              </DialogHeader>
              {expandedEntry.image && (
                <img src={expandedEntry.image} alt="chart" className="w-full rounded-lg border border-border/50 object-contain max-h-80 bg-muted/10" />
              )}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground text-xs">Day</span><p className="font-medium text-foreground">{expandedEntry.day}</p></div>
                {expandedEntry.setupType && <div><span className="text-muted-foreground text-xs">Setup</span><p className="font-medium text-foreground">{expandedEntry.setupType}</p></div>}
                {expandedEntry.bias && <div><span className="text-muted-foreground text-xs">Bias</span><p className="font-medium text-foreground">{expandedEntry.bias}</p></div>}
                {expandedEntry.result && <div><span className="text-muted-foreground text-xs">Result</span><Badge variant="outline" className={resultColor(expandedEntry.result)}>{expandedEntry.result}</Badge></div>}
                {expandedEntry.rr !== undefined && <div><span className="text-muted-foreground text-xs">RR</span><p className="font-medium font-mono text-foreground">{expandedEntry.rr}R</p></div>}
              </div>
              {expandedEntry.notes && (
                <div><span className="text-muted-foreground text-xs">Notes</span><p className="text-sm text-foreground mt-1">{expandedEntry.notes}</p></div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* End session confirm */}
      <AlertDialog open={showEndConfirm} onOpenChange={setShowEndConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End this session?</AlertDialogTitle>
            <AlertDialogDescription>Your {stats.total} entries will be saved and a summary will be generated.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={endSession}>End Session</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Summary dialog */}
      {renderSummaryDialog()}
    </div>
  );

  function renderSummaryDialog() {
    if (!summarySession) return null;
    const ss = computeSessionStats(summarySession);
    return (
      <Dialog open={showSummary} onOpenChange={setShowSummary}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <BarChart3 className="h-5 w-5 text-primary" />
              Session Summary — {summarySession.pair} {summarySession.timeframe}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: 'Total Setups', value: ss.totalSetups },
                { label: 'Trades Taken', value: `${ss.taken} (${ss.takenPct}%)` },
                { label: 'Missed Trades', value: `${ss.missed} (${ss.missedPct}%)` },
                { label: 'Win Rate', value: `${ss.winRate}%` },
                { label: 'Avg RR', value: ss.avgRR },
                { label: 'W / L', value: `${ss.wins} / ${ss.losses}` },
              ].map(item => (
                <div key={item.label} className="bg-muted/30 rounded-lg p-3 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{item.label}</p>
                  <p className="text-lg font-bold font-mono text-foreground">{item.value}</p>
                </div>
              ))}
            </div>

            {/* Edge insights */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-[hsl(var(--warning))]" /> Edge Insights
              </h3>
              <div className="space-y-1.5 text-sm">
                {ss.bestSetup && (
                  <p className="text-muted-foreground">
                    🏆 Best setup: <span className="font-medium text-foreground">{ss.bestSetup[0]}</span> ({ss.bestSetup[1].wins} wins)
                  </p>
                )}
                {ss.mostMissed && ss.mostMissed[1].missed > 0 && (
                  <p className="text-muted-foreground">
                    ⚠️ Most missed: <span className="font-medium text-foreground">{ss.mostMissed[0]}</span> — you missed {ss.mostMissed[1].total > 0 ? ((ss.mostMissed[1].missed / ss.mostMissed[1].total) * 100).toFixed(0) : 0}% of {ss.mostMissed[0]} setups
                  </p>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
}
