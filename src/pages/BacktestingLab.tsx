import { useState, useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import {
  FlaskConical, Play, Square, Plus, X, ImagePlus, Upload,
  TrendingUp, TrendingDown, EyeOff,
  BarChart3, AlertTriangle, CheckCircle2, Clock, Newspaper,
  Star, Zap
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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
import { useTrading } from '@/contexts/TradingContext';
import { PageHeader } from '@/components/shared/MetricCard';
import { ThemeToggle } from '@/components/layout/ThemeToggle';

// ── Types ──────────────────────────────────────────────
type TradeGrade = 'A+' | 'A' | 'B' | 'C';

interface BacktestEntry {
  id: string;
  type: 'valid' | 'taken' | 'missed' | 'untriggered';
  day: string;
  setupType?: string;
  bias?: 'Bullish' | 'Bearish';
  result?: 'Win' | 'Loss' | 'BE';
  rr?: number;
  notes?: string;
  image?: string;
  timestamp: number;
  entryTimeframe?: string;
  grade?: TradeGrade;
  newsPresent?: 'None' | 'Upcoming' | 'Just Released' | 'High Impact Nearby';
  newsDetails?: string;
  session?: string;
  emotionBefore?: string;
  confluenceCount?: number;
  entryConfluences?: string[];
  targetConfluences?: string[];
}

interface BacktestSession {
  id: string;
  pair: string;
  month: string;
  entries: BacktestEntry[];
  startedAt: number;
  endedAt?: number;
}

const ENTRY_TIMEFRAMES = ['1m', '5m', '15m', '30m', '1H', '4H', 'Daily'];
const SESSIONS = ['Asia', 'London', 'New York', 'New York Kill Zone', 'London Close'];
const EMOTIONS = ['Confident', 'Calm', 'Neutral', 'Fearful', 'Anxious', 'Greedy'];
const NEWS_OPTIONS = ['None', 'Upcoming', 'Just Released', 'High Impact Nearby'];
const GRADES: TradeGrade[] = ['A+', 'A', 'B', 'C'];

// Generate months from 2020 to 2030
const MONTHS: { value: string; label: string }[] = [];
for (let year = 2020; year <= 2030; year++) {
  for (let m = 0; m < 12; m++) {
    const d = new Date(year, m, 1);
    MONTHS.push({ value: format(d, 'yyyy-MM'), label: format(d, 'MMMM yyyy') });
  }
}

export default function BacktestingLab() {
  const { customSetups } = useTrading();
  const [sessions, setSessions] = useState<BacktestSession[]>([]);
  const [activeSession, setActiveSession] = useState<BacktestSession | null>(null);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [summarySession, setSummarySession] = useState<BacktestSession | null>(null);

  const [pair, setPair] = useState('');
  const [month, setMonth] = useState('');

  const [detailOpen, setDetailOpen] = useState(false);
  const [pendingType, setPendingType] = useState<BacktestEntry['type'] | null>(null);
  const [entryForm, setEntryForm] = useState({
    day: '', setupType: '', bias: '' as '' | 'Bullish' | 'Bearish',
    result: '' as '' | 'Win' | 'Loss' | 'BE', rr: '', notes: '', image: '',
    entryTimeframe: '', grade: '' as '' | TradeGrade,
    newsPresent: '' as '' | string, newsDetails: '',
    session: '', emotionBefore: '', confluenceCount: '',
    entryConfluences: [] as string[], targetConfluences: [] as string[],
    newEntryConf: '', newTargetConf: '',
  });

  const [expandedEntry, setExpandedEntry] = useState<BacktestEntry | null>(null);

  const startSession = () => {
    if (!pair || !month) return;
    const session: BacktestSession = {
      id: crypto.randomUUID(), pair, month,
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

  const openQuickLog = (type: BacktestEntry['type']) => {
    setPendingType(type);
    setEntryForm({
      day: format(new Date(), 'yyyy-MM-dd'), setupType: '', bias: '',
      result: '', rr: '', notes: '', image: '',
      entryTimeframe: '', grade: '', newsPresent: '', newsDetails: '',
      session: '', emotionBefore: '', confluenceCount: ''
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
      entryTimeframe: entryForm.entryTimeframe || undefined,
      grade: entryForm.grade as TradeGrade || undefined,
      newsPresent: entryForm.newsPresent as any || undefined,
      newsDetails: entryForm.newsDetails || undefined,
      session: entryForm.session || undefined,
      emotionBefore: entryForm.emotionBefore || undefined,
      confluenceCount: entryForm.confluenceCount ? parseInt(entryForm.confluenceCount) : undefined,
    };
    setActiveSession(prev => prev ? { ...prev, entries: [...prev.entries, entry] } : prev);
    setDetailOpen(false);
  };

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

  const stats = useMemo(() => {
    const entries = activeSession?.entries || [];
    const valid = entries.filter(e => e.type === 'valid').length;
    const taken = entries.filter(e => e.type === 'taken').length;
    const missed = entries.filter(e => e.type === 'missed').length;
    const wins = entries.filter(e => e.result === 'Win').length;
    const losses = entries.filter(e => e.result === 'Loss').length;
    const be = entries.filter(e => e.result === 'BE').length;
    const total = entries.length;
    return { valid, taken, missed, wins, losses, be, total };
  }, [activeSession?.entries]);

  const computeSessionStats = (session: BacktestSession) => {
    const e = session.entries;
    const taken = e.filter(x => x.type === 'taken').length;
    const missed = e.filter(x => x.type === 'missed').length;
    const valid = e.filter(x => x.type === 'valid').length;
    const wins = e.filter(x => x.result === 'Win').length;
    const losses = e.filter(x => x.result === 'Loss').length;
    const be = e.filter(x => x.result === 'BE').length;
    const totalSetups = valid + taken + missed;
    const rrs = e.filter(x => x.rr !== undefined).map(x => x.rr!);
    const avgRR = rrs.length ? (rrs.reduce((a, b) => a + b, 0) / rrs.length).toFixed(2) : '—';
    const bestRR = rrs.length ? Math.max(...rrs).toFixed(1) : '—';
    const worstRR = rrs.length ? Math.min(...rrs).toFixed(1) : '—';
    const winRate = (wins + losses) > 0 ? ((wins / (wins + losses)) * 100).toFixed(1) : '—';
    const takenPct = totalSetups > 0 ? ((taken / totalSetups) * 100).toFixed(1) : '0';
    const missedPct = totalSetups > 0 ? ((missed / totalSetups) * 100).toFixed(1) : '0';

    // Grade breakdown
    const gradeBreakdown: Record<string, { total: number; wins: number }> = {};
    e.forEach(entry => {
      if (entry.grade) {
        if (!gradeBreakdown[entry.grade]) gradeBreakdown[entry.grade] = { total: 0, wins: 0 };
        gradeBreakdown[entry.grade].total++;
        if (entry.result === 'Win') gradeBreakdown[entry.grade].wins++;
      }
    });

    // News impact
    const newsEntries = e.filter(x => x.newsPresent && x.newsPresent !== 'None');
    const newsWins = newsEntries.filter(x => x.result === 'Win').length;
    const newsLosses = newsEntries.filter(x => x.result === 'Loss').length;

    // Session breakdown
    const sessionBreakdown: Record<string, { total: number; wins: number }> = {};
    e.forEach(entry => {
      if (entry.session) {
        if (!sessionBreakdown[entry.session]) sessionBreakdown[entry.session] = { total: 0, wins: 0 };
        sessionBreakdown[entry.session].total++;
        if (entry.result === 'Win') sessionBreakdown[entry.session].wins++;
      }
    });

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

    return {
      totalSetups, taken, missed, wins, losses, be, winRate, avgRR, bestRR, worstRR,
      takenPct, missedPct, bestSetup, mostMissed,
      gradeBreakdown, newsEntries: newsEntries.length, newsWins, newsLosses,
      sessionBreakdown
    };
  };

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
    taken: { label: 'Trade Taken', color: 'bg-[hsl(var(--success))] text-[hsl(var(--success-foreground,0_0%_100%))]', icon: TrendingUp },
    missed: { label: 'Missed Trade', color: 'bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground,0_0%_0%))]', icon: EyeOff },
  };

  const resultColor = (r?: string) => {
    if (r === 'Win') return 'bg-[hsl(var(--success))]/15 text-[hsl(var(--success))] border-[hsl(var(--success))]/30';
    if (r === 'Loss') return 'bg-destructive/15 text-destructive border-destructive/30';
    if (r === 'BE') return 'bg-muted text-muted-foreground border-border';
    return '';
  };

  const gradeColor = (g?: string) => {
    if (g === 'A+') return 'text-[hsl(var(--success))]';
    if (g === 'A') return 'text-primary';
    if (g === 'B') return 'text-[hsl(var(--warning))]';
    if (g === 'C') return 'text-destructive';
    return 'text-muted-foreground';
  };

  // ── No active session ──
  if (!activeSession) {
    return (
      <div className="space-y-6 p-6 max-w-5xl mx-auto">
        <PageHeader title="Manual Backtesting Lab" subtitle="Replay charts externally and log every setup manually">
          <ThemeToggle />
        </PageHeader>

        <Card className="border-border/60">
          <CardContent className="p-6 space-y-5">
            <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
              <Play className="h-4 w-4 text-primary" /> Start New Session
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            </div>
            <Button onClick={startSession} disabled={!pair || !month} className="w-full sm:w-auto gap-2">
              <Play className="h-4 w-4" /> Start Session
            </Button>
          </CardContent>
        </Card>

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

        {renderSummaryDialog()}
      </div>
    );
  }

  // ── Active session ──
  return (
    <div className="space-y-5 p-6 max-w-6xl mx-auto" onPaste={handlePaste}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <FlaskConical className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-heading text-foreground flex items-center gap-2">
              {activeSession.pair}
            </h1>
            <p className="text-xs text-muted-foreground">{activeSession.month} • Session active</p>
          </div>
        </div>
        <Button variant="destructive" size="sm" className="gap-1.5" onClick={() => setShowEndConfirm(true)}>
          <Square className="h-3.5 w-3.5" /> End Session
        </Button>
      </div>

      {/* Live counters */}
      <div className="grid grid-cols-3 sm:grid-cols-7 gap-3">
        {[
          { label: 'Total', value: stats.total, icon: BarChart3, cls: 'text-foreground' },
          { label: 'Valid', value: stats.valid, icon: CheckCircle2, cls: 'text-primary' },
          { label: 'Taken', value: stats.taken, icon: TrendingUp, cls: 'text-[hsl(var(--success))]' },
          { label: 'Untriggered Setup', value: stats.missed, icon: EyeOff, cls: 'text-[hsl(var(--warning))]' },
          { label: 'Wins', value: stats.wins, icon: TrendingUp, cls: 'text-[hsl(var(--success))]' },
          { label: 'Losses', value: stats.losses, icon: TrendingDown, cls: 'text-destructive' },
          { label: 'BE', value: stats.be, icon: Clock, cls: 'text-muted-foreground' },
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

      {/* Quick log buttons - 3 only */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Quick Log</p>
          <div className="grid grid-cols-3 gap-3">
            {(['valid', 'taken', 'missed'] as const).map(type => {
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
                    <div className="flex items-center gap-2">
                      {entry.setupType && <p className="text-xs font-medium text-foreground">{entry.setupType}</p>}
                      {entry.grade && <span className={`text-[10px] font-bold ${gradeColor(entry.grade)}`}>{entry.grade}</span>}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {entry.day}
                      {entry.rr !== undefined ? ` • ${entry.rr}R` : ''}
                      {entry.entryTimeframe ? ` • ${entry.entryTimeframe}` : ''}
                    </p>
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
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" onPaste={handlePaste}>
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
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{customSetups.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Entry Timeframe</Label>
                <Select value={entryForm.entryTimeframe} onValueChange={v => setEntryForm(f => ({ ...f, entryTimeframe: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select TF" /></SelectTrigger>
                  <SelectContent>{ENTRY_TIMEFRAMES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground flex items-center gap-1"><Star className="h-3 w-3" /> Trade Grade</Label>
                <Select value={entryForm.grade} onValueChange={(v: string) => setEntryForm(f => ({ ...f, grade: v as typeof f.grade }))}>
                  <SelectTrigger><SelectValue placeholder="Grade" /></SelectTrigger>
                  <SelectContent>{GRADES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
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

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Session</Label>
                <Select value={entryForm.session} onValueChange={v => setEntryForm(f => ({ ...f, session: v }))}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{SESSIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Emotion</Label>
                <Select value={entryForm.emotionBefore} onValueChange={v => setEntryForm(f => ({ ...f, emotionBefore: v }))}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{EMOTIONS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground flex items-center gap-1"><Newspaper className="h-3 w-3" /> News Present</Label>
                <Select value={entryForm.newsPresent} onValueChange={(v: string) => setEntryForm(f => ({ ...f, newsPresent: v as typeof f.newsPresent }))}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{NEWS_OPTIONS.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Confluences</Label>
                <Input type="number" placeholder="Count" value={entryForm.confluenceCount}
                  onChange={e => setEntryForm(f => ({ ...f, confluenceCount: e.target.value }))} />
              </div>
            </div>

            {entryForm.newsPresent && entryForm.newsPresent !== 'None' && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">News Details</Label>
                <Input placeholder="e.g. NFP in 10 min" value={entryForm.newsDetails}
                  onChange={e => setEntryForm(f => ({ ...f, newsDetails: e.target.value }))} />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Notes</Label>
              <Textarea placeholder="Optional notes..." value={entryForm.notes} rows={2}
                onChange={e => setEntryForm(f => ({ ...f, notes: e.target.value }))} />
            </div>

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
                {expandedEntry.grade && <div><span className="text-muted-foreground text-xs">Grade</span><p className={`font-bold ${gradeColor(expandedEntry.grade)}`}>{expandedEntry.grade}</p></div>}
                {expandedEntry.entryTimeframe && <div><span className="text-muted-foreground text-xs">Entry TF</span><p className="font-medium text-foreground">{expandedEntry.entryTimeframe}</p></div>}
                {expandedEntry.session && <div><span className="text-muted-foreground text-xs">Session</span><p className="font-medium text-foreground">{expandedEntry.session}</p></div>}
                {expandedEntry.newsPresent && expandedEntry.newsPresent !== 'None' && (
                  <div><span className="text-muted-foreground text-xs">News</span><p className="font-medium text-foreground">{expandedEntry.newsPresent}</p></div>
                )}
                {expandedEntry.confluenceCount !== undefined && (
                  <div><span className="text-muted-foreground text-xs">Confluences</span><p className="font-medium font-mono text-foreground">{expandedEntry.confluenceCount}</p></div>
                )}
              </div>
              {expandedEntry.newsDetails && (
                <div><span className="text-muted-foreground text-xs">News Details</span><p className="text-sm text-foreground mt-1">{expandedEntry.newsDetails}</p></div>
              )}
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

      {renderSummaryDialog()}
    </div>
  );

  function renderSummaryDialog() {
    if (!summarySession) return null;
    const ss = computeSessionStats(summarySession);
    return (
      <Dialog open={showSummary} onOpenChange={setShowSummary}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <BarChart3 className="h-5 w-5 text-primary" />
              Session Summary — {summarySession.pair}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            {/* Core stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: 'Total Setups', value: ss.totalSetups },
                { label: 'Trades Taken', value: `${ss.taken} (${ss.takenPct}%)` },
                { label: 'Missed Trades', value: `${ss.missed} (${ss.missedPct}%)` },
                { label: 'Win Rate', value: `${ss.winRate}%` },
                { label: 'Avg RR', value: ss.avgRR },
                { label: 'W / L / BE', value: `${ss.wins} / ${ss.losses} / ${ss.be}` },
                { label: 'Best RR', value: `${ss.bestRR}R` },
                { label: 'Worst RR', value: `${ss.worstRR}R` },
              ].map(item => (
                <div key={item.label} className="bg-muted/30 rounded-lg p-3 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{item.label}</p>
                  <p className="text-lg font-bold font-mono text-foreground">{item.value}</p>
                </div>
              ))}
            </div>

            {/* Grade breakdown */}
            {Object.keys(ss.gradeBreakdown).length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <Star className="h-4 w-4 text-primary" /> Grade Breakdown
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {GRADES.map(g => {
                    const data = ss.gradeBreakdown[g];
                    if (!data) return null;
                    const wr = data.total > 0 ? ((data.wins / data.total) * 100).toFixed(0) : '0';
                    return (
                      <div key={g} className="bg-muted/20 rounded-lg p-3 text-center border border-border/30">
                        <p className={`text-lg font-bold ${gradeColor(g)}`}>{g}</p>
                        <p className="text-xs text-muted-foreground">{data.total} trades • {wr}% WR</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Session breakdown */}
            {Object.keys(ss.sessionBreakdown).length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-primary" /> Session Performance
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(ss.sessionBreakdown).map(([session, data]) => {
                    const wr = data.total > 0 ? ((data.wins / data.total) * 100).toFixed(0) : '0';
                    return (
                      <div key={session} className="bg-muted/20 rounded-lg p-3 text-center border border-border/30">
                        <p className="text-xs font-semibold text-foreground">{session}</p>
                        <p className="text-xs text-muted-foreground">{data.total} trades • {wr}% WR</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* News impact */}
            {ss.newsEntries > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <Newspaper className="h-4 w-4 text-primary" /> News Impact
                </h3>
                <div className="bg-muted/20 rounded-lg p-3 border border-border/30 text-sm text-muted-foreground">
                  <p>{ss.newsEntries} trades near news events — <span className="text-[hsl(var(--success))] font-semibold">{ss.newsWins}W</span> / <span className="text-destructive font-semibold">{ss.newsLosses}L</span></p>
                </div>
              </div>
            )}

            {/* Edge insights */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-[hsl(var(--warning))]" /> Edge Insights
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
                {Object.keys(ss.gradeBreakdown).length > 0 && (() => {
                  const aPlus = ss.gradeBreakdown['A+'];
                  const a = ss.gradeBreakdown['A'];
                  const topGrades = (aPlus?.total || 0) + (a?.total || 0);
                  const total = ss.totalSetups;
                  if (total > 0 && topGrades > 0) {
                    return <p className="text-muted-foreground">⭐ A+ & A trades: <span className="font-medium text-foreground">{topGrades}/{total}</span> ({((topGrades / total) * 100).toFixed(0)}% of total)</p>;
                  }
                  return null;
                })()}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
}
