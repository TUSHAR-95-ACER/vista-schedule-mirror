import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Trash2, Edit, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { useTrading } from '@/contexts/TradingContext';
import { PageHeader } from '@/components/shared/MetricCard';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { Button } from '@/components/ui/button';
import { TradeFormDialog } from '@/components/trades/TradeFormDialog';
import { TradeDetailSheet } from '@/components/trades/TradeDetailSheet';
import { TradeEntryGate } from '@/components/trades/TradeEntryGate';
import { Trade } from '@/types/trading';
import { getDayOfWeek } from '@/lib/calculations';
import { cn } from '@/lib/utils';
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

  const sorted = useMemo(() => {
    return [...trades].sort((a, b) => {
      const mult = sortDir === 'desc' ? -1 : 1;
      if (sortField === 'date') return mult * (new Date(a.date).getTime() - new Date(b.date).getTime());
      return mult * (a.profitLoss - b.profitLoss);
    });
  }, [trades, sortField, sortDir]);

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

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <PageHeader title="Trades" subtitle={`${trades.length} total trades`}>
        <ThemeToggle />
        <Button onClick={() => { setEditTrade(null); setShowGate(true); }} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> Log Trade
        </Button>
      </PageHeader>

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
