import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Trade, TradeJourneyStep } from '@/types/trading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ExternalLink, Download, ZoomIn, X, ChevronDown, Image, Video, Calendar, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getDayOfWeek } from '@/lib/calculations';
import { TradeJourneyTimeline } from './TradeJourneyTimeline';
import { useTrading } from '@/contexts/TradingContext';
import { useMacroNewsContext } from '@/contexts/MacroNewsContext';
import { format } from 'date-fns';

interface Props {
  trade: Trade | null;
  onClose: () => void;
}

export function TradeDetailSheet({ trade, onClose }: Props) {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const { updateTrade, dailyPlans } = useTrading();
  const { calendarEvents } = useMacroNewsContext();

  if (!trade) return null;

  const dailyPlan = dailyPlans.find(p => p.date === trade.date);

  // Get events for this trade's date
  const tradeDateEvents = calendarEvents.filter(e => {
    const eventDate = e.date?.split('T')[0] || '';
    return eventDate === trade.date;
  });

  // Get daily plan images for this date
  const dailyPlanImages: string[] = [];
  if (dailyPlan) {
    if (dailyPlan.resultChartImage) dailyPlanImages.push(dailyPlan.resultChartImage);
    dailyPlan.pairs.forEach(p => {
      if (p.chartImage) dailyPlanImages.push(p.chartImage);
      if (p.resultChartImage) dailyPlanImages.push(p.resultChartImage);
    });
  }

  const handleJourneyUpdate = (journey: TradeJourneyStep[]) => {
    updateTrade({ ...trade, tradeJourney: journey });
  };

  const Row = ({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) => (
    <div className="flex justify-between items-center py-1 border-b border-border/20">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className={cn('text-[11px] font-medium', mono && 'font-mono')}>{value}</span>
    </div>
  );

  const handleDownload = (src: string, name: string) => {
    const a = document.createElement('a');
    a.href = src;
    a.download = name;
    a.click();
  };

  return (
    <>
      <Dialog open={!!trade} onOpenChange={onClose}>
        <DialogContent className="max-w-[720px] max-h-[85vh] overflow-y-auto p-0 gap-0">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-card border-b border-border px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-heading text-lg font-bold">{trade.asset}</h2>
              <span className={cn('text-[10px] px-2 py-0.5 rounded font-semibold',
                trade.direction === 'Long' ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive'
              )}>
                {trade.direction}
              </span>
              {trade.grade && <Badge variant="outline" className="text-[10px] h-5">{trade.grade}</Badge>}
              <Badge variant={trade.result === 'Win' ? 'default' : trade.result === 'Loss' ? 'destructive' : 'secondary'} className="text-[10px] h-5">
                {trade.result}
              </Badge>
              <span className={cn('font-mono text-sm font-bold', trade.profitLoss >= 0 ? 'text-success' : 'text-destructive')}>
                {trade.profitLoss >= 0 ? '+' : ''}{trade.profitLoss.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Day Tags */}
          {trade.dayTags && trade.dayTags.length > 0 && (
            <div className="px-5 py-2 border-b border-border/50 bg-warning/5 flex items-center gap-2 flex-wrap">
              <Tag className="h-3 w-3 text-warning shrink-0" />
              {trade.dayTags.map((tag, i) => (
                <Badge key={i} variant="outline" className="text-[10px] h-5 border-warning/30 text-warning bg-warning/10">{tag}</Badge>
              ))}
            </div>
          )}

          {/* Economic Events for this day */}
          {tradeDateEvents.length > 0 && (
            <div className="px-5 py-2 border-b border-border/50 bg-destructive/5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Economic Events — {trade.date}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {tradeDateEvents.map(event => (
                  <div key={event.id} className="text-[10px] bg-destructive/10 border border-destructive/20 rounded-lg px-2.5 py-1 flex items-center gap-1.5">
                    <span className="font-bold text-destructive">{event.currency}</span>
                    <span className="text-foreground">{event.title}</span>
                    <span className="text-muted-foreground">{event.date ? format(new Date(event.date), 'HH:mm') : ''}</span>
                    {event.actual && <span className="text-primary font-bold">→ {event.actual}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Daily Plan Media - compact strip */}
          {dailyPlan && (dailyPlan.resultChartImage || dailyPlan.analysisVideoUrl || dailyPlanImages.length > 0) && (
            <div className="px-5 py-2 border-b border-border/50 bg-muted/30">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Image className="h-3 w-3" /> Daily Plan Media — {trade.date}
              </p>
              <div className="flex gap-2 flex-wrap">
                {dailyPlanImages.map((img, i) => (
                  <div key={i} className="relative group cursor-pointer w-24 h-16 rounded border border-border overflow-hidden shrink-0"
                    onClick={() => setPreviewImage(img)}>
                    <img src={img} alt="Daily plan" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                      <ZoomIn className="h-3.5 w-3.5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                ))}
                {dailyPlan.analysisVideoUrl && (
                  <a href={dailyPlan.analysisVideoUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-[11px] text-primary hover:underline bg-primary/5 px-3 py-1.5 rounded border border-primary/20">
                    <Video className="h-3.5 w-3.5" /> Analysis Video
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Two-column body */}
          <div className="grid grid-cols-2 gap-0">
            {/* Left Column */}
            <div className="px-5 py-3 border-r border-border/30 space-y-3">
              <div>
                <h4 className="text-[10px] font-medium text-muted-foreground mb-0.5 uppercase tracking-wider">Details</h4>
                <Row label="Date" value={`${trade.date} (${getDayOfWeek(trade.date)})`} />
                {trade.entryTime && <Row label="Entry Time" value={trade.entryTime} mono />}
                {trade.exitTime && <Row label="Exit Time" value={trade.exitTime} mono />}
                <Row label="Market" value={trade.market} />
                <Row label="Session" value={trade.session} />
                <Row label="Condition" value={trade.marketCondition} />
                {trade.trend && <Row label="Trend" value={trade.trend} />}
                <Row label="Setup" value={trade.setup} />
                <Row label="Quantity" value={trade.quantity} mono />
              </div>

              <div>
                <h4 className="text-[10px] font-medium text-muted-foreground mb-0.5 uppercase tracking-wider">Prices</h4>
                <Row label="Entry" value={trade.entryPrice} mono />
                <Row label="Stop Loss" value={trade.stopLoss} mono />
                <Row label="Take Profit" value={trade.takeProfit} mono />
                {trade.exitPrice && <Row label="Exit" value={trade.exitPrice} mono />}
              </div>

              <div>
                <h4 className="text-[10px] font-medium text-muted-foreground mb-0.5 uppercase tracking-wider">Metrics</h4>
                <Row label="Planned RR" value={trade.plannedRR.toFixed(2)} mono />
                {trade.actualRR !== undefined && <Row label="Actual RR" value={trade.actualRR.toFixed(2)} mono />}
                {trade.maxRRReached !== undefined && <Row label="Max Profit Before SL" value={trade.maxRRReached.toFixed(2)} mono />}
                {trade.maxAdverseMove !== undefined && <Row label="Max Drawdown Before TP" value={trade.maxAdverseMove.toFixed(2)} mono />}
                {trade.pips !== undefined && <Row label="Pips" value={trade.pips.toFixed(1)} mono />}
                {trade.fees !== undefined && <Row label="Fees" value={trade.fees.toFixed(2)} mono />}
              </div>
            </div>

            {/* Right Column */}
            <div className="px-5 py-3 space-y-3">
              {/* Technical Points */}
              {((trade.entryConfluences && trade.entryConfluences.length > 0) || (trade.targetConfluences && trade.targetConfluences.length > 0) || trade.confluences.length > 0) && (
                <Collapsible>
                  <CollapsibleTrigger className="flex items-center justify-between w-full group">
                    <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Technical Points</h4>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-2 pt-1.5">
                    {trade.entryConfluences && trade.entryConfluences.length > 0 && (
                      <div>
                        <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Entry Points</p>
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
                        <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Target Points</p>
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
                    {trade.confluences.length > 0 && (
                      <div>
                        <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">All Points</p>
                        <div className="space-y-0.5">
                          {trade.confluences.map((c, i) => (
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
              )}

              {trade.management.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-medium text-muted-foreground mb-1 uppercase tracking-wider">Management</h4>
                  <div className="flex flex-wrap gap-1">
                    {trade.management.map(m => <Badge key={m} variant="outline" className="text-[10px] h-5">{m}</Badge>)}
                  </div>
                </div>
              )}

              {trade.psychology && (
                <div>
                  <h4 className="text-[10px] font-medium text-muted-foreground mb-0.5 uppercase tracking-wider">Psychology</h4>
                  <Row label="Emotion" value={trade.psychology.emotion} />
                  <Row label="Focus" value={`${trade.psychology.focus}/5`} />
                  <Row label="Discipline" value={`${trade.psychology.discipline}/5`} />
                </div>
              )}

              {trade.mistakes.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-medium text-muted-foreground mb-1 uppercase tracking-wider">Mistakes</h4>
                  <div className="flex flex-wrap gap-1">
                    {trade.mistakes.map(m => <Badge key={m} variant="destructive" className="text-[10px] h-5">{m}</Badge>)}
                  </div>
                </div>
              )}

              {trade.chartLink && (
                <a href={trade.chartLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[11px] text-primary hover:underline">
                  <ExternalLink className="h-3 w-3" /> TradingView Chart
                </a>
              )}

              {trade.notes && (
                <div>
                  <h4 className="text-[10px] font-medium text-muted-foreground mb-0.5 uppercase tracking-wider">Notes</h4>
                  <p className="text-[11px] text-foreground/80 leading-relaxed">{trade.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Screenshots - full width row */}
          {(trade.predictionImage || trade.executionImage) && (
            <div className="px-5 py-3 border-t border-border/30">
              <h4 className="text-[10px] font-medium text-muted-foreground mb-2 uppercase tracking-wider">Screenshots</h4>
              <div className="grid grid-cols-2 gap-3">
                {trade.predictionImage && (
                  <div>
                    <p className="mb-1 text-[10px] text-muted-foreground">Prediction</p>
                    <div className="relative group cursor-pointer" onClick={() => setPreviewImage(trade.predictionImage!)}>
                      <img src={trade.predictionImage} alt="Prediction" className="w-full h-28 rounded border border-border object-cover" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors rounded flex items-center justify-center">
                        <ZoomIn className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  </div>
                )}
                {trade.executionImage && (
                  <div>
                    <p className="mb-1 text-[10px] text-muted-foreground">Execution</p>
                    <div className="relative group cursor-pointer" onClick={() => setPreviewImage(trade.executionImage!)}>
                      <img src={trade.executionImage} alt="Execution" className="w-full h-28 rounded border border-border object-cover" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors rounded flex items-center justify-center">
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
