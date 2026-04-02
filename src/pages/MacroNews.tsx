import { useMacroNewsContext } from '@/contexts/MacroNewsContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { InfoTooltip } from '@/components/shared/InfoTooltip';
import { CalendarIcon, RefreshCw, ExternalLink, Clock, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { NewsPair, DateFilter } from '@/hooks/useMacroNews';

export default function MacroNews() {
  const {
    pair, setPair, dateFilter, setDateFilter,
    customDate, setCustomDate,
    calendarEvents, news,
    loading, newsLoading, refresh,
  } = useMacroNewsContext();

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Macro News & Alerts</h1>
          <p className="text-sm text-muted-foreground">High-impact economic events & breaking news for your pairs</p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={loading || newsLoading}>
          <RefreshCw className={cn("h-4 w-4 mr-1", (loading || newsLoading) && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Pair Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Pair:</span>
              <div className="flex gap-1">
                {(['EURUSD', 'GBPUSD', 'XAUUSD'] as NewsPair[]).map(p => (
                  <Button key={p} size="sm" variant={pair === p ? 'default' : 'outline'} className="text-xs h-8" onClick={() => setPair(p)}>
                    {p}
                  </Button>
                ))}
              </div>
            </div>

            <div className="h-6 w-px bg-border" />

            {/* Impact */}
            <div className="flex items-center gap-2">
              <Badge variant="destructive" className="text-[10px] gap-1">
                🔴 High Impact Only
              </Badge>
            </div>

            <div className="h-6 w-px bg-border" />

            {/* Date Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Date:</span>
              <div className="flex gap-1">
                {(['today', 'tomorrow'] as DateFilter[]).map(d => (
                  <Button key={d} size="sm" variant={dateFilter === d ? 'default' : 'outline'} className="text-xs h-8 capitalize" onClick={() => setDateFilter(d)}>
                    {d}
                  </Button>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Economic Calendar */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              📅 Economic Calendar
              <InfoTooltip text="Scheduled high-impact economic events from Forex Factory. Shows only red-folder (high impact) events for your selected pair." />
              {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {calendarEvents.length === 0 && !loading && (
              <p className="text-sm text-muted-foreground text-center py-8">No high-impact events for this date & pair</p>
            )}
            {calendarEvents.map(event => (
              <div key={event.id} className="border border-destructive/20 rounded-lg p-3 bg-destructive/5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="destructive" className="text-[10px]">🔴 HIGH</Badge>
                      <Badge variant="outline" className="text-[10px]">{event.currency}</Badge>
                    </div>
                    <p className="text-sm font-semibold text-foreground">{event.title}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-[11px] text-muted-foreground">
                        {event.date ? format(new Date(event.date), 'HH:mm') : 'TBD'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right space-y-0.5 shrink-0">
                    <div className="text-[10px] text-muted-foreground">Expected</div>
                    <div className="text-xs font-semibold text-foreground">{event.forecast}</div>
                    <div className="text-[10px] text-muted-foreground mt-1">Previous</div>
                    <div className="text-xs font-semibold text-foreground">{event.previous}</div>
                    {event.actual && (
                      <>
                        <div className="text-[10px] text-muted-foreground mt-1">Actual</div>
                        <div className="text-xs font-bold text-primary">{event.actual}</div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Breaking News */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              🚨 Breaking News
              <InfoTooltip text="Latest macro/financial headlines from trusted sources (Reuters, Bloomberg, FT, etc.) filtered for your selected pair." />
              {newsLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {news.length === 0 && !newsLoading && (
              <p className="text-sm text-muted-foreground text-center py-8">No breaking news found for this pair</p>
            )}
            {news.map(article => (
              <a key={article.id} href={article.url} target="_blank" rel="noopener noreferrer"
                className="block border border-border rounded-lg p-3 hover:bg-accent/50 transition-colors group">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className="text-[10px]">{article.source}</Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {article.publishedAt ? format(new Date(article.publishedAt), 'MMM d, HH:mm') : ''}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                      {article.title}
                    </p>
                    {article.description && (
                      <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1">{article.description}</p>
                    )}
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </a>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
