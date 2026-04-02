import { useEffect, useRef, useState } from 'react';
import { useUrlPreview } from '@/hooks/useUrlPreview';
import { LinkPreviewList } from '@/components/shared/LinkPreview';
import { UnifiedMediaBox } from '@/components/shared/UnifiedMediaBox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useTrading } from '@/contexts/TradingContext';
import {
  Trade, Market, Session, MarketCondition, TradeDirection, TradeResult,
  TradeManagement, Emotion, Mistake, TradeGrade, TRADE_GRADES,
  ALL_ASSETS, CONFLUENCE_OPTIONS, SETUPS, MARKET_ASSETS, ANALYSIS_ONLY_ASSETS,
} from '@/types/trading';
import { calcActualRR, calcPlannedRR, calcProfitLoss, calcResult } from '@/lib/calculations';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, ChevronDown, ImagePlus, Pencil, Trash2, Upload, X, Clock, TrendingUp, Target, DollarSign, Brain, AlertTriangle, BarChart3, Settings2, Camera, Link, StickyNote, Briefcase } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const SESSIONS: Session[] = ['Asia', 'London', 'New York', 'New York Kill Zone', 'London Close'];
const MARKETS: Market[] = ['Forex', 'Crypto', 'Commodities', 'Indices', 'Stocks', 'Futures'];
const CONDITIONS: MarketCondition[] = ['Trending', 'Ranging', 'Volatile'];
const DIRECTIONS: TradeDirection[] = ['Long', 'Short'];
const MGMT_OPTIONS: TradeManagement[] = ['Moved SL to Breakeven', 'Partial TP', 'Trailing Stop', 'Closed Early', 'Held Full Position', 'Scaled In', 'Scaled Out'];
const EMOTIONS: Emotion[] = ['Confident', 'Fearful', 'Greedy', 'Neutral', 'Anxious', 'Calm'];
const MISTAKES_OPTIONS: Mistake[] = ['FOMO', 'Early Entry', 'Overtrading', 'Emotional', 'Ignored SL'];

const readFileAsDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(file);
});

/* ── Premium Section Card ─────────────────────────────────── */
function FormSection({ title, icon, accent = 'primary', children, className }: {
  title: string; icon: React.ReactNode; accent?: 'primary' | 'success' | 'warning' | 'destructive'; children: React.ReactNode; className?: string;
}) {
  const accentBg = {
    primary: 'from-primary/15 to-primary/5 border-primary/20',
    success: 'from-success/15 to-success/5 border-success/20',
    warning: 'from-warning/15 to-warning/5 border-warning/20',
    destructive: 'from-destructive/15 to-destructive/5 border-destructive/20',
  };
  const dot = { primary: 'bg-primary', success: 'bg-success', warning: 'bg-warning', destructive: 'bg-destructive' };

  return (
    <div className={cn('rounded-xl border border-border/50 bg-card overflow-hidden shadow-[var(--shadow-card)]', className)}>
      <div className={cn('px-4 py-2.5 border-b border-border/30 bg-gradient-to-r flex items-center gap-2.5', accentBg[accent])}>
        <div className={cn('h-1.5 w-1.5 rounded-full', dot[accent])} />
        <span className="text-muted-foreground">{icon}</span>
        <h3 className="font-heading text-[11px] font-bold tracking-wide uppercase text-foreground">{title}</h3>
      </div>
      <div className="p-4 space-y-3">{children}</div>
    </div>
  );
}

/* ── Styled Label ─────────────────────────────────────────── */
function FieldLabel({ children }: { children: React.ReactNode }) {
  return <Label className="text-[10px] font-semibold text-muted-foreground tracking-wide uppercase">{children}</Label>;
}

/* ── Chip Toggle ──────────────────────────────────────────── */
function ChipToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className={cn(
      'flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs cursor-pointer transition-all duration-200',
      checked
        ? 'border-primary/40 bg-primary/10 text-foreground shadow-sm'
        : 'border-border/50 hover:border-primary/20 hover:bg-primary/[0.03] text-muted-foreground'
    )}>
      <Checkbox checked={checked} onCheckedChange={onChange} className="h-3 w-3 rounded" />
      <span className="font-medium">{label}</span>
    </label>
  );
}

