import { useEffect, useMemo, useState } from 'react';
import { useTrading } from '@/contexts/TradingContext';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader, MetricCard } from '@/components/shared/MetricCard';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Trash2, BookOpen, Edit, Check, TrendingUp, TrendingDown, Minus, FileText, ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { loadUserStorage, saveUserStorage } from '@/lib/userStorage';
import { AIInsightsPanel } from '@/components/shared/AIInsightsPanel';
import { adaptNotebook } from '@/lib/aiInsightAdapters';
import { RichJournalBlock, type RichJournalValue } from '@/components/shared/RichJournalBlock';
import { coerceRichJournal, emptyJournal, serializeJournal } from '@/lib/journalData';

interface NotebookEntry {
  id: string;
  date: string;
  pair: string;
  category: string;
  bias: string;
  /** Legacy fields kept for back-compat with old saved entries. */
  keyLevels?: string;
  notes?: string;
  image?: string;
  /** New unified Notion-style journal value. */
  journal?: RichJournalValue;
  createdAt: string;
}

const STORAGE_KEY = 'ef_notebook_entries';
const BIAS_OPTIONS = ['Bullish', 'Bearish', 'Sideways', 'Neutral'] as const;

const todayISO = () => new Date().toISOString().split('T')[0];

const emptyForm = (): NotebookEntry => ({
  id: '',
  date: todayISO(),
  pair: '',
  category: '',
  bias: '',
  journal: emptyJournal(),
  createdAt: '',
});

