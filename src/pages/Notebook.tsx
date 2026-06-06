import { useEffect, useMemo, useState } from 'react';
import { useTrading } from '@/contexts/TradingContext';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader, MetricCard } from '@/components/shared/MetricCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Trash2, BookOpen, Edit, Check, TrendingUp, TrendingDown, Minus, FileText, ImageIcon, ArrowLeft, Library } from 'lucide-react';
import { cn } from '@/lib/utils';
import { loadUserStorage, saveUserStorage } from '@/lib/userStorage';
import { AIInsightsPanel } from '@/components/shared/AIInsightsPanel';
import { adaptNotebook } from '@/lib/aiInsightAdapters';
import { RichJournalBlock, type RichJournalValue } from '@/components/shared/RichJournalBlock';
import { coerceRichJournal, emptyJournal, serializeJournal, journalPlainText } from '@/lib/journalData';
import { refreshSignedUrls } from '@/lib/journalUpload';
import { useAICoach } from '@/contexts/AICoachContext';
import { saveDraft as saveLocalDraft, loadDraft as loadLocalDraft, clearDraft as clearLocalDraft } from '@/lib/draftStorage';
import { toast } from '@/hooks/use-toast';

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
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState<NotebookEntry>(emptyForm());
  const [isEditing, setIsEditing] = useState(false);
  const { setNote: setAINote } = useAICoach();

  useEffect(() => {
    if (!user) { setEntries([]); return; }
    const loaded = loadUserStorage<NotebookEntry[]>(STORAGE_KEY, user.id, []);
    setEntries(loaded);

    // Re-sign expired Supabase Storage URLs so historical notebook thumbnails render
    // instead of breaking. Runs once per mount; legacy data-URL images are untouched.
    let cancelled = false;
    (async () => {
      const refreshed = await Promise.all(loaded.map(async (e) => {
        const j = coerceRichJournal(e.journal, e.notes, e.image);
        const needsRefresh = j.media.some(m => m.path && !m.legacy);
        if (!needsRefresh) return e;
        try {
          const media = await refreshSignedUrls(j.media);
          return { ...e, journal: { text: j.text, media } };
        } catch {
          return e;
        }
      }));
      if (!cancelled) setEntries(refreshed);
    })();
    return () => { cancelled = true; };
  }, [user]);

  // Register the open notebook entry as AI Coach context
  useEffect(() => {
    if (editorOpen && (draft.pair || draft.category)) {
      const text = journalPlainText(coerceRichJournal(draft.journal, draft.notes, draft.image));
      const lbl = `Note • ${draft.pair || 'Untitled'} • ${draft.category || 'no category'} • ${draft.date}`;
      const detail = `Open notebook entry:
- Pair: ${draft.pair || 'n/a'}
- Category: ${draft.category || 'n/a'}
- Bias: ${draft.bias || 'n/a'}
- Date: ${draft.date}
- Research notes: ${text.slice(0, 1500)}`;
      setAINote({ label: lbl, detail });
    } else if (!editorOpen) {
      setAINote(null);
    }
    return () => { setAINote(null); };
  }, [editorOpen, draft, setAINote]);

  const persist = (updated: NotebookEntry[]) => {
    setEntries(updated);
    if (user) saveUserStorage(STORAGE_KEY, user.id, updated);
  };

  const DRAFT_SCOPE = 'notebook-new';

  const openNew = () => {
    let initial = emptyForm();
    if (user) {
      const saved = loadLocalDraft<NotebookEntry>(DRAFT_SCOPE, user.id);
      if (saved?.data && (saved.data.pair || saved.data.category || journalPlainText(saved.data.journal))) {
        initial = saved.data;
        toast({ title: 'Draft restored', description: 'We recovered your unsaved notebook draft.' });
      }
    }
    setDraft(initial);
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

  // Auto-persist new-entry drafts to localStorage so refresh/crash never loses work.
  useEffect(() => {
    if (!editorOpen || isEditing || !user) return;
    const hasContent = draft.pair || draft.category || draft.bias || journalPlainText(draft.journal);
    if (!hasContent) return;
    const t = setTimeout(() => saveLocalDraft(DRAFT_SCOPE, user.id, draft), 600);
    return () => clearTimeout(t);
  }, [draft, editorOpen, isEditing, user]);

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
    if (user && !isEditing) clearLocalDraft(DRAFT_SCOPE, user.id);
    setEditorOpen(false);
  };

  const deleteEntry = (id: string) => persist(entries.filter(e => e.id !== id));

  const filtered = openCategory ? entries.filter(e => e.category === openCategory) : entries;

  // Library data: group entries by category. Guarded so a single malformed
  // journal entry can never blank-screen the whole page.
  const library = useMemo(() => {
    try {
      const cats = Array.isArray(notebookCategories) ? notebookCategories : [];
      const byCat = new Map<string, NotebookEntry[]>();
      cats.forEach(c => byCat.set(c, []));
      entries.forEach(e => {
        const list = byCat.get(e.category) || [];
        list.push(e);
        byCat.set(e.category, list);
      });
      return [...byCat.entries()]
        .map(([category, list]) => {
          const sorted = [...list].sort((a, b) => (b.createdAt || b.date).localeCompare(a.createdAt || a.date));
          const lastUpdated = sorted[0]?.createdAt || sorted[0]?.date || '';
          let cover: string | undefined;
          for (const e of sorted) {
            try { const p = previewOf(e); if (p.thumb) { cover = p.thumb; break; } } catch { /* skip broken entries */ }
          }
          return { category, count: list.length, lastUpdated, cover };
        })
        .sort((a, b) => (b.count - a.count) || a.category.localeCompare(b.category));
    } catch (err) {
      console.warn('[Notebook] library compute failed', err);
      return [] as { category: string; count: number; lastUpdated: string; cover?: string }[];
    }
  }, [entries, notebookCategories]);

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
    const text = journalPlainText(j).slice(0, 220);
    return { text, thumb: firstImg };
  };

  return (
    <div className="p-4 lg:px-3 sm:px-4 py-3 w-full">
      <PageHeader title="Notebook" subtitle="A flexible research notebook for ideas, observations & patterns">
        <Button onClick={openNew} className="gap-1.5 rounded-xl h-9">
          <Plus className="h-4 w-4" /> New Notebook Entry
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <MetricCard label="Total Entries" value={stats.total} />
        <MetricCard label="Most Common" value={stats.mostCommon} />
        <MetricCard label="Missed Opportunities" value={stats.missed} trend={stats.missed > 0 ? 'down' : 'neutral'} />
        <MetricCard label="Categories" value={notebookCategories.length} />
      </div>

      {/* LEVEL 1 — Notebook Library (covers grid). LEVEL 2 — open a single notebook's notes. */}
      {!openCategory ? (
        library.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-16 text-center text-muted-foreground">
            <Library className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm mb-4">No notebooks yet. Add a category in Control Center, then create your first entry.</p>
            <Button onClick={openNew} className="gap-1.5 rounded-xl"><Plus className="h-4 w-4" /> New Notebook Entry</Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
            {library.map(({ category, count, lastUpdated, cover }) => (
              <button
                key={category}
                type="button"
                onClick={() => setOpenCategory(category)}
                className="group relative text-left rounded-xl overflow-hidden bg-gradient-to-br from-card via-card to-muted/30 border border-border/60 shadow-[0_4px_20px_-8px_hsl(var(--foreground)/0.15)] hover:shadow-[0_12px_40px_-12px_hsl(var(--primary)/0.35)] hover:-translate-y-1 hover:border-primary/40 transition-all duration-300 aspect-[3/4] flex flex-col"
              >
                {/* spine */}
                <span className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-primary/70 via-primary/40 to-primary/70 shadow-[2px_0_8px_-2px_hsl(var(--primary)/0.6)]" />
                {/* cover image */}
                <div className="relative flex-1 bg-muted/40 overflow-hidden">
                  {cover ? (
                    <img src={cover} alt="" className="w-full h-full object-cover opacity-90 group-hover:scale-[1.04] transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="h-12 w-12 text-muted-foreground/30" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
                  <span className={cn('absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-[10px] font-bold border backdrop-blur-md', categoryColor(category))}>
                    {count} {count === 1 ? 'note' : 'notes'}
                  </span>
                </div>
                {/* spine label */}
                <div className="p-3.5 pl-5">
                  <h3 className="font-heading font-bold text-sm leading-tight tracking-tight line-clamp-2">{category}</h3>
                  <p className="text-[10px] text-muted-foreground mt-1 font-mono">
                    {lastUpdated ? `Updated ${new Date(lastUpdated).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : 'No notes yet'}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )
      ) : (
        <>
          {/* LEVEL 2 header */}
          <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => setOpenCategory(null)} className="gap-1.5">
                <ArrowLeft className="h-4 w-4" /> Library
              </Button>
              <div>
                <h2 className="font-heading text-lg font-bold tracking-tight flex items-center gap-2">
                  <span className={cn('px-2 py-0.5 rounded-md text-[11px] font-bold border', categoryColor(openCategory))}>{openCategory}</span>
                </h2>
                <p className="text-xs text-muted-foreground">{filtered.length} {filtered.length === 1 ? 'note' : 'notes'} in this notebook</p>
              </div>
            </div>
            <Button onClick={() => { setDraft({ ...emptyForm(), category: openCategory }); setIsEditing(false); setEditorOpen(true); }} className="gap-1.5 rounded-xl h-9" size="sm">
              <Plus className="h-4 w-4" /> Add to {openCategory}
            </Button>
          </div>

      {/* Entries grid (LEVEL 2 → click a note opens LEVEL 3 editor) */}
      {filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-16 text-center text-muted-foreground">
          <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm mb-4">No notes in this notebook yet.</p>
          <Button onClick={() => { setDraft({ ...emptyForm(), category: openCategory }); setIsEditing(false); setEditorOpen(true); }} className="gap-1.5 rounded-xl"><Plus className="h-4 w-4" /> New Note</Button>
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
                  <div className="aspect-[16/9] bg-muted overflow-hidden relative">
                    <img
                      src={thumb}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
                      loading="lazy"
                      onError={(e) => {
                        const img = e.currentTarget;
                        // Try legacy fallback first, then hide and show placeholder.
                        if (entry.image && img.src !== entry.image) {
                          img.src = entry.image;
                          return;
                        }
                        // eslint-disable-next-line no-console
                        console.warn('[Notebook] image failed to load', { id: entry.id, src: thumb });
                        img.style.display = 'none';
                        const parent = img.parentElement;
                        if (parent && !parent.querySelector('[data-fallback]')) {
                          const fb = document.createElement('div');
                          fb.setAttribute('data-fallback', '');
                          fb.className = 'absolute inset-0 flex items-center justify-center text-[10px] text-muted-foreground bg-muted/40';
                          fb.textContent = 'Image unavailable';
                          parent.appendChild(fb);
                        }
                      }}
                    />
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
        </>
      )}



      <AIInsightsPanel
        page="Notebook"
        payload={adaptNotebook(entries.map(e => ({
          category: e.category,
          pair: e.pair,
          date: e.date,
          title: `${e.pair} ${e.category}`,
          content: journalPlainText(coerceRichJournal(e.journal, e.notes, e.image)),
        })))}
      />

      {/* === Notebook Entry Editor — Notion-style === */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-[96vw] w-[96vw] sm:max-w-[96vw] max-h-[94vh] overflow-y-auto p-0 gap-0">
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
