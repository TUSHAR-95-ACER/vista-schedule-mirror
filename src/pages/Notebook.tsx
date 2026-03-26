import { useState, useMemo } from 'react';
import { useTrading } from '@/contexts/TradingContext';
import { PageHeader, MetricCard } from '@/components/shared/MetricCard';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, BookOpen, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NotebookEntry {
  id: string;
  date: string;
  pair: string;
  category: string;
  bias: string;
  keyLevels: string;
  notes: string;
  createdAt: string;
}

const STORAGE_KEY = 'ef_notebook_entries';

function loadEntries(): NotebookEntry[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}

function getSampleEntries(categories: string[]): NotebookEntry[] {
  const samples: NotebookEntry[] = [
    { id: crypto.randomUUID(), date: '2026-03-19', pair: 'XAUUSD', category: 'Pattern', bias: 'Bullish', keyLevels: '2340 support, 2365 resistance', notes: 'Double bottom forming at 2340 with bullish divergence on RSI. Expecting push to 2365.', createdAt: new Date().toISOString() },
    { id: crypto.randomUUID(), date: '2026-03-18', pair: 'EURUSD', category: 'Missed Trade', bias: 'Bearish', keyLevels: '1.0850 - 1.0920', notes: 'Clear bearish OB rejection at 1.0920 but was away during London session. Would have been a clean short.', createdAt: new Date().toISOString() },
    { id: crypto.randomUUID(), date: '2026-03-17', pair: 'GBPUSD', category: 'Opportunity Not Taken', bias: 'Bullish', keyLevels: '1.2650 support', notes: 'Liquidity sweep below 1.2650 followed by bullish engulfing. Hesitated and missed 80 pip move.', createdAt: new Date().toISOString() },
    { id: crypto.randomUUID(), date: '2026-03-14', pair: 'NAS100', category: 'Observation', bias: 'Neutral', keyLevels: '18500 - 18800 range', notes: 'NAS100 consolidating in tight range. Waiting for breakout above 18800 or breakdown below 18500 for directional bias.', createdAt: new Date().toISOString() },
    { id: crypto.randomUUID(), date: '2026-03-13', pair: 'XAUUSD', category: 'News Reaction', bias: 'Bullish', keyLevels: '2320 - 2350', notes: 'CPI came in hot, gold spiked to 2350 then pulled back. Initial reaction was bullish but follow-through was weak.', createdAt: new Date().toISOString() },
    { id: crypto.randomUUID(), date: '2026-03-12', pair: 'USDJPY', category: 'Pattern', bias: 'Bearish', keyLevels: '152.00 resistance', notes: 'Triple top at 152.00 with bearish divergence. Expecting pullback to 150.50 area.', createdAt: new Date().toISOString() },
  ];
  return samples;
}

export default function Notebook() {
  const { notebookCategories } = useTrading();
  const [entries, setEntries] = useState<NotebookEntry[]>(() => {
    const loaded = loadEntries();
    if (loaded.length > 0) return loaded;
    const samples = getSampleEntries(notebookCategories);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(samples));
    return samples;
  });

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    pair: '', category: '', bias: '', keyLevels: '', notes: '',
  });
  const [filterCat, setFilterCat] = useState('all');

  const save = (updated: NotebookEntry[]) => { setEntries(updated); localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); };

  const handleAdd = () => {
    if (!form.pair || !form.category) return;
    const entry: NotebookEntry = { id: crypto.randomUUID(), ...form, createdAt: new Date().toISOString() };
    save([entry, ...entries]);
    setForm({ date: new Date().toISOString().split('T')[0], pair: '', category: '', bias: '', keyLevels: '', notes: '' });
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
        <div className="bg-card border border-border rounded-lg p-4 space-y-3 h-fit">
          <h3 className="text-sm font-semibold uppercase">New Entry</h3>
          <div><Label className="text-xs">Date</Label><Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="h-8 text-xs" /></div>
          <div><Label className="text-xs">Pair</Label><Input value={form.pair} onChange={e => setForm(f => ({ ...f, pair: e.target.value }))} className="h-8 text-xs" placeholder="EURUSD, XAUUSD..." /></div>
          <div>
            <Label className="text-xs">Category</Label>
            <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {notebookCategories.map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">Bias</Label><Input value={form.bias} onChange={e => setForm(f => ({ ...f, bias: e.target.value }))} className="h-8 text-xs" placeholder="Bullish / Bearish / Neutral" /></div>
          <div><Label className="text-xs">Key Levels</Label><Textarea value={form.keyLevels} onChange={e => setForm(f => ({ ...f, keyLevels: e.target.value }))} className="text-xs min-h-[60px]" placeholder="Support / Resistance levels" /></div>
          <div><Label className="text-xs">Notes</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="text-xs min-h-[80px]" placeholder="Observations, context..." /></div>
          <Button onClick={handleAdd} className="w-full gap-1.5"><Plus className="h-4 w-4" /> Save Entry</Button>
        </div>

        <div className="lg:col-span-2 space-y-3">
          <div className="flex gap-2 flex-wrap">
            <Button variant={filterCat === 'all' ? 'default' : 'outline'} size="sm" className="text-xs h-7" onClick={() => setFilterCat('all')}>All</Button>
            {notebookCategories.map(c => (
              <Button key={c} variant={filterCat === c ? 'default' : 'outline'} size="sm" className="text-xs h-7" onClick={() => setFilterCat(c)}>{c}</Button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="bg-card border border-border rounded-lg p-12 text-center text-muted-foreground">
              <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No entries yet. Start documenting your observations.</p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Pair</th>
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Date</th>
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Category</th>
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Bias</th>
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Notes</th>
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(entry => (
                    <tr key={entry.id} className="border-b border-border/50 hover:bg-accent/50 group">
                      <td className="px-4 py-2.5 text-xs font-medium">{entry.pair}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                      <td className="px-4 py-2.5">
                        <span className={cn('px-2 py-0.5 rounded text-[10px] font-medium',
                          entry.category === 'Pattern' ? 'bg-primary/10 text-primary' :
                          entry.category === 'Missed Trade' ? 'bg-amber-500/10 text-amber-600' :
                          entry.category === 'Opportunity Not Taken' ? 'bg-success/10 text-success' :
                          entry.category === 'News Reaction' ? 'bg-destructive/10 text-destructive' :
                          'bg-muted text-muted-foreground'
                        )}>{entry.category}</span>
                      </td>
                      <td className={cn('px-4 py-2.5 text-xs font-medium',
                        entry.bias.toLowerCase().includes('bull') ? 'text-success' :
                        entry.bias.toLowerCase().includes('bear') ? 'text-destructive' : 'text-muted-foreground'
                      )}>{entry.bias}</td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground max-w-[300px] truncate">{entry.notes}</td>
                      <td className="px-4 py-2.5">
                        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => save(entries.filter(e => e.id !== entry.id))}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
