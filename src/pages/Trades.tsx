import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Trash2, Edit, ExternalLink, ChevronDown, ChevronUp, LayoutGrid, List, Filter } from 'lucide-react';
import { useTrading } from '@/contexts/TradingContext';
import { PageHeader } from '@/components/shared/MetricCard';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { Button } from '@/components/ui/button';
import { TradeFormDialog } from '@/components/trades/TradeFormDialog';
import { TradeDetailSheet } from '@/components/trades/TradeDetailSheet';
import { TradeEntryGate } from '@/components/trades/TradeEntryGate';
import { TradeGalleryView } from '@/components/trades/TradeGalleryView';
import { Trade } from '@/types/trading';
import { getDayOfWeek } from '@/lib/calculations';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function Trades() {
  const { trades, deleteTrade } = useTrading();
  const [searchParams] = useSearchParams();
  const [showGate, setShowGate] = useState(searchParams.get('new') === 'true');
  const [showForm, setShowForm] = useState(false);
  const [editTrade, setEditTrade] = useState<Trade | null>(null);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [sortField, setSortField] = useState<'date' | 'profitLoss'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'table' | 'gallery'>('table');

  // Filters
  const [filterPair, setFilterPair] = useState<string>('all');
  const [filterResult, setFilterResult] = useState<string>('all');

  const uniquePairs = useMemo(() => [...new Set(trades.map(t => t.asset))].sort(), [trades]);

  const filtered = useMemo(() => {
    return trades.filter(t => {
      if (filterPair !== 'all' && t.asset !== filterPair) return false;
      if (filterResult !== 'all' && t.result !== filterResult) return false;
      return true;
    });
  }, [trades, filterPair, filterResult]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const mult = sortDir === 'desc' ? -1 : 1;
      if (sortField === 'date') return mult * (new Date(a.date).getTime() - new Date(b.date).getTime());
      return mult * (a.profitLoss - b.profitLoss);
    });
  }, [filtered, sortField, sortDir]);

  const toggleSort = (field: 'date' | 'profitLoss') => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const SortIcon = ({ field }: { field: 'date' | 'profitLoss' }) => {
    if (sortField !== field) return null;
    return sortDir === 'desc' ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />;
  };

  const resultBadge = (result: string) => {
    const styles: Record<string, string> = {
      Win: 'bg-success/15 text-success border border-success/30',
      Loss: 'bg-destructive/15 text-destructive border border-destructive/30',
      Breakeven: 'bg-muted text-muted-foreground border border-border',
      Missed: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/25',
      Cancelled: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/25',
    };
    return <span className={cn('px-2 py-0.5 rounded text-xs font-medium', styles[result])}>{result}</span>;
  };

  const hasActiveFilters = filterPair !== 'all' || filterResult !== 'all';

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <PageHeader title="Trades" subtitle={`${filtered.length} of ${trades.length} trades`}>
        <ThemeToggle />
        <Button onClick={() => { setEditTrade(null); setShowGate(true); }} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> Log Trade
        </Button>
      </PageHeader>

      {/* Toolbar: filters + view toggle */}
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filterPair} onValueChange={setFilterPair}>
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <SelectValue placeholder="All Pairs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Pairs</SelectItem>
              {uniquePairs.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterResult} onValueChange={setFilterResult}>
            <SelectTrigger className="h-8 w-[130px] text-xs">
              <SelectValue placeholder="All Results" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Results</SelectItem>
              <SelectItem value="Win">Win</SelectItem>
              <SelectItem value="Loss">Loss</SelectItem>
              <SelectItem value="Breakeven">Breakeven</SelectItem>
              <SelectItem value="Missed">Missed</SelectItem>
              <SelectItem value="Cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground" onClick={() => { setFilterPair('all'); setFilterResult('all'); }}>
              Clear
            </Button>
          )}
        </div>

        <div className="flex items-center bg-muted rounded-lg p-0.5">
          <Button
            variant={viewMode === 'table' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 px-3 text-xs gap-1.5"
            onClick={() => setViewMode('table')}
          >
            <List className="h-3.5 w-3.5" /> Table
          </Button>
          <Button
            variant={viewMode === 'gallery' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 px-3 text-xs gap-1.5"
            onClick={() => setViewMode('gallery')}
          >
            <LayoutGrid className="h-3.5 w-3.5" /> Gallery
          </Button>
        </div>
      </div>

      {/* Table View */}
      {viewMode === 'table' && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-3 py-2 text-xs font-medium text-muted-foreground cursor-pointer" onClick={() => toggleSort('date')}>
                    <span className="flex items-center gap-1">Date <SortIcon field="date" /></span>
                  </th>
                  <th className="px-3 py-2 text-xs font-medium text-muted-foreground">Day</th>
                  <th className="px-3 py-2 text-xs font-medium text-muted-foreground">Pair</th>
                  <th className="px-3 py-2 text-xs font-medium text-muted-foreground">Setup</th>
                  <th className="px-3 py-2 text-xs font-medium text-muted-foreground">Session</th>
                  <th className="px-3 py-2 text-xs font-medium text-muted-foreground">Dir</th>
                  <th className="px-3 py-2 text-xs font-medium text-muted-foreground font-mono">Qty</th>
                  <th className="px-3 py-2 text-xs font-medium text-muted-foreground font-mono">RR</th>
                  <th className="px-3 py-2 text-xs font-medium text-muted-foreground font-mono cursor-pointer" onClick={() => toggleSort('profitLoss')}>
                    <span className="flex items-center gap-1">P/L <SortIcon field="profitLoss" /></span>
                  </th>
                  <th className="px-3 py-2 text-xs font-medium text-muted-foreground">Result</th>
                  <th className="px-3 py-2 text-xs font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-3 py-12 text-center text-muted-foreground">
                      No trades logged yet. Click "Log Trade" to get started.
                    </td>
                  </tr>
                ) : (
                  sorted.map(trade => (
                    <tr
                      key={trade.id}
                      className="border-b border-border/50 hover:bg-accent/50 cursor-pointer transition-colors h-8"
                      onClick={() => setSelectedTrade(trade)}
                    >
                      <td className="px-3 py-1.5 font-mono text-xs">{trade.date}</td>
                      <td className="px-3 py-1.5 text-xs text-muted-foreground">{getDayOfWeek(trade.date).slice(0, 3)}</td>
                      <td className="px-3 py-1.5 font-medium text-xs">{trade.asset}</td>
                      <td className="px-3 py-1.5 text-xs">{trade.setup}</td>
                      <td className="px-3 py-1.5 text-xs text-muted-foreground">{trade.session}</td>
                      <td className="px-3 py-1.5 text-xs">
                        <span className={trade.direction === 'Long' ? 'text-success' : 'text-destructive'}>{trade.direction}</span>
                      </td>
                      <td className="px-3 py-1.5 font-mono text-xs">{trade.quantity ?? '-'}</td>
                      <td className="px-3 py-1.5 font-mono text-xs">{trade.actualRR?.toFixed(2) ?? '-'}</td>
                      <td className={cn('px-3 py-1.5 font-mono text-xs font-medium',
                        trade.result === 'Missed' || trade.result === 'Cancelled' ? 'text-muted-foreground' :
                        trade.profitLoss >= 0 ? 'text-success' : 'text-destructive')}>
                        {trade.result === 'Missed' || trade.result === 'Cancelled' ? '—' : `${trade.profitLoss >= 0 ? '+' : ''}${trade.profitLoss.toFixed(2)}`}
                      </td>
                      <td className="px-3 py-1.5">{resultBadge(trade.result)}</td>
                      <td className="px-3 py-1.5">
                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditTrade(trade); setShowForm(true); }}>
                            <Edit className="h-3 w-3" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive">
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Trade</AlertDialogTitle>
                                <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteTrade(trade.id)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                          {trade.chartLink && (
                            <a href={trade.chartLink} target="_blank" rel="noopener noreferrer" className="text-primary">
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Gallery View */}
      {viewMode === 'gallery' && (
        <TradeGalleryView trades={sorted} onSelectTrade={setSelectedTrade} />
      )}

      <TradeEntryGate
        open={showGate}
        onPass={() => { setShowGate(false); setShowForm(true); }}
        onCancel={() => setShowGate(false)}
      />
      <TradeFormDialog open={showForm} onOpenChange={setShowForm} editTrade={editTrade} />
      <TradeDetailSheet trade={selectedTrade} onClose={() => setSelectedTrade(null)} />
    </div>
  );
}
