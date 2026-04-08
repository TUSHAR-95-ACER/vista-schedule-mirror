import { useEffect, useMemo, useState } from 'react';
import { useTrading } from '@/contexts/TradingContext';
import { useAuth } from '@/contexts/AuthContext';
import { UnifiedMediaBox } from '@/components/shared/UnifiedMediaBox';
import { PageHeader, MetricCard } from '@/components/shared/MetricCard';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, BookOpen, Eye, Edit, X, Check, TrendingUp, TrendingDown, Minus } from 'lucide-react';
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
  const [editingId, setEditingId] = useState<string | null>(null);

  const emptyForm = {
    date: new Date().toISOString().split('T')[0],
    pair: '', category: '', bias: '', keyLevels: '', notes: '', image: '',
  };
  const [form, setForm] = useState(emptyForm);
  const [filterCat, setFilterCat] = useState('all');
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { setEntries([]); return; }
    setEntries(loadUserStorage<NotebookEntry[]>(STORAGE_KEY, user.id, []));
  }, [user]);

  const save = (updated: NotebookEntry[]) => {
    setEntries(updated);
    if (user) saveUserStorage(STORAGE_KEY, user.id, updated);
  };

  const handleAdd = () => {
    if (!form.pair || !form.category) return;
    if (editingId) {
      save(entries.map(e => e.id === editingId ? { ...e, ...form } : e));
      setEditingId(null);
    } else {
      const entry: NotebookEntry = { id: crypto.randomUUID(), ...form, createdAt: new Date().toISOString() };
      save([entry, ...entries]);
    }
    setForm(emptyForm);
  };

  const startEdit = (entry: NotebookEntry) => {
    setEditingId(entry.id);
    setForm({
      date: entry.date, pair: entry.pair, category: entry.category,
      bias: entry.bias, keyLevels: entry.keyLevels, notes: entry.notes, image: entry.image || '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
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

  const stats = useMemo(() => {
    const catCount = new Map<string, number>();
    entries.forEach(e => catCount.set(e.category, (catCount.get(e.category) || 0) + 1));
    const mostCommon = catCount.size > 0 ? [...catCount.entries()].sort((a, b) => b[1] - a[1])[0] : null;
    const missed = entries.filter(e => e.category === 'Missed Trade' || e.category === 'Opportunity Not Taken').length;
    return { total: entries.length, mostCommon: mostCommon?.[0] || '-', missed };
  }, [entries]);

  const biasIcon = (bias: string) => {
    if (bias.toLowerCase().includes('bull')) return <TrendingUp className="h-3 w-3 text-success" />;
    if (bias.toLowerCase().includes('bear')) return <TrendingDown className="h-3 w-3 text-destructive" />;
    return <Minus className="h-3 w-3 text-muted-foreground" />;
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

  return (
    <div className="p-4 lg:p-6 max-w-[1600px] mx-auto">
      <PageHeader title="Notebook" subtitle="Document observations, patterns & missed opportunities">
        <ThemeToggle />
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <MetricCard label="Total Entries" value={stats.total} />
        <MetricCard label="Most Common" value={stats.mostCommon} />
        <MetricCard label="Missed Opportunities" value={stats.missed} trend={stats.missed > 0 ? 'down' : 'neutral'} />
        <MetricCard label="Categories" value={notebookCategories.length} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4 h-fit shadow-sm" onPaste={handlePaste}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <div className={cn('h-8 w-8 rounded-xl flex items-center justify-center', editingId ? 'bg-warning/10' : 'bg-primary/10')}>
                {editingId ? <Edit className="h-4 w-4 text-warning" /> : <Plus className="h-4 w-4 text-primary" />}
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wide">{editingId ? 'Edit Entry' : 'New Entry'}</h3>
            </div>
            {editingId && (
              <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={cancelEdit}>
                <X className="h-3 w-3 mr-1" /> Cancel
              </Button>
            )}
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
            <Select value={form.bias || 'none'} onValueChange={v => setForm(f => ({ ...f, bias: v === 'none' ? '' : v }))}>
              <SelectTrigger className="h-9 text-xs mt-1.5 rounded-xl"><SelectValue placeholder="Select bias" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="Bullish">Bullish</SelectItem>
                <SelectItem value="Bearish">Bearish</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-medium text-muted-foreground">Key Levels</Label>
            <Textarea value={form.keyLevels} onChange={e => setForm(f => ({ ...f, keyLevels: e.target.value }))} className="text-xs min-h-[60px] mt-1.5 rounded-xl" placeholder="Support / Resistance levels" />
          </div>
          <div>
            <Label className="text-xs font-medium text-muted-foreground">Notes</Label>
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="text-xs min-h-[80px] mt-1.5 rounded-xl" placeholder="Observations, context..." />
          </div>

          <UnifiedMediaBox
            value={form.image}
            onChange={v => setForm(f => ({ ...f, image: v }))}
            label="Chart / Media"
            maxPreviewHeight="200px"
          />

          <Button onClick={handleAdd} className="w-full gap-1.5 rounded-xl h-10">
            {editingId ? <><Check className="h-4 w-4" /> Update Entry</> : <><Plus className="h-4 w-4" /> Save Entry</>}
          </Button>
        </div>

        {/* Entries List */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filter chips */}
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
                <div key={entry.id} className={cn(
                  'bg-card border rounded-2xl overflow-hidden transition-all hover:shadow-lg group',
                  editingId === entry.id ? 'border-warning/40 ring-1 ring-warning/20' : 'border-border hover:border-primary/20'
                )}>
                  <div className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* Bias indicator circle */}
                        <div className={cn(
                          'h-11 w-11 rounded-xl flex items-center justify-center shrink-0 text-xs font-black tracking-tight',
                          entry.bias.toLowerCase().includes('bull') ? 'bg-success/10 text-success border border-success/20' :
                          entry.bias.toLowerCase().includes('bear') ? 'bg-destructive/10 text-destructive border border-destructive/20' :
                          'bg-muted text-muted-foreground border border-border'
                        )}>
                          {entry.pair.substring(0, 3)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold tracking-tight">{entry.pair}</span>
                            <span className={cn('px-2.5 py-0.5 rounded-full text-[10px] font-semibold border', categoryColor(entry.category))}>
                              {entry.category}
                            </span>
                            <div className="flex items-center gap-1">
                              {biasIcon(entry.bias)}
                              <span className={cn('text-xs font-semibold',
                                entry.bias.toLowerCase().includes('bull') ? 'text-success' :
                                entry.bias.toLowerCase().includes('bear') ? 'text-destructive' : 'text-muted-foreground'
                              )}>{entry.bias}</span>
                            </div>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-1 font-mono">
                            {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            {entry.keyLevels && <span className="ml-2 text-foreground/60">· {entry.keyLevels}</span>}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        {entry.image && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => setExpandedEntry(expandedEntry === entry.id ? null : entry.id)}>
                            <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg opacity-0 group-hover:opacity-100 text-primary" onClick={() => startEdit(entry)}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg opacity-0 group-hover:opacity-100 text-destructive" onClick={() => save(entries.filter(e => e.id !== entry.id))}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    {entry.notes && (
                      <p className="text-xs text-muted-foreground/80 mt-3 leading-relaxed pl-[56px] border-l-2 border-border/50 ml-5">{entry.notes}</p>
                    )}
                  </div>
                  {/* Expanded Image */}
                  {expandedEntry === entry.id && entry.image && (
                    <div className="border-t border-border/50 p-4 bg-muted/5">
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
