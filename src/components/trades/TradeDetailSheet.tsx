import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Trade, TradeJourneyStep } from '@/types/trading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, Download, ZoomIn, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getDayOfWeek } from '@/lib/calculations';
import { TradeJourneyTimeline } from './TradeJourneyTimeline';
import { useTrading } from '@/contexts/TradingContext';

interface Props {
  trade: Trade | null;
  onClose: () => void;
}

export function TradeDetailSheet({ trade, onClose }: Props) {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const { updateTrade } = useTrading();

  if (!trade) return null;

  const handleJourneyUpdate = (journey: TradeJourneyStep[]) => {
    updateTrade({ ...trade, tradeJourney: journey });
  };

  const Row = ({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) => (
    <div className="flex justify-between items-center py-1.5 border-b border-border/30">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn('text-xs font-medium', mono && 'font-mono')}>{value}</span>
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
      <Sheet open={!!trade} onOpenChange={onClose}>
        <SheetContent className="w-[400px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="font-heading flex items-center gap-2">
              {trade.asset}
              <span className={cn('text-xs px-2 py-0.5 rounded', trade.direction === 'Long' ? 'bg-profit text-success' : 'bg-loss text-destructive')}>
                {trade.direction}
              </span>
              {trade.grade && (
                <Badge variant="outline" className="text-xs">{trade.grade}</Badge>
              )}
            </SheetTitle>
          </SheetHeader>

          <div className="mt-4 space-y-4">
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Details</h4>
              <Row label="Date" value={`${trade.date} (${getDayOfWeek(trade.date)})`} />
              {trade.entryTime && <Row label="Entry Time" value={trade.entryTime} mono />}
              {trade.exitTime && <Row label="Exit Time" value={trade.exitTime} mono />}
              <Row label="Market" value={trade.market} />
              <Row label="Session" value={trade.session} />
              <Row label="Condition" value={trade.marketCondition} />
              <Row label="Setup" value={trade.setup} />
              <Row label="Quantity" value={trade.quantity} mono />
              {trade.grade && <Row label="Grade" value={trade.grade} />}
            </div>

            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Prices</h4>
              <Row label="Entry" value={trade.entryPrice} mono />
              <Row label="Stop Loss" value={trade.stopLoss} mono />
              <Row label="Take Profit" value={trade.takeProfit} mono />
              {trade.exitPrice && <Row label="Exit" value={trade.exitPrice} mono />}
            </div>

            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Metrics</h4>
              <Row label="Planned RR" value={trade.plannedRR.toFixed(2)} mono />
              {trade.actualRR !== undefined && <Row label="Actual RR" value={trade.actualRR.toFixed(2)} mono />}
              {trade.maxRRReached !== undefined && <Row label="Max RR Reached" value={trade.maxRRReached.toFixed(2)} mono />}
              {trade.maxAdverseMove !== undefined && <Row label="Max Adverse Move" value={trade.maxAdverseMove.toFixed(2)} mono />}
              {trade.pips !== undefined && <Row label="Pips" value={trade.pips.toFixed(1)} mono />}
              {trade.fees !== undefined && <Row label="Fees" value={trade.fees.toFixed(2)} mono />}
              <Row label="P/L" value={
                <span className={trade.profitLoss >= 0 ? 'text-success' : 'text-destructive'}>
                  {trade.profitLoss >= 0 ? '+' : ''}{trade.profitLoss.toFixed(2)}
                </span>
              } mono />
              <Row label="Result" value={
                <Badge variant={trade.result === 'Win' ? 'default' : trade.result === 'Loss' ? 'destructive' : 'secondary'}>
                  {trade.result}
                </Badge>
              } />
            </div>

            {trade.entryConfluences && trade.entryConfluences.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Entry Points</h4>
                <div className="flex flex-wrap gap-1">
                  {trade.entryConfluences.map(c => <Badge key={c} variant="outline" className="text-xs">{c}</Badge>)}
                </div>
              </div>
            )}

            {trade.targetConfluences && trade.targetConfluences.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Target Points</h4>
                <div className="flex flex-wrap gap-1">
                  {trade.targetConfluences.map(c => <Badge key={c} variant="outline" className="text-xs">{c}</Badge>)}
                </div>
              </div>
            )}

            {trade.confluences.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">All Technical Points</h4>
                <div className="flex flex-wrap gap-1">
                  {trade.confluences.map(c => <Badge key={c} variant="outline" className="text-xs">{c}</Badge>)}
                </div>
              </div>
            )}

            {trade.management.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Management</h4>
                <div className="flex flex-wrap gap-1">
                  {trade.management.map(m => <Badge key={m} variant="outline" className="text-xs">{m}</Badge>)}
                </div>
              </div>
            )}

            {trade.chartLink && (
              <a href={trade.chartLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline">
                <ExternalLink className="h-3 w-3" /> TradingView Chart
              </a>
            )}

            {trade.notes && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Notes</h4>
                <p className="text-xs text-foreground/80 leading-relaxed">{trade.notes}</p>
              </div>
            )}

            {(trade.predictionImage || trade.executionImage) && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Screenshots</h4>
                <div className="grid gap-3">
                  {trade.predictionImage && (
                    <div>
                      <p className="mb-1 text-xs text-muted-foreground">Prediction Chart</p>
                      <div className="relative group cursor-pointer" onClick={() => setPreviewImage(trade.predictionImage!)}>
                        <img src={trade.predictionImage} alt="Prediction chart" className="w-full rounded-lg border border-border object-cover" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors rounded-lg flex items-center justify-center">
                          <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    </div>
                  )}
                  {trade.executionImage && (
                    <div>
                      <p className="mb-1 text-xs text-muted-foreground">Execution Chart</p>
                      <div className="relative group cursor-pointer" onClick={() => setPreviewImage(trade.executionImage!)}>
                        <img src={trade.executionImage} alt="Execution chart" className="w-full rounded-lg border border-border object-cover" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors rounded-lg flex items-center justify-center">
                          <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {trade.psychology && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Psychology</h4>
                <Row label="Emotion" value={trade.psychology.emotion} />
                <Row label="Focus" value={`${trade.psychology.focus}/5`} />
                <Row label="Discipline" value={`${trade.psychology.discipline}/5`} />
              </div>
            )}

            {trade.mistakes.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Mistakes</h4>
                <div className="flex flex-wrap gap-1">
                  {trade.mistakes.map(m => <Badge key={m} variant="destructive" className="text-xs">{m}</Badge>)}
                </div>
              </div>
            )}

            {/* Trade Journey Timeline */}
            <div className="border-t border-border pt-4">
              <TradeJourneyTimeline
                tradeDate={trade.date}
                entryTime={trade.entryTime}
                journey={trade.tradeJourney || []}
                onUpdate={handleJourneyUpdate}
              />
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Full-size image preview modal */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-2 bg-black/95 border-none">
          <div className="relative flex items-center justify-center h-full">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 z-10 text-white hover:bg-white/20"
              onClick={() => setPreviewImage(null)}
            >
              <X className="h-5 w-5" />
            </Button>
            {previewImage && (
              <>
                <img
                  src={previewImage}
                  alt="Full size preview"
                  className="max-w-full max-h-[85vh] object-contain rounded-md"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute bottom-4 right-4 text-white hover:bg-white/20 gap-1.5"
                  onClick={() => handleDownload(previewImage, 'trade-screenshot.png')}
                >
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
