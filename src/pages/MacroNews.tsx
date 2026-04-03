import { useState } from 'react';
import { useMacroNewsContext } from '@/contexts/MacroNewsContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { InfoTooltip } from '@/components/shared/InfoTooltip';
import { CalendarIcon, RefreshCw, Clock, Loader2, Plus, X, Settings2, ExternalLink, Newspaper } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { DateFilter } from '@/hooks/useMacroNews';

export default function MacroNews() {
  const {
    pairs, activePair, setActivePair,
    addPair, removePair,
    dateFilter, setDateFilter,
    customDate, setCustomDate,
    calendarEvents, news,
    loading, newsLoading, refresh,
  } = useMacroNewsContext();

  const [newPairInput, setNewPairInput] = useState('');
  const [managePairsOpen, setManagePairsOpen] = useState(false);

  const handleAddPair = () => {
    if (newPairInput.length >= 6) {
      addPair(newPairInput);
      setNewPairInput('');
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Economic Calendar</h1>
          <p className="text-sm text-muted-foreground">Real-time high-impact economic events filtered by pair</p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4 mr-1", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Pair:</span>
              <div className="flex gap-1 flex-wrap">
                {pairs.map(p => (
                  <Button key={p} size="sm" variant={activePair === p ? 'default' : 'outline'} className={cn("text-xs h-8", activePair !== p && "text-foreground")} onClick={() => setActivePair(p)}>
                    {p}
                  </Button>
                ))}
                <Dialog open={managePairsOpen} onOpenChange={setManagePairsOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="ghost" className="text-xs h-8 px-2">
                      <Settings2 className="h-3.5 w-3.5" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-sm">
                    <DialogHeader><DialogTitle>Manage Pairs</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground font-medium">Active Pairs</p>
                        <div className="flex flex-wrap gap-2">
                          {pairs.map(p => (
                            <Badge key={p} variant="secondary" className="gap-1 pr-1">
                              {p}
                              {pairs.length > 1 && (
                                <button onClick={() => removePair(p)} className="ml-1 hover:text-destructive transition-colors">
                                  <X className="h-3 w-3" />
                                </button>
                              )}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground font-medium">Add New Pair</p>
                        <div className="flex gap-2">
                          <Input value={newPairInput} onChange={e => setNewPairInput(e.target.value.toUpperCase())} placeholder="e.g. USDJPY" className="h-8 text-xs" maxLength={6} onKeyDown={e => e.key === 'Enter' && handleAddPair()} />
                          <Button size="sm" className="h-8" onClick={handleAddPair} disabled={newPairInput.length < 6}><Plus className="h-3.5 w-3.5" /></Button>
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            <div className="h-6 w-px bg-border" />
            <Badge variant="destructive" className="text-[10px] gap-1">🔴 High Impact Only</Badge>
            <div className="h-6 w-px bg-border" />
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Date:</span>
              <div className="flex gap-1">
                {(['today', 'tomorrow'] as DateFilter[]).map(d => (
                  <Button key={d} size="sm" variant={dateFilter === d ? 'default' : 'outline'} className="text-xs h-8 capitalize" onClick={() => setDateFilter(d)}>{d}</Button>
                ))}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button size="sm" variant={dateFilter === 'custom' ? 'default' : 'outline'} className="text-xs h-8">
                      <CalendarIcon className="h-3 w-3 mr-1" />
                      {dateFilter === 'custom' ? format(customDate, 'MMM d') : 'Custom'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={customDate} onSelect={(d) => { if (d) { setCustomDate(d); setDateFilter('custom'); } }} className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Economic Calendar */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            📅 Economic Calendar — {activePair}
            <InfoTooltip text="Real-time high-impact events filtered by pair currencies. Auto-refreshes every 60 seconds." />
            {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {calendarEvents.length === 0 && !loading && (
            <p className="text-sm text-muted-foreground text-center py-8">No high-impact events for this date & pair</p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {calendarEvents.map(event => {
              const hasActual = event.actual && event.actual !== 'N/A';
              return (
                <div key={event.id} className={cn(
                  "border rounded-xl p-4 transition-all",
                  hasActual ? "border-primary/30 bg-primary/5" : "border-destructive/20 bg-destructive/5"
                )}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="destructive" className="text-[10px]">🔴 HIGH</Badge>
                        <Badge variant="outline" className="text-[10px] font-mono">{event.currency}</Badge>
                      </div>
                      <p className="text-sm font-bold text-foreground">{event.title}</p>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground font-mono">
                          {event.date ? format(new Date(event.date), 'HH:mm') : 'TBD'}
                        </span>
                      </div>
                    </div>
                    <div className="text-right space-y-1 shrink-0 min-w-[80px]">
                      <div>
                        <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Expected</div>
                        <div className="text-xs font-bold font-mono text-foreground">{event.forecast}</div>
                      </div>
                      <div>
                        <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Previous</div>
                        <div className="text-xs font-bold font-mono text-foreground">{event.previous}</div>
                      </div>
                      {hasActual && (
                        <div className="pt-1 border-t border-primary/20">
                          <div className="text-[9px] text-primary uppercase tracking-wider font-semibold">Actual</div>
                          <div className="text-sm font-black font-mono text-primary">{event.actual}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Macro News Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Newspaper className="h-4 w-4" />
            Macro News — {activePair}
            <InfoTooltip text="Latest macro-economic news relevant to your selected pair. Filtered for high-impact events only." />
            {newsLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {news.length === 0 && !newsLoading && (
            <p className="text-sm text-muted-foreground text-center py-8">No macro news available. News requires an API key to be configured.</p>
          )}
          <div className="grid grid-cols-1 gap-3">
            {news.map(article => (
              <a
                key={article.id}
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "block border rounded-xl p-4 transition-all hover:bg-accent/50",
                  article.impact === 'high' ? "border-destructive/20 bg-destructive/5" : "border-border"
                )}
              >
                <div className="flex items-start gap-3">
                  {article.imageUrl && (
                    <img src={article.imageUrl} alt="" className="w-20 h-14 rounded-lg object-cover shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={article.impact === 'high' ? 'destructive' : 'secondary'} className="text-[9px] h-4">
                        {article.impact === 'high' ? '🔴 HIGH' : '🟡 MEDIUM'}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">{article.source}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {article.publishedAt ? format(new Date(article.publishedAt), 'MMM d, HH:mm') : ''}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-foreground line-clamp-2">{article.title}</p>
                    {article.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{article.description}</p>
                    )}
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-1" />
                </div>
              </a>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
