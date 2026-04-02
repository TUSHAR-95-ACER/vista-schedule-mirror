import { useEffect, useMemo, useState, useCallback } from 'react';
import { useTrading } from '@/contexts/TradingContext';
import { useAuth } from '@/contexts/AuthContext';
import { useUrlPreview } from '@/hooks/useUrlPreview';
import { LinkPreviewList } from '@/components/shared/LinkPreview';
import { PageHeader, MetricCard } from '@/components/shared/MetricCard';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, BookOpen, Tag, ImagePlus, X, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { loadUserStorage, saveUserStorage } from '@/lib/userStorage';

interface NotebookEntry {
  id: string;
  date: string;
  pair: string;
  category: string;
  bias: string;
  keyLevels: string;
  notes: string;
  image?: string;
  createdAt: string;
}

const STORAGE_KEY = 'ef_notebook_entries';

export default function Notebook() {
  const { user } = useAuth();
  const { notebookCategories } = useTrading();
  const [entries, setEntries] = useState<NotebookEntry[]>([]);

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    pair: '', category: '', bias: '', keyLevels: '', notes: '', image: '',
  });
  const [filterCat, setFilterCat] = useState('all');
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const { previews: formPreviews, loading: formLoading, detectAndFetch: detectFormUrls, removePreview: removeFormPreview } = useUrlPreview();
  const { previews: entryPreviews, loading: entryLoading, detectAndFetch: detectEntryUrls } = useUrlPreview();

  useEffect(() => {
    if (!user) {
      setEntries([]);
      return;
    }

    setEntries(loadUserStorage<NotebookEntry[]>(STORAGE_KEY, user.id, []));
  }, [user]);

  const save = (updated: NotebookEntry[]) => {
    setEntries(updated);
    if (user) saveUserStorage(STORAGE_KEY, user.id, updated);
  };

  const handleAdd = () => {
    if (!form.pair || !form.category) return;
    const entry: NotebookEntry = { id: crypto.randomUUID(), ...form, createdAt: new Date().toISOString() };
    save([entry, ...entries]);
    setForm({ date: new Date().toISOString().split('T')[0], pair: '', category: '', bias: '', keyLevels: '', notes: '', image: '' });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm(f => ({ ...f, image: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (!file) continue;
        const reader = new FileReader();
        reader.onload = () => setForm(f => ({ ...f, image: reader.result as string }));
        reader.readAsDataURL(file);
        e.preventDefault();
        break;
      }
    }
  };

  const filtered = filterCat === 'all' ? entries : entries.filter(e => e.category === filterCat);

  // Dashboard metrics
  const stats = useMemo(() => {
    const catCount = new Map<string, number>();
    entries.forEach(e => catCount.set(e.category, (catCount.get(e.category) || 0) + 1));
    const mostCommon = catCount.size > 0 ? [...catCount.entries()].sort((a, b) => b[1] - a[1])[0] : null;
    const missed = entries.filter(e => e.category === 'Missed Trade' || e.category === 'Opportunity Not Taken').length;
    return { total: entries.length, mostCommon: mostCommon?.[0] || '-', missed };
  }, [entries]);

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <PageHeader title="Notebook" subtitle="Document observations, patterns & missed opportunities">
        <ThemeToggle />
      </PageHeader>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <MetricCard label="Total Entries" value={stats.total} />
        <MetricCard label="Most Common" value={stats.mostCommon} />
        <MetricCard label="Missed Opportunities" value={stats.missed} trend={stats.missed > 0 ? 'down' : 'neutral'} />
        <MetricCard label="Categories" value={notebookCategories.length} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* New Entry Form */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4 h-fit shadow-sm" onPaste={handlePaste}>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Plus className="h-4 w-4 text-primary" />
            </div>
            <h3 className="text-sm font-bold uppercase tracking-wide">New Entry</h3>
          </div>

          <div>
            <Label className="text-xs font-medium text-muted-foreground">Date</Label>
            <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="h-9 text-xs mt-1.5 rounded-xl" />
          </div>
          <div>
            <Label className="text-xs font-medium text-muted-foreground">Pair</Label>
            <Input value={form.pair} onChange={e => setForm(f => ({ ...f, pair: e.target.value }))} className="h-9 text-xs mt-1.5 rounded-xl" placeholder="EURUSD, XAUUSD..." />
          </div>
          <div>
            <Label className="text-xs font-medium text-muted-foreground">Category</Label>
            <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
              <SelectTrigger className="h-9 text-xs mt-1.5 rounded-xl"><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {notebookCategories.map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-medium text-muted-foreground">Bias</Label>
            <Input value={form.bias} onChange={e => setForm(f => ({ ...f, bias: e.target.value }))} className="h-9 text-xs mt-1.5 rounded-xl" placeholder="Bullish / Bearish / Neutral" />
          </div>
          <div>
            <Label className="text-xs font-medium text-muted-foreground">Key Levels</Label>
            <Textarea value={form.keyLevels} onChange={e => setForm(f => ({ ...f, keyLevels: e.target.value }))} className="text-xs min-h-[60px] mt-1.5 rounded-xl" placeholder="Support / Resistance levels" />
          </div>
          <div>
            <Label className="text-xs font-medium text-muted-foreground">Notes</Label>
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="text-xs min-h-[80px] mt-1.5 rounded-xl" placeholder="Observations, context..." />
          </div>

          {/* Image Upload */}
          <div>
            <Label className="text-xs font-medium text-muted-foreground">Chart Screenshot</Label>
            {form.image ? (
              <div className="relative mt-1.5 rounded-xl overflow-hidden border border-border group">
                <img src={form.image} alt="Chart" className="w-full max-h-[200px] object-contain bg-muted/10" />
                <button
                  onClick={() => setForm(f => ({ ...f, image: '' }))}
                  className="absolute top-2 right-2 h-7 w-7 rounded-lg bg-background/90 border border-border/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-destructive hover:text-destructive-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="relative mt-1.5 border-2 border-dashed border-border/50 rounded-xl p-6 text-center cursor-pointer hover:border-primary/40 hover:bg-primary/[0.02] transition-all group/upload">
                <div className="flex flex-col items-center gap-2">
                  <div className="h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center group-hover/upload:bg-primary/10 transition-colors">
                    <ImagePlus className="h-4 w-4 text-muted-foreground group-hover/upload:text-primary transition-colors" />
                  </div>
                  <p className="text-[11px] text-muted-foreground">Drop, paste, or click to upload</p>
                </div>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
              </div>
            )}
          </div>

          <Button onClick={handleAdd} className="w-full gap-1.5 rounded-xl h-10"><Plus className="h-4 w-4" /> Save Entry</Button>
        </div>

        {/* Entries List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Button variant={filterCat === 'all' ? 'default' : 'outline'} size="sm" className="text-xs h-8 rounded-xl" onClick={() => setFilterCat('all')}>All</Button>
            {notebookCategories.map(c => (
              <Button key={c} variant={filterCat === c ? 'default' : 'outline'} size="sm" className="text-xs h-8 rounded-xl" onClick={() => setFilterCat(c)}>{c}</Button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-12 text-center text-muted-foreground">
              <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No entries yet. Start documenting your observations.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(entry => (
                <div key={entry.id} className="bg-card border border-border rounded-2xl overflow-hidden transition-all hover:shadow-md hover:border-primary/10 group">
                  <div className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={cn(
                          'h-10 w-10 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold',
                          entry.bias.toLowerCase().includes('bull') ? 'bg-success/10 text-success' :
                          entry.bias.toLowerCase().includes('bear') ? 'bg-destructive/10 text-destructive' :
                          'bg-muted text-muted-foreground'
                        )}>
                          {entry.pair.substring(0, 3)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold">{entry.pair}</span>
                            <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-semibold',
                              entry.category === 'Pattern' ? 'bg-primary/10 text-primary' :
                              entry.category === 'Missed Trade' ? 'bg-amber-500/10 text-amber-600' :
                              entry.category === 'Opportunity Not Taken' ? 'bg-success/10 text-success' :
                              entry.category === 'News Reaction' ? 'bg-destructive/10 text-destructive' :
                              'bg-muted text-muted-foreground'
                            )}>{entry.category}</span>
                            <span className={cn('text-xs font-medium',
                              entry.bias.toLowerCase().includes('bull') ? 'text-success' :
                              entry.bias.toLowerCase().includes('bear') ? 'text-destructive' : 'text-muted-foreground'
                            )}>{entry.bias}</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                            {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            {entry.keyLevels && <span className="ml-2">· {entry.keyLevels}</span>}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {entry.image && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => setExpandedEntry(expandedEntry === entry.id ? null : entry.id)}>
                            <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg opacity-0 group-hover:opacity-100 text-destructive" onClick={() => save(entries.filter(e => e.id !== entry.id))}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    {entry.notes && (
                      <p className="text-xs text-muted-foreground mt-3 leading-relaxed pl-[52px]">{entry.notes}</p>
                    )}
                  </div>
                  {/* Expanded Image */}
                  {expandedEntry === entry.id && entry.image && (
                    <div className="border-t border-border/50 p-4 bg-muted/10">
                      <img src={entry.image} alt="Chart" className="w-full max-h-[400px] object-contain rounded-xl" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