export default function Notebook() {
  const { user } = useAuth();
  const { notebookCategories } = useTrading();
  const [entries, setEntries] = useState<NotebookEntry[]>([]);
  const [filterCat, setFilterCat] = useState('all');
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState<NotebookEntry>(emptyForm());
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!user) { setEntries([]); return; }
    setEntries(loadUserStorage<NotebookEntry[]>(STORAGE_KEY, user.id, []));
  }, [user]);

  const persist = (updated: NotebookEntry[]) => {
    setEntries(updated);
    if (user) saveUserStorage(STORAGE_KEY, user.id, updated);
  };

  const openNew = () => {
    setDraft(emptyForm());
    setIsEditing(false);
    setEditorOpen(true);
  };

  const openEdit = (entry: NotebookEntry) => {
    setDraft({
      ...entry,
      journal: coerceRichJournal(entry.journal, entry.notes, entry.image),
    });
    setIsEditing(true);
    setEditorOpen(true);
  };

  const saveDraft = () => {
    if (!draft.pair || !draft.category) return;
    const journal = serializeJournal(draft.journal || emptyJournal());
    if (isEditing) {
      persist(entries.map(e => e.id === draft.id ? {
        ...e,
        date: draft.date,
        pair: draft.pair,
        category: draft.category,
        bias: draft.bias,
        journal,
        // Clear legacy fields once migrated
        notes: undefined,
        keyLevels: undefined,
        image: undefined,
      } : e));
    } else {
      const entry: NotebookEntry = {
        id: crypto.randomUUID(),
        date: draft.date,
        pair: draft.pair,
        category: draft.category,
        bias: draft.bias,
        journal,
        createdAt: new Date().toISOString(),
      };
      persist([entry, ...entries]);
    }
    setEditorOpen(false);
  };

  const deleteEntry = (id: string) => persist(entries.filter(e => e.id !== id));

  const filtered = filterCat === 'all' ? entries : entries.filter(e => e.category === filterCat);

  const stats = useMemo(() => {
    const catCount = new Map<string, number>();
    entries.forEach(e => catCount.set(e.category, (catCount.get(e.category) || 0) + 1));
    const mostCommon = catCount.size > 0 ? [...catCount.entries()].sort((a, b) => b[1] - a[1])[0] : null;
    const missed = entries.filter(e => e.category === 'Missed Trade' || e.category === 'Opportunity Not Taken').length;
    return { total: entries.length, mostCommon: mostCommon?.[0] || '-', missed };
  }, [entries]);

  const biasIcon = (bias: string) => {
    if (bias === 'Bullish') return <TrendingUp className="h-3 w-3 text-success" />;
    if (bias === 'Bearish') return <TrendingDown className="h-3 w-3 text-destructive" />;
    if (bias === 'Sideways') return <Minus className="h-3 w-3 text-warning" />;
    return null;
  };

  const categoryColor = (cat: string) => {
    const colors: Record<string, string> = {
      'Pattern': 'bg-primary/15 text-primary border-primary/30',
      'Missed Trade': 'bg-amber-500/15 text-amber-500 border-amber-500/30',
      'Opportunity Not Taken': 'bg-success/15 text-success border-success/30',
      'Observation': 'bg-blue-500/15 text-blue-500 border-blue-500/30',
      'News Reaction': 'bg-destructive/15 text-destructive border-destructive/30',
      'Safe Entry': 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30',
      'Re-Entry After Loss': 'bg-purple-500/15 text-purple-500 border-purple-500/30',
    };
    return colors[cat] || 'bg-muted text-muted-foreground border-border';
  };

  const previewOf = (e: NotebookEntry): { text: string; thumb?: string } => {
    const j = coerceRichJournal(e.journal, e.notes, e.image);
    const firstImg = j.media.find(m => m.type === 'image')?.url;
    const text = (j.text || '').trim().slice(0, 220);
    return { text, thumb: firstImg };
  };

  return (
    <div className="p-4 lg:p-6 max-w-[1600px] mx-auto">
      <PageHeader title="Notebook" subtitle="A flexible research notebook for ideas, observations & patterns">
        <Button onClick={openNew} className="gap-1.5 rounded-xl h-9">
          <Plus className="h-4 w-4" /> New Notebook Entry
        </Button>
        <ThemeToggle />
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <MetricCard label="Total Entries" value={stats.total} />
        <MetricCard label="Most Common" value={stats.mostCommon} />
        <MetricCard label="Missed Opportunities" value={stats.missed} trend={stats.missed > 0 ? 'down' : 'neutral'} />
        <MetricCard label="Categories" value={notebookCategories.length} />
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 flex-wrap mb-5">
        <Button variant={filterCat === 'all' ? 'default' : 'outline'} size="sm" className="text-xs h-8 rounded-xl" onClick={() => setFilterCat('all')}>All</Button>
        {notebookCategories.map(c => (
          <Button key={c} variant={filterCat === c ? 'default' : 'outline'} size="sm" className="text-xs h-8 rounded-xl" onClick={() => setFilterCat(c)}>{c}</Button>
        ))}
      </div>

      {/* Entries grid */}
      {filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-16 text-center text-muted-foreground">
          <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm mb-4">No entries yet. Start documenting your research.</p>
          <Button onClick={openNew} className="gap-1.5 rounded-xl"><Plus className="h-4 w-4" /> New Notebook Entry</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
          {filtered.map(entry => {
            const { text, thumb } = previewOf(entry);
            return (
              <article
                key={entry.id}
                onClick={() => openEdit(entry)}
                className="group cursor-pointer bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/30 hover:shadow-lg transition-all"
              >
                {thumb ? (
                  <div className="aspect-[16/9] bg-muted overflow-hidden">
                    <img src={thumb} alt="" className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform" />
                  </div>
                ) : (
                  <div className="aspect-[16/9] bg-muted/30 flex items-center justify-center">
                    <FileText className="h-8 w-8 text-muted-foreground/40" />
                  </div>
                )}
                <div className="p-4 space-y-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold tracking-tight">{entry.pair}</span>
                    <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-semibold border', categoryColor(entry.category))}>
                      {entry.category}
                    </span>
                    {entry.bias && entry.bias !== 'Neutral' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
                        {biasIcon(entry.bias)} {entry.bias}
                      </span>
                    )}
                  </div>
                  {text && (
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{text}</p>
                  )}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-primary" onClick={(e) => { e.stopPropagation(); openEdit(entry); }}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-destructive" onClick={(e) => { e.stopPropagation(); deleteEntry(entry.id); }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <AIInsightsPanel
        page="Notebook"
        payload={adaptNotebook(entries.map(e => ({
          category: e.category,
          pair: e.pair,
          date: e.date,
          title: `${e.pair} ${e.category}`,
          content: coerceRichJournal(e.journal, e.notes, e.image).text,
        })))}
      />

      {/* === Notebook Entry Editor — Notion-style === */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-[88vw] w-[88vw] sm:max-w-[88vw] max-h-[92vh] overflow-y-auto p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-3 border-b border-border/50">
            <DialogTitle className="text-base font-bold uppercase tracking-wide flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              {isEditing ? 'Edit Notebook Entry' : 'New Notebook Entry'}
            </DialogTitle>
          </DialogHeader>

          {/* Compact metadata header */}
          <div className="px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-3 border-b border-border/50 bg-muted/10">
            <div>
              <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Date</Label>
              <Input type="date" value={draft.date} onChange={e => setDraft(d => ({ ...d, date: e.target.value }))} className="h-9 text-xs mt-1.5 rounded-lg" />
            </div>
            <div>
              <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Pair *</Label>
              <Input value={draft.pair} onChange={e => setDraft(d => ({ ...d, pair: e.target.value }))} placeholder="EURUSD" className="h-9 text-xs mt-1.5 rounded-lg" />
            </div>
            <div>
              <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Category *</Label>
              <Select value={draft.category} onValueChange={v => setDraft(d => ({ ...d, category: v }))}>
                <SelectTrigger className="h-9 text-xs mt-1.5 rounded-lg"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {notebookCategories.map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Bias <span className="text-muted-foreground/60 normal-case font-normal">(optional)</span></Label>
              <Select value={draft.bias || 'none'} onValueChange={v => setDraft(d => ({ ...d, bias: v === 'none' ? '' : v }))}>
                <SelectTrigger className="h-9 text-xs mt-1.5 rounded-lg"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {BIAS_OPTIONS.map(b => <SelectItem key={b} value={b} className="text-xs">{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Single flexible Notion-style writing surface */}
          <div className="px-6 py-5 bg-background">
            <RichJournalBlock
              title="Research Notes"
              scope={`notebook/${draft.id || 'new'}`}
              value={draft.journal || emptyJournal()}
              onChange={(v) => setDraft(d => ({ ...d, journal: v }))}
              placeholder="Start writing… paste screenshots, drop charts, attach video. Mix text and media freely."
              accept="both"
              className="border-0 shadow-none p-0 bg-transparent"
            />
            <p className="text-[10px] text-muted-foreground mt-3 flex items-center gap-1.5">
              <ImageIcon className="h-3 w-3" /> Tip: paste screenshots, drag-drop images/video, or use Add media — everything saves into one journal page.
            </p>
          </div>

          <DialogFooter className="px-6 py-4 border-t border-border/50 bg-muted/10 sm:justify-between">
            <Button variant="ghost" onClick={() => setEditorOpen(false)} className="text-xs">Cancel</Button>
            <Button onClick={saveDraft} disabled={!draft.pair || !draft.category} className="gap-1.5 rounded-xl">
              {isEditing ? <><Check className="h-4 w-4" /> Update Entry</> : <><Plus className="h-4 w-4" /> Save Entry</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
