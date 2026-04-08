import { useState, useMemo } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Trade, TradeJourneyStep } from '@/types/trading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ExternalLink, Download, ZoomIn, X, ChevronDown, Image, Calendar, Tag, TrendingUp, TrendingDown, Minus, Activity, Brain, Shield, BarChart3, Target, Clock, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getDayOfWeek } from '@/lib/calculations';
import { TradeJourneyTimeline } from './TradeJourneyTimeline';
import { useTrading } from '@/contexts/TradingContext';
import { useMacroNewsContext } from '@/contexts/MacroNewsContext';
import { format } from 'date-fns';
import { Progress } from '@/components/ui/progress';

interface Props {
  trade: Trade | null;
  onClose: () => void;
}

function parseNumericValue(val: string | null | undefined): number | null {
  if (!val || val === 'N/A') return null;
  const cleaned = val.replace(/[%KMB,]/gi, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function getEventImpactBias(event: { title: string; forecast: string; previous: string; actual: string | null; currency: string }) {
  const actual = parseNumericValue(event.actual);
  const forecast = parseNumericValue(event.forecast);
  if (actual === null || forecast === null) return 'neutral';
  const isPositiveForCurrency = actual > forecast;
  if (isPositiveForCurrency) return `bullish_${event.currency?.toUpperCase() || ''}`;
  if (actual < forecast) return `bearish_${event.currency?.toUpperCase() || ''}`;
  return 'neutral';
}

function getBiasLabel(bias: string): { text: string; color: string; icon: typeof TrendingUp } {
  if (bias.startsWith('bullish')) return { text: `Bullish ${bias.split('_')[1] || ''}`, color: 'text-success', icon: TrendingUp };
  if (bias.startsWith('bearish')) return { text: `Bearish ${bias.split('_')[1] || ''}`, color: 'text-destructive', icon: TrendingDown };
  return { text: 'Neutral', color: 'text-muted-foreground', icon: Minus };
}

function InfoCard({ icon: Icon, title, children, className }: { icon: any; title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-border/60 bg-card/50 backdrop-blur-sm p-4 space-y-3 hover:border-border transition-colors", className)}>
      <div className="flex items-center gap-2">
        <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="h-3.5 w-3.5 text-primary" />
        </div>
        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</h4>
      </div>
      {children}
    </div>
  );
}

function DataRow({ label, value, mono, highlight }: { label: string; value: React.ReactNode; mono?: boolean; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-border/10 last:border-0">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className={cn('text-[11px] font-medium', mono && 'font-mono', highlight && 'text-primary font-bold')}>{value}</span>
    </div>
  );
}

export function TradeDetailSheet({ trade, onClose }: Props) {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const { updateTrade, dailyPlans } = useTrading();
  const { calendarEvents, news } = useMacroNewsContext();

  const dailyPlan = trade ? dailyPlans.find(p => p.date === trade.date) : null;

  // Only get news/events images from daily plan
  const newsEventImages = useMemo(() => {
    const imgs: string[] = [];
    if (dailyPlan?.newsItems) {
      dailyPlan.newsItems.forEach(n => {
        if (n.image) imgs.push(n.image);
      });
    }
    return imgs;
  }, [dailyPlan]);

  const tradeDateEvents = useMemo(() => {
    if (!trade) return [];
    return calendarEvents.filter(e => {
      const eventDate = e.date?.split('T')[0] || '';
      return eventDate === trade.date;
    });
  }, [trade, calendarEvents]);

  const topEvents = tradeDateEvents.slice(0, 3);

  const eventBiases = useMemo(() => {
    return topEvents.map(e => ({ ...e, bias: getEventImpactBias(e) }));
  }, [topEvents]);

  const netBias = useMemo(() => {
    const biases = eventBiases.map(e => e.bias);
    const bullish = biases.filter(b => b.startsWith('bullish')).length;
    const bearish = biases.filter(b => b.startsWith('bearish')).length;
    if (bullish > bearish) return 'bullish_USD';
    if (bearish > bullish) return 'bearish_USD';
    return 'neutral';
  }, [eventBiases]);

  if (!trade) return null;

  const handleJourneyUpdate = (journey: TradeJourneyStep[]) => {
    updateTrade({ ...trade, tradeJourney: journey });
  };

  const handleDownload = (src: string, name: string) => {
    const a = document.createElement('a');
    a.href = src;
    a.download = name;
    a.click();
  };

  const isWin = trade.result === 'Win';
  const isLoss = trade.result === 'Loss';
  const resultColor = isWin ? 'text-success' : isLoss ? 'text-destructive' : 'text-muted-foreground';
  const resultBg = isWin ? 'bg-success/10 border-success/30' : isLoss ? 'bg-destructive/10 border-destructive/30' : 'bg-muted/50 border-border';

  return (
    <>
      <Dialog open={!!trade} onOpenChange={onClose}>
        <DialogContent className="max-w-[800px] max-h-[90vh] overflow-y-auto p-0 gap-0 bg-background">
          
          {/* ═══════ TOP SUMMARY BAR ═══════ */}
          <div className="sticky top-0 z-10 bg-card border-b border-border px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="font-heading text-xl font-black tracking-tight">{trade.asset}</h2>
                <Badge className={cn('text-[10px] h-5 font-bold', 
                  trade.direction === 'Long' ? 'bg-success/15 text-success border-success/30' : 'bg-destructive/15 text-destructive border-destructive/30'
                )} variant="outline">
                  {trade.direction}
                </Badge>
                {trade.grade && (
                  <Badge variant="outline" className="text-[10px] h-5 font-bold border-primary/40 text-primary">{trade.grade}</Badge>
                )}
                <Badge className={cn('text-[10px] h-5 font-bold border', resultBg, resultColor)}>
                  {trade.result}
                </Badge>
              </div>
              <span className={cn('font-mono text-xl font-black', resultColor)}>
                {trade.profitLoss >= 0 ? '+' : ''}{trade.profitLoss.toFixed(2)}
              </span>
            </div>
            {/* Day Tags */}
            {trade.dayTags && trade.dayTags.length > 0 && (
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                <Tag className="h-3 w-3 text-warning" />
                {trade.dayTags.map((tag, i) => (
                  <Badge key={i} variant="outline" className="text-[9px] h-4 border-warning/30 text-warning bg-warning/10">{tag}</Badge>
                ))}
              </div>
            )}
          </div>

          {/* ═══════ TWO-COLUMN BODY ═══════ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5">
            
            {/* LEFT: TRADE DATA */}
            <div className="space-y-4">
              <InfoCard icon={Clock} title="Trade Info">
                <DataRow label="Date" value={`${trade.date} (${getDayOfWeek(trade.date)})`} />
                {trade.entryTime && <DataRow label="Entry Time" value={trade.entryTime} mono />}
                {trade.exitTime && <DataRow label="Exit Time" value={trade.exitTime} mono />}
                <DataRow label="Market" value={trade.market} />
                <DataRow label="Session" value={trade.session} />
                <DataRow label="Condition" value={trade.marketCondition} />
                {trade.trend && <DataRow label="Trend" value={trade.trend} />}
                <DataRow label="Setup" value={trade.setup} />
                <DataRow label="Quantity" value={trade.quantity} mono />
              </InfoCard>

              <InfoCard icon={DollarSign} title="Prices">
                <DataRow label="Entry" value={trade.entryPrice} mono highlight />
                <DataRow label="Stop Loss" value={trade.stopLoss} mono />
                <DataRow label="Take Profit" value={trade.takeProfit} mono />
                {trade.exitPrice && <DataRow label="Exit" value={trade.exitPrice} mono highlight />}
              </InfoCard>

              <InfoCard icon={BarChart3} title="Performance">
                <DataRow label="Planned RR" value={trade.plannedRR.toFixed(2)} mono />
                {trade.actualRR !== undefined && (
                  <DataRow label="Actual RR" value={
                    <span className={cn('font-mono', trade.actualRR >= 0 ? 'text-success' : 'text-destructive')}>{trade.actualRR.toFixed(2)}</span>
                  } />
                )}
                {trade.maxRRReached !== undefined && <DataRow label="Max Profit Before SL" value={trade.maxRRReached.toFixed(2)} mono />}
                {trade.maxAdverseMove !== undefined && <DataRow label="Max Drawdown Before TP" value={trade.maxAdverseMove.toFixed(2)} mono />}
                {trade.pips !== undefined && <DataRow label="Pips" value={trade.pips.toFixed(1)} mono />}
                {trade.fees !== undefined && <DataRow label="Fees" value={trade.fees.toFixed(2)} mono />}
              </InfoCard>
            </div>

            {/* RIGHT: INTELLIGENCE PANEL */}
            <div className="space-y-4">
              {/* Psychology with Progress Bars */}
              {trade.psychology && (
                <InfoCard icon={Brain} title="Trade Intelligence">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">Emotion</span>
                      <Badge variant="outline" className="text-[10px] h-5">{trade.psychology.emotion}</Badge>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground">Focus</span>
                        <span className="text-[11px] font-mono font-bold">{trade.psychology.focus}/5</span>
                      </div>
                      <Progress value={trade.psychology.focus * 20} className="h-2" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground">Discipline</span>
                        <span className="text-[11px] font-mono font-bold">{trade.psychology.discipline}/5</span>
                      </div>
                      <Progress value={trade.psychology.discipline * 20} className="h-2" />
                    </div>
                  </div>
                </InfoCard>
              )}

              {/* Management */}
              {trade.management.length > 0 && (
                <InfoCard icon={Shield} title="Management">
                  <div className="flex flex-wrap gap-1.5">
                    {trade.management.map(m => (
                      <Badge key={m} variant="outline" className="text-[10px] h-5 bg-accent/30">{m}</Badge>
                    ))}
                  </div>
                </InfoCard>
              )}

              {/* Event Impact */}
              {topEvents.length > 0 && (
                <InfoCard icon={Activity} title="Event Impact Analysis">
                  <div className="space-y-2">
                    {eventBiases.map(event => {
                      const biasInfo = getBiasLabel(event.bias);
                      const BiasIcon = biasInfo.icon;
                      const hasActual = event.actual && event.actual !== 'N/A';
                      return (
                        <div key={event.id} className="bg-muted/20 border border-border/40 rounded-lg p-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-1.5 mb-1">
                                <Badge variant="outline" className="text-[8px] font-mono h-4 bg-destructive/10 text-destructive border-destructive/30">{event.currency}</Badge>
                                <span className="text-[10px] font-semibold">{event.title}</span>
                              </div>
                              <div className="flex items-center gap-2 text-[10px]">
                                <span className="text-muted-foreground">Prev: <span className="font-mono font-medium text-foreground">{event.previous}</span></span>
                                <span className="text-muted-foreground">Fcst: <span className="font-mono font-medium text-foreground">{event.forecast}</span></span>
                                {hasActual && <span className="text-primary font-semibold">Act: <span className="font-mono font-bold">{event.actual}</span></span>}
                              </div>
                            </div>
                            {hasActual && (
                              <div className={cn("flex items-center gap-1 text-[10px] font-bold shrink-0", biasInfo.color)}>
                                <BiasIcon className="h-3 w-3" />
                                {biasInfo.text}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {eventBiases.some(e => e.actual && e.actual !== 'N/A') && (
                    <div className="mt-2 pt-2 border-t border-border/40 flex items-center gap-2">
                      {(() => {
                        const nb = getBiasLabel(netBias);
                        const NbIcon = nb.icon;
                        return (
                          <>
                            <span className="text-[10px] font-semibold text-muted-foreground uppercase">Net Impact:</span>
                            <div className={cn("flex items-center gap-1 text-xs font-bold", nb.color)}>
                              <NbIcon className="h-3.5 w-3.5" /> {nb.text}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )}
                </InfoCard>
              )}

              {/* Technical Points */}
              {((trade.entryConfluences && trade.entryConfluences.length > 0) || (trade.targetConfluences && trade.targetConfluences.length > 0) || trade.confluences.length > 0) && (
                <InfoCard icon={Target} title="Technical Points">
                  <Collapsible defaultOpen>
                    <CollapsibleTrigger className="flex items-center justify-between w-full group">
                      <span className="text-[10px] text-muted-foreground">Click to expand/collapse</span>
                      <ChevronDown className="h-3 w-3 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-2 pt-2">
                      {trade.entryConfluences && trade.entryConfluences.length > 0 && (
                        <div>
                          <p className="text-[9px] font-semibold text-muted-foreground uppercase mb-1">Entry Points</p>
                          <div className="space-y-0.5">
                            {trade.entryConfluences.map((c, i) => (
                              <div key={c} className="flex items-center gap-1.5">
                                <span className="text-[9px] font-mono font-bold text-primary w-3 text-center">{i + 1}</span>
                                <Badge variant="outline" className="text-[10px] h-5">{c}</Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {trade.targetConfluences && trade.targetConfluences.length > 0 && (
                        <div>
                          <p className="text-[9px] font-semibold text-muted-foreground uppercase mb-1">Target Points</p>
                          <div className="space-y-0.5">
                            {trade.targetConfluences.map((c, i) => (
                              <div key={c} className="flex items-center gap-1.5">
                                <span className="text-[9px] font-mono font-bold text-primary w-3 text-center">{i + 1}</span>
                                <Badge variant="outline" className="text-[10px] h-5">{c}</Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                </InfoCard>
              )}

              {/* Mistakes */}
              {trade.mistakes.length > 0 && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-destructive mb-2">Mistakes</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {trade.mistakes.map(m => <Badge key={m} variant="destructive" className="text-[10px] h-5">{m}</Badge>)}
                  </div>
                </div>
              )}

              {/* Chart Link */}
              {trade.chartLink && (
                <a href={trade.chartLink} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-[11px] text-primary hover:underline bg-primary/5 border border-primary/20 rounded-lg px-3 py-2 transition-colors hover:bg-primary/10">
                  <ExternalLink className="h-3.5 w-3.5" /> TradingView Chart
                </a>
              )}

              {/* Notes */}
              {trade.notes && (
                <div className="rounded-xl border border-border/60 bg-card/50 p-4">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Notes</h4>
                  <p className="text-[11px] text-foreground/80 leading-relaxed">{trade.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* ═══════ BOTTOM: MEDIA + JOURNEY ═══════ */}
          
          {/* News & Events Media Only */}
          {newsEventImages.length > 0 && (
            <div className="px-5 py-3 border-t border-border/30">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-5 w-5 rounded bg-warning/10 flex items-center justify-center">
                  <Calendar className="h-3 w-3 text-warning" />
                </div>
                <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">News & Events Media — {trade.date}</h4>
              </div>
              <div className="flex gap-2 flex-wrap">
                {newsEventImages.map((img, i) => (
                  <div key={i} className="relative group cursor-pointer w-24 h-16 rounded-lg border border-border overflow-hidden shrink-0 hover:border-primary/50 transition-colors"
                    onClick={() => setPreviewImage(img)}>
                    <img src={img} alt="News event" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                      <ZoomIn className="h-3.5 w-3.5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Screenshots */}
          {(trade.predictionImage || trade.executionImage) && (
            <div className="px-5 py-3 border-t border-border/30">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-5 w-5 rounded bg-primary/10 flex items-center justify-center">
                  <Image className="h-3 w-3 text-primary" />
                </div>
                <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Screenshots</h4>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {trade.predictionImage && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-medium text-muted-foreground">Prediction</p>
                    <div className="relative group cursor-pointer rounded-lg border border-border overflow-hidden hover:border-primary/50 transition-colors" onClick={() => setPreviewImage(trade.predictionImage!)}>
                      <img src={trade.predictionImage} alt="Prediction" className="w-full h-32 object-cover" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                        <ZoomIn className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  </div>
                )}
                {trade.executionImage && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-medium text-muted-foreground">Execution</p>
                    <div className="relative group cursor-pointer rounded-lg border border-border overflow-hidden hover:border-primary/50 transition-colors" onClick={() => setPreviewImage(trade.executionImage!)}>
                      <img src={trade.executionImage} alt="Execution" className="w-full h-32 object-cover" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                        <ZoomIn className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Trade Journey */}
          <div className="px-5 py-3 border-t border-border/30">
            <TradeJourneyTimeline
              tradeDate={trade.date}
              entryTime={trade.entryTime}
              journey={trade.tradeJourney || []}
              onUpdate={handleJourneyUpdate}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Full-size image preview */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-2 bg-black/95 border-none">
          <div className="relative flex items-center justify-center h-full">
            <Button variant="ghost" size="icon" className="absolute top-2 right-2 z-10 text-white hover:bg-white/20"
              onClick={() => setPreviewImage(null)}>
              <X className="h-5 w-5" />
            </Button>
            {previewImage && (
              <>
                <img src={previewImage} alt="Full size" className="max-w-full max-h-[85vh] object-contain rounded-md" />
                <Button variant="ghost" size="sm" className="absolute bottom-4 right-4 text-white hover:bg-white/20 gap-1.5"
                  onClick={() => handleDownload(previewImage, 'trade-screenshot.png')}>
                  <Download className="h-4 w-4" /> Download
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