/* ── Computed Metric Display ──────────────────────────────── */
function MetricDisplay({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="space-y-1">
      <FieldLabel>{label}</FieldLabel>
      <div className="flex h-9 items-center rounded-lg border border-border/50 bg-muted/30 px-3 text-xs font-mono font-semibold">
        <span className={color}>{value}</span>
      </div>
    </div>
  );
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editTrade: Trade | null;
}

export function TradeFormDialog({ open, onOpenChange, editTrade }: Props) {
  const {
    addTrade, updateTrade, accounts,
    customSetups, customAssets, customConfluences,
    addCustomSetup, updateCustomSetup, deleteCustomSetup,
    addCustomAsset, addCustomConfluence, updateCustomConfluence, deleteCustomConfluence,
  } = useTrading();

  const defaultForm = {
    date: new Date().toISOString().split('T')[0],
    entryTime: '', exitTime: '',
    market: 'Forex' as Market,
    asset: '', direction: 'Long' as TradeDirection,
    session: 'New York' as Session,
    marketCondition: 'Trending' as MarketCondition,
    setup: '',
    quantity: '',
    entryPrice: '', stopLoss: '', takeProfit: '', exitPrice: '',
    fees: '0',
    notes: '', chartLink: '',
    management: [] as TradeManagement[],
    confluences: [] as string[],
    entryConfluences: [] as string[],
    targetConfluences: [] as string[],
    accountAllocations: [] as { accountId: string; riskPercent: number }[],
    result: '' as TradeResult | '',
    predictionImage: '',
    executionImage: '',
    emotion: 'Neutral' as Emotion,
    focus: 3, discipline: 3,
    checklist: { followPlan: false, noFomo: false, noRevenge: false, waitedConfirmation: false, riskRespected: false },
    mistakes: [] as Mistake[],
    grade: '' as TradeGrade | '',
    maxRRReached: '',
    maxAdverseMove: '',
  };

  const [form, setForm] = useState(defaultForm);
  const [newAsset, setNewAsset] = useState('');
  const [newSetup, setNewSetup] = useState('');
  const [newConfluence, setNewConfluence] = useState('');
  const [editingSetup, setEditingSetup] = useState<string | null>(null);
  const [editingSetupValue, setEditingSetupValue] = useState('');
  const [editingConfluence, setEditingConfluence] = useState<string | null>(null);
  const [editingConfluenceValue, setEditingConfluenceValue] = useState('');
  const [setupsOpen, setSetupsOpen] = useState(false);
  const [confluencesOpen, setConfluencesOpen] = useState(false);
  const predictionInputRef = useRef<HTMLInputElement | null>(null);
  const executionInputRef = useRef<HTMLInputElement | null>(null);
  const { previews: notesPreviews, loading: notesLoading, detectAndFetch: detectNotesUrls, removePreview: removeNotesPreview } = useUrlPreview();

  const marketAssets = MARKET_ASSETS[form.market] || [];
  const allAssets = [...new Set([...marketAssets, ...customAssets])].filter(a => !ANALYSIS_ONLY_ASSETS.includes(a));
  const allSetups = [...new Set([...customSetups, form.setup].filter((value): value is string => Boolean(value)))];
  const allConfluences = [...new Set([
    ...customConfluences,
    ...form.entryConfluences,
    ...form.targetConfluences,
  ].filter((value): value is string => Boolean(value)))];

  useEffect(() => {
    if (editTrade) {
      setForm({
        date: editTrade.date,
        entryTime: editTrade.entryTime || '',
        exitTime: editTrade.exitTime || '',
        market: editTrade.market,
        asset: editTrade.asset,
        direction: editTrade.direction,
        session: editTrade.session,
        marketCondition: editTrade.marketCondition,
        setup: editTrade.setup,
        quantity: String(editTrade.quantity || ''),
        entryPrice: String(editTrade.entryPrice),
        stopLoss: String(editTrade.stopLoss),
        takeProfit: String(editTrade.takeProfit),
        exitPrice: editTrade.exitPrice ? String(editTrade.exitPrice) : '',
        fees: String(editTrade.fees || 0),
        notes: editTrade.notes,
        chartLink: editTrade.chartLink || '',
        management: editTrade.management,
        confluences: editTrade.confluences as string[],
        entryConfluences: editTrade.entryConfluences || [],
        targetConfluences: editTrade.targetConfluences || [],
        accountAllocations: editTrade.accounts,
        result: editTrade.result,
        predictionImage: editTrade.predictionImage || '',
        executionImage: editTrade.executionImage || '',
        emotion: editTrade.psychology?.emotion || 'Neutral',
        focus: editTrade.psychology?.focus || 3,
        discipline: editTrade.psychology?.discipline || 3,
        checklist: editTrade.psychology?.checklist || defaultForm.checklist,
        mistakes: editTrade.mistakes,
        grade: editTrade.grade || '',
        maxRRReached: editTrade.maxRRReached !== undefined ? String(editTrade.maxRRReached) : '',
        maxAdverseMove: editTrade.maxAdverseMove !== undefined ? String(editTrade.maxAdverseMove) : '',
      });
    } else {
      setForm(defaultForm);
    }
    setSetupsOpen(false);
    setConfluencesOpen(false);
  }, [editTrade, open]);

  const set = (key: string, val: any) => {
    if (key === 'market') {
      setForm(f => ({ ...f, market: val, asset: '' }));
    } else {
      setForm(f => ({ ...f, [key]: val }));
    }
  };

  const syncConfluenceName = (source: string[], previous: string, next: string) => {
    const mapped = source.map(item => item === previous ? next : item);
    return [...new Set(mapped)];
  };

  const removeConfluenceName = (source: string[], value: string) => source.filter(item => item !== value);

  const addSetupOption = () => {
    const value = newSetup.trim();
    if (!value) return;
    addCustomSetup(value);
    set('setup', value);
    setNewSetup('');
  };

  const addConfluenceOption = () => {
    const value = newConfluence.trim();
    if (!value) return;
    addCustomConfluence(value);
    setForm(f => ({
      ...f,
      entryConfluences: f.entryConfluences.includes(value) ? f.entryConfluences : [...f.entryConfluences, value],
      confluences: f.confluences.includes(value) ? f.confluences : [...f.confluences, value],
    }));
    setNewConfluence('');
  };

  const saveSetupEdit = (previous: string) => {
    const value = editingSetupValue.trim();
    if (!value) return;
    updateCustomSetup(previous, value);
    setForm(f => ({ ...f, setup: f.setup === previous ? value : f.setup }));
    setEditingSetup(null);
    setEditingSetupValue('');
  };

  const removeSetupOption = (value: string) => {
    deleteCustomSetup(value);
    setForm(f => ({ ...f, setup: f.setup === value ? '' : f.setup }));
    if (editingSetup === value) { setEditingSetup(null); setEditingSetupValue(''); }
  };

  const saveConfluenceEdit = (previous: string) => {
    const value = editingConfluenceValue.trim();
    if (!value) return;
    updateCustomConfluence(previous, value);
    setForm(f => {
      const entryConfluences = syncConfluenceName(f.entryConfluences, previous, value);
      const targetConfluences = syncConfluenceName(f.targetConfluences, previous, value);
      return { ...f, entryConfluences, targetConfluences, confluences: [...new Set([...entryConfluences, ...targetConfluences])] };
    });
    setEditingConfluence(null);
    setEditingConfluenceValue('');
  };

  const removeConfluenceOption = (value: string) => {
    deleteCustomConfluence(value);
    setForm(f => {
      const entryConfluences = removeConfluenceName(f.entryConfluences, value);
      const targetConfluences = removeConfluenceName(f.targetConfluences, value);
      return { ...f, entryConfluences, targetConfluences, confluences: [...new Set([...entryConfluences, ...targetConfluences])] };
    });
    if (editingConfluence === value) { setEditingConfluence(null); setEditingConfluenceValue(''); }
  };

  const toggleArrayItem = <T,>(key: string, item: T) => {
    setForm(f => {
      const arr = (f as any)[key] as T[];
      return { ...f, [key]: arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item] };
    });
  };

  const toggleTechnicalPoint = (group: 'entryConfluences' | 'targetConfluences', item: string) => {
    setForm(f => {
      const nextGroup = f[group].includes(item) ? f[group].filter(value => value !== item) : [...f[group], item];
      const confluences = [...new Set([
        ...(group === 'entryConfluences' ? nextGroup : f.entryConfluences),
        ...(group === 'targetConfluences' ? nextGroup : f.targetConfluences),
      ])];
      return { ...f, [group]: nextGroup, confluences };
    });
  };

  const handleImageFile = async (key: 'predictionImage' | 'executionImage', file?: File | null) => {
    if (!file) return;
    const image = await readFileAsDataUrl(file);
    set(key, image);
  };

  const handlePasteImage = async (event: React.ClipboardEvent<HTMLDivElement>, key: 'predictionImage' | 'executionImage') => {
    const file = Array.from(event.clipboardData.files).find(item => item.type.startsWith('image/'));
    if (!file) return;
    event.preventDefault();
    await handleImageFile(key, file);
  };

  const numericEntry = parseFloat(form.entryPrice);
  const numericExit = form.exitPrice ? parseFloat(form.exitPrice) : undefined;
  const numericStop = parseFloat(form.stopLoss);
  const numericTarget = parseFloat(form.takeProfit);
  const numericQuantity = parseFloat(form.quantity) || 0;
  const fees = parseFloat(form.fees) || 0;
  const isMissedOrCancelled = form.result === 'Untriggered Setup' || form.result === 'Cancelled';

  const previewGrossPL = !isMissedOrCancelled && !Number.isNaN(numericEntry) && numericExit !== undefined && !Number.isNaN(numericExit) && numericQuantity > 0
    ? calcProfitLoss(numericEntry, numericExit, form.direction, numericQuantity, form.asset, form.market)
    : 0;
  const previewNetPL = Math.round((previewGrossPL - fees) * 100) / 100;
  const previewPlannedRR = !Number.isNaN(numericEntry) && !Number.isNaN(numericStop) && !Number.isNaN(numericTarget)
    ? calcPlannedRR(numericEntry, numericStop, numericTarget) : 0;
  const previewActualRR = !Number.isNaN(numericEntry) && !Number.isNaN(numericStop) && numericExit !== undefined && !Number.isNaN(numericExit)
    ? calcActualRR(numericEntry, numericStop, numericExit, form.direction) : 0;
  const previewResult = isMissedOrCancelled ? form.result : calcResult(previewNetPL);

  const handleSubmit = () => {
    const entry = parseFloat(form.entryPrice);
    const sl = parseFloat(form.stopLoss);
    const tp = parseFloat(form.takeProfit);
    const exit = form.exitPrice ? parseFloat(form.exitPrice) : undefined;
    const quantity = parseFloat(form.quantity);

    if (!isMissedOrCancelled && (!quantity || quantity <= 0)) {
      toast({ title: 'Quantity is required', description: 'Please enter a valid position size.', variant: 'destructive' });
      return;
    }

    const finalQuantity = isMissedOrCancelled ? (quantity || 0) : quantity;
    const plannedRR = calcPlannedRR(entry, sl, tp);
    const actualRR = exit ? calcActualRR(entry, sl, exit, form.direction) : undefined;
    const grossPL = exit && finalQuantity > 0 ? calcProfitLoss(entry, exit, form.direction, finalQuantity, form.asset, form.market) : 0;
    const finalFees = parseFloat(form.fees) || 0;
    const profitLoss = isMissedOrCancelled ? 0 : Math.round((grossPL - finalFees) * 100) / 100;
    const result: TradeResult = isMissedOrCancelled ? form.result as TradeResult : calcResult(profitLoss);
    const mergedConfluences = [...new Set([...form.entryConfluences, ...form.targetConfluences])];

    const trade: Trade = {
      id: editTrade?.id || crypto.randomUUID(),
      date: form.date,
      entryTime: form.entryTime || undefined,
      exitTime: form.exitTime || undefined,
      market: form.market,
      asset: form.asset,
      direction: form.direction,
      session: form.session,
      marketCondition: form.marketCondition,
      setup: form.setup,
      quantity: finalQuantity,
      entryPrice: entry,
      stopLoss: sl,
      takeProfit: tp,
      exitPrice: exit,
      result,
      plannedRR,
      actualRR,
      profitLoss,
      fees: finalFees,
      notes: form.notes,
      accounts: form.accountAllocations,
      management: form.management,
      confluences: mergedConfluences,
      entryConfluences: form.entryConfluences,
      targetConfluences: form.targetConfluences,
      chartLink: form.chartLink || undefined,
      predictionImage: form.predictionImage || undefined,
      executionImage: form.executionImage || undefined,
      psychology: {
        emotion: form.emotion,
        focus: form.focus,
        discipline: form.discipline,
        checklist: form.checklist,
      },
      mistakes: form.mistakes,
      grade: (form.grade as TradeGrade) || undefined,
      maxRRReached: form.maxRRReached ? parseFloat(form.maxRRReached) : undefined,
      maxAdverseMove: form.maxAdverseMove ? parseFloat(form.maxAdverseMove) : undefined,
    };

    if (editTrade) updateTrade(trade);
    else addTrade(trade);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] p-0 rounded-2xl border-border/50 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-3 border-b border-border/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-primary" />
            <DialogTitle className="font-heading text-base font-extrabold uppercase tracking-[0.12em]">
              {editTrade ? 'Edit Trade' : 'Log New Trade'}
            </DialogTitle>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(92vh-120px)]">
          <div className="px-6 py-5 space-y-5">

            {/* ── TRADE INFO ────────────────────────────────────── */}
            <FormSection title="Trade Info" icon={<Clock className="h-3.5 w-3.5" />}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <FieldLabel>Date</FieldLabel>
                  <Input type="date" value={form.date} onChange={e => set('date', e.target.value)} className="h-9 text-xs rounded-lg" />
                </div>
                <div className="space-y-1">
                  <FieldLabel>Entry Time</FieldLabel>
                  <Input type="time" value={form.entryTime} onChange={e => set('entryTime', e.target.value)} className="h-9 text-xs rounded-lg" />
                </div>
                <div className="space-y-1">
                  <FieldLabel>Exit Time</FieldLabel>
                  <Input type="time" value={form.exitTime} onChange={e => set('exitTime', e.target.value)} className="h-9 text-xs rounded-lg" />
                </div>
                <div className="space-y-1">
                  <FieldLabel>Direction</FieldLabel>
                  <div className="flex gap-1.5">
                    {DIRECTIONS.map(d => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => set('direction', d)}
                        className={cn(
                          'flex-1 h-9 rounded-lg text-xs font-bold uppercase tracking-wide border transition-all',
                          form.direction === d
                            ? d === 'Long' ? 'bg-success/15 border-success/40 text-success' : 'bg-destructive/15 border-destructive/40 text-destructive'
                            : 'border-border/50 text-muted-foreground hover:bg-muted/50'
                        )}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <FieldLabel>Market</FieldLabel>
                  <Select value={form.market} onValueChange={v => set('market', v)}>
                    <SelectTrigger className="h-9 text-xs rounded-lg"><SelectValue /></SelectTrigger>
                    <SelectContent>{MARKETS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <FieldLabel>Asset / Pair</FieldLabel>
                  <Select value={form.asset} onValueChange={v => set('asset', v)}>
                    <SelectTrigger className="h-9 text-xs rounded-lg"><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>{allAssets.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                  </Select>
                  <div className="flex gap-1">
                    <Input placeholder="New asset" value={newAsset} onChange={e => setNewAsset(e.target.value)} className="h-7 text-[10px] rounded-md" />
                    <Button variant="outline" size="sm" className="h-7 text-[10px] px-2 rounded-md" onClick={() => { if (newAsset) { addCustomAsset(newAsset); set('asset', newAsset); setNewAsset(''); } }}>+</Button>
                  </div>
                </div>
                <div className="space-y-1">
                  <FieldLabel>Session</FieldLabel>
                  <Select value={form.session} onValueChange={v => set('session', v)}>
                    <SelectTrigger className="h-9 text-xs rounded-lg"><SelectValue /></SelectTrigger>
                    <SelectContent>{SESSIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <FieldLabel>Condition</FieldLabel>
                  <Select value={form.marketCondition} onValueChange={v => set('marketCondition', v)}>
                    <SelectTrigger className="h-9 text-xs rounded-lg"><SelectValue /></SelectTrigger>
                    <SelectContent>{CONDITIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <FieldLabel>Setup</FieldLabel>
                  <Select value={form.setup} onValueChange={v => set('setup', v)}>
                    <SelectTrigger className="h-9 text-xs rounded-lg"><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>{allSetups.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                  <p className="text-[9px] text-muted-foreground/60">Manage setups in Setup Playbook</p>
                </div>
                <div className="space-y-1">
                  <FieldLabel>Result Override</FieldLabel>
                  <Select value={form.result || 'auto'} onValueChange={v => set('result', v === 'auto' ? '' : v)}>
                    <SelectTrigger className="h-9 text-xs rounded-lg"><SelectValue placeholder="Auto" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto Calculate</SelectItem>
                      <SelectItem value="Untriggered Setup">Untriggered Setup</SelectItem>
                      <SelectItem value="Cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <FieldLabel>Grade</FieldLabel>
                  <Select value={form.grade || 'none'} onValueChange={v => set('grade', v === 'none' ? '' : v)}>
                    <SelectTrigger className="h-9 text-xs rounded-lg"><SelectValue placeholder="Select grade" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No grade</SelectItem>
                      {TRADE_GRADES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </FormSection>

            {/* ── PRICING ───────────────────────────────────────── */}
            <FormSection title="Pricing" icon={<DollarSign className="h-3.5 w-3.5" />} accent="warning">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="space-y-1">
                  <FieldLabel>Entry Price</FieldLabel>
                  <Input type="number" step="any" value={form.entryPrice} onChange={e => set('entryPrice', e.target.value)} className="h-9 text-xs font-mono rounded-lg" />
                </div>
                <div className="space-y-1">
                  <FieldLabel>Stop Loss</FieldLabel>
                  <Input type="number" step="any" value={form.stopLoss} onChange={e => set('stopLoss', e.target.value)} className="h-9 text-xs font-mono rounded-lg" />
                </div>
                <div className="space-y-1">
                  <FieldLabel>Take Profit</FieldLabel>
                  <Input type="number" step="any" value={form.takeProfit} onChange={e => set('takeProfit', e.target.value)} className="h-9 text-xs font-mono rounded-lg" />
                </div>
                <div className="space-y-1">
                  <FieldLabel>Exit Price</FieldLabel>
                  <Input type="number" step="any" value={form.exitPrice} onChange={e => set('exitPrice', e.target.value)} className="h-9 text-xs font-mono rounded-lg" placeholder={isMissedOrCancelled ? 'N/A' : ''} />
                </div>
                <div className="space-y-1">
                  <FieldLabel>Quantity *</FieldLabel>
                  <Input type="number" step="any" min="0" value={form.quantity} onChange={e => set('quantity', e.target.value)} className="h-9 text-xs font-mono rounded-lg" placeholder="Lot / Qty" />
                </div>
              </div>

              {/* Computed Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                <MetricDisplay label="Planned RR" value={previewPlannedRR.toFixed(2)} />
                <MetricDisplay label="Actual RR" value={previewActualRR.toFixed(2)} />
                <div className="space-y-1">
                  <FieldLabel>Fees</FieldLabel>
                  <Input type="number" step="0.01" min="0" value={form.fees} onChange={e => set('fees', e.target.value)} className="h-9 text-xs font-mono rounded-lg" />
                </div>
                <MetricDisplay
                  label="Net P/L"
                  value={isMissedOrCancelled ? '—' : `${previewNetPL >= 0 ? '+' : ''}${previewNetPL.toFixed(2)} · ${previewResult}`}
                  color={previewNetPL >= 0 ? 'text-success' : 'text-destructive'}
                />
              </div>

              {/* RR Behavior Tracking — result-based */}
              {!isMissedOrCancelled && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <FieldLabel>Max Profit Before SL (RR)</FieldLabel>
                    <Input
                      type="number" step="0.01" min="0"
                      value={form.maxRRReached}
                      onChange={e => setForm(f => ({ ...f, maxRRReached: e.target.value, maxAdverseMove: '' }))}
                      disabled={previewResult === 'Win'}
                      className={cn('h-9 text-xs font-mono rounded-lg', previewResult === 'Win' && 'opacity-40 cursor-not-allowed')}
                      placeholder="e.g. 1.5"
                    />
                    <p className="text-[9px] text-muted-foreground/60">
                      {previewResult === 'Win' ? 'Only for losing trades (SL hit)' : 'Highest +RR before SL was hit'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <FieldLabel>Max Drawdown Before TP (RR)</FieldLabel>
                    <Input
                      type="number" step="0.01" min="0"
                      value={form.maxAdverseMove}
                      onChange={e => setForm(f => ({ ...f, maxAdverseMove: e.target.value, maxRRReached: '' }))}
                      disabled={previewResult === 'Loss'}
                      className={cn('h-9 text-xs font-mono rounded-lg', previewResult === 'Loss' && 'opacity-40 cursor-not-allowed')}
                      placeholder="e.g. 0.4"
                    />
                    <p className="text-[9px] text-muted-foreground/60">
                      {previewResult === 'Loss' ? 'Only for winning trades (TP hit)' : 'Max adverse move before TP hit'}
                    </p>
                  </div>
                </div>
              )}
            </FormSection>

            {/* ── TECHNICAL POINTS ──────────────────────────────── */}
            <FormSection title="Technical Points" icon={<Target className="h-3.5 w-3.5" />}>
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground mb-2 uppercase tracking-wide">For Entry</p>
                  <div className="flex flex-wrap gap-1.5">
                    {allConfluences.map(c => (
                      <ChipToggle key={`entry-${c}`} label={c} checked={form.entryConfluences.includes(c)} onChange={() => toggleTechnicalPoint('entryConfluences', c)} />
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground mb-2 uppercase tracking-wide">For Target</p>
                  <div className="flex flex-wrap gap-1.5">
                    {allConfluences.map(c => (
                      <ChipToggle key={`target-${c}`} label={c} checked={form.targetConfluences.includes(c)} onChange={() => toggleTechnicalPoint('targetConfluences', c)} />
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Input placeholder="Add technical option" value={newConfluence} onChange={e => setNewConfluence(e.target.value)} className="h-8 text-xs rounded-lg" />
                  <Button type="button" variant="outline" size="sm" className="h-8 px-3 text-xs rounded-lg font-semibold" onClick={addConfluenceOption}>Add</Button>
                </div>
                <Collapsible open={confluencesOpen} onOpenChange={setConfluencesOpen}>
                  <CollapsibleTrigger asChild>
                    <Button type="button" variant="ghost" size="sm" className="h-7 w-full justify-between text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                      Manage Technical Points <ChevronDown className={`h-3 w-3 transition-transform ${confluencesOpen ? 'rotate-180' : ''}`} />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-1 space-y-1.5 rounded-lg border border-border/50 bg-muted/20 p-2 animate-in slide-in-from-top-1">
                    {allConfluences.map(confluence => (
                      <div key={confluence} className="flex items-center gap-2 rounded-lg border border-border/50 bg-card px-3 py-1.5">
                        {editingConfluence === confluence ? (
                          <>
                            <Input value={editingConfluenceValue} onChange={e => setEditingConfluenceValue(e.target.value)} className="h-7 text-xs rounded-md" />
                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => saveConfluenceEdit(confluence)}><Check className="h-3.5 w-3.5" /></Button>
                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingConfluence(null); setEditingConfluenceValue(''); }}><X className="h-3.5 w-3.5" /></Button>
                          </>
                        ) : (
                          <>
                            <span className="flex-1 text-xs font-medium">{confluence}</span>
                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingConfluence(confluence); setEditingConfluenceValue(confluence); }}><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeConfluenceOption(confluence)}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </>
                        )}
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </FormSection>

            {/* ── TRADE MANAGEMENT ──────────────────────────────── */}
            <FormSection title="Trade Management" icon={<Settings2 className="h-3.5 w-3.5" />}>
              <div className="flex flex-wrap gap-1.5">
                {MGMT_OPTIONS.map(m => (
                  <ChipToggle key={m} label={m} checked={form.management.includes(m)} onChange={() => toggleArrayItem('management', m)} />
                ))}
              </div>
            </FormSection>

            {/* ── ACCOUNT ALLOCATION ────────────────────────────── */}
            {accounts.length > 0 && (
              <FormSection title="Account Allocation" icon={<Briefcase className="h-3.5 w-3.5" />}>
                <div className="space-y-2">
                  {accounts.map(acc => {
                    const alloc = form.accountAllocations.find(a => a.accountId === acc.id);
                    return (
                      <div key={acc.id} className="flex items-center gap-3 rounded-lg border border-border/40 px-3 py-2">
                        <Checkbox
                          checked={!!alloc}
                          onCheckedChange={(checked) => {
                            if (checked) set('accountAllocations', [...form.accountAllocations, { accountId: acc.id, riskPercent: 1 }]);
                            else set('accountAllocations', form.accountAllocations.filter(a => a.accountId !== acc.id));
                          }}
                          className="h-3.5 w-3.5 rounded"
                        />
                        <span className="text-xs font-medium flex-1">{acc.name}</span>
                        {alloc && (
                          <div className="flex items-center gap-1">
                            <Input
                              type="number" step="0.1" min="0" max="100"
                              value={alloc.riskPercent}
                              onChange={e => set('accountAllocations', form.accountAllocations.map(a => a.accountId === acc.id ? { ...a, riskPercent: parseFloat(e.target.value) || 0 } : a))}
                              className="h-7 w-16 text-xs font-mono rounded-md"
                            />
                            <span className="text-xs text-muted-foreground font-semibold">%</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </FormSection>
            )}

            {/* ── CHARTS & NOTES ─────────────────────────────────── */}
            <FormSection title="Charts & Notes" icon={<Camera className="h-3.5 w-3.5" />}>
              <div className="space-y-1">
                <FieldLabel>TradingView Link</FieldLabel>
                <div className="flex items-center gap-2">
                  <Link className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <Input value={form.chartLink} onChange={e => set('chartLink', e.target.value)} className="h-9 text-xs rounded-lg" placeholder="https://www.tradingview.com/..." />
                </div>
              </div>

              <div className="space-y-1">
                <FieldLabel>Notes</FieldLabel>
                <Textarea value={form.notes} onChange={e => { set('notes', e.target.value); detectNotesUrls(e.target.value); }} className="text-xs min-h-[60px] rounded-lg" placeholder="Trade notes... Paste URLs for auto-preview" />
                <LinkPreviewList previews={notesPreviews} loading={notesLoading} onRemove={removeNotesPreview} />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <UnifiedMediaBox
                  value={form.predictionImage}
                  onChange={v => set('predictionImage', v)}
                  label="Prediction Chart"
                  maxPreviewHeight="200px"
                />
                <UnifiedMediaBox
                  value={form.executionImage}
                  onChange={v => set('executionImage', v)}
                  label="Execution Chart"
                  maxPreviewHeight="200px"
                />
              </div>
            </FormSection>

            {/* ── PSYCHOLOGY ──────────────────────────────────────── */}
            <FormSection title="Psychology" icon={<Brain className="h-3.5 w-3.5" />} accent="primary">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <FieldLabel>Emotion</FieldLabel>
                  <Select value={form.emotion} onValueChange={v => set('emotion', v)}>
                    <SelectTrigger className="h-9 text-xs rounded-lg"><SelectValue /></SelectTrigger>
                    <SelectContent>{EMOTIONS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <FieldLabel>Focus (1-5)</FieldLabel>
                  <Input type="number" min={1} max={5} value={form.focus} onChange={e => set('focus', parseInt(e.target.value) || 3)} className="h-9 text-xs rounded-lg" />
                </div>
                <div className="space-y-1">
                  <FieldLabel>Discipline (1-5)</FieldLabel>
                  <Input type="number" min={1} max={5} value={form.discipline} onChange={e => set('discipline', parseInt(e.target.value) || 3)} className="h-9 text-xs rounded-lg" />
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {Object.entries(form.checklist).map(([key, val]) => (
                  <ChipToggle
                    key={key}
                    label={key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
                    checked={val}
                    onChange={() => set('checklist', { ...form.checklist, [key]: !val })}
                  />
                ))}
              </div>
            </FormSection>

            {/* ── MISTAKES ───────────────────────────────────────── */}
            <FormSection title="Mistakes" icon={<AlertTriangle className="h-3.5 w-3.5" />} accent="destructive">
              <div className="flex flex-wrap gap-1.5">
                {MISTAKES_OPTIONS.map(m => (
                  <ChipToggle key={m} label={m} checked={form.mistakes.includes(m)} onChange={() => toggleArrayItem('mistakes', m)} />
                ))}
              </div>
            </FormSection>

            {/* ── SUBMIT ─────────────────────────────────────────── */}
            <Button onClick={handleSubmit} className="w-full h-11 rounded-xl font-heading font-bold text-sm uppercase tracking-wide shadow-sm">
              {editTrade ? 'Update Trade' : 'Save Trade'}
            </Button>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
