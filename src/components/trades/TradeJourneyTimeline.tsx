import { useState } from 'react';
import { TradeJourneyStep, JOURNEY_EVENT_TYPES } from '@/types/trading';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { UnifiedMediaBox } from '@/components/shared/UnifiedMediaBox';
import { Plus, Clock, Pencil, Trash2, CheckCircle2, Circle, ZoomIn } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  tradeDate: string;
  entryTime?: string;
  journey: TradeJourneyStep[];
  onUpdate: (journey: TradeJourneyStep[]) => void;
}

export function TradeJourneyTimeline({ tradeDate, entryTime, journey, onUpdate }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editStep, setEditStep] = useState<TradeJourneyStep | null>(null);
  const [eventType, setEventType] = useState('');
  const [customType, setCustomType] = useState('');
  const [time, setTime] = useState('');
  const [note, setNote] = useState('');
  const [image, setImage] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const defaultStep: TradeJourneyStep = {
    id: '__trade_entered__',
    type: 'Trade Entered',
    time: entryTime || '00:00',
    note: `Entered on ${tradeDate}`,
  };

  const allSteps = [defaultStep, ...journey].sort((a, b) => a.time.localeCompare(b.time));

  const resetForm = () => {
    setEventType('');
    setCustomType('');
    setTime('');
    setNote('');
    setImage('');
    setEditStep(null);
    setShowForm(false);
  };

  const openAdd = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (step: TradeJourneyStep) => {
    setEditStep(step);
    if (JOURNEY_EVENT_TYPES.includes(step.type as any)) {
      setEventType(step.type);
      setCustomType('');
    } else {
      setEventType('Custom Event');
      setCustomType(step.type);
    }
    setTime(step.time);
    setNote(step.note || '');
    setImage(step.image || '');
    setShowForm(true);
  };

  const handleSave = () => {
    if (!time) return;
    const resolvedType = eventType === 'Custom Event' ? (customType || 'Custom Event') : eventType;
    if (!resolvedType) return;

    if (editStep) {
      const updated = journey.map(s =>
        s.id === editStep.id ? { ...s, type: resolvedType, time, note: note || undefined, image: image || undefined } : s
      );
      onUpdate(updated);
    } else {
      const newStep: TradeJourneyStep = {
        id: crypto.randomUUID(),
        type: resolvedType,
        time,
        note: note || undefined,
        image: image || undefined,
      };
      onUpdate([...journey, newStep]);
    }
    resetForm();
  };

  const handleDelete = (id: string) => {
    onUpdate(journey.filter(s => s.id !== id));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Trade Journey</h4>
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={openAdd}>
          <Plus className="h-3 w-3" /> Add Step
        </Button>
      </div>

      {/* Timeline */}
      <div className="relative pl-6 space-y-0">
        <div className="absolute left-[9px] top-2 bottom-2 w-px bg-border" />

        {allSteps.map((step, i) => {
          const isDefault = step.id === '__trade_entered__';
          return (
            <div key={step.id} className="relative pb-4 last:pb-0 group">
              <div className={cn(
                'absolute -left-6 top-0.5 flex items-center justify-center w-[18px] h-[18px] rounded-full border-2',
                isDefault
                  ? 'bg-primary border-primary text-primary-foreground'
                  : 'bg-background border-muted-foreground/40 group-hover:border-primary transition-colors'
              )}>
                {isDefault ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  <Circle className="h-2 w-2 fill-current text-muted-foreground/60" />
                )}
              </div>

              <div className={cn(
                'rounded-lg border px-3 py-2 transition-colors',
                isDefault ? 'border-primary/30 bg-primary/5' : 'border-border bg-card hover:border-primary/20'
              )}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-foreground">{step.type}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-[11px] font-mono text-muted-foreground">{step.time}</span>
                    </div>
                    {step.note && (
                      <p className="text-[11px] text-muted-foreground/80 mt-1 leading-relaxed">{step.note}</p>
                    )}
                  </div>
                  {!isDefault && (
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(step)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDelete(step.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
                {/* Step Image */}
                {step.image && (
                  <div className="mt-2 relative group/img cursor-pointer" onClick={() => setPreviewImage(step.image!)}>
                    <img src={step.image} alt={`${step.type} screenshot`} className="w-full rounded-lg border border-border object-cover max-h-[200px]" />
                    <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/30 transition-colors rounded-lg flex items-center justify-center">
                      <ZoomIn className="h-5 w-5 text-white opacity-0 group-hover/img:opacity-100 transition-opacity" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) resetForm(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">{editStep ? 'Edit Step' : 'Add Journey Step'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Event Type</Label>
              <Select value={eventType} onValueChange={setEventType}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select event type" />
                </SelectTrigger>
                <SelectContent>
                  {JOURNEY_EVENT_TYPES.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {eventType === 'Custom Event' && (
              <div>
                <Label className="text-xs">Custom Event Name</Label>
                <Input className="h-9 text-xs" value={customType} onChange={e => setCustomType(e.target.value)} placeholder="e.g. Added to position" />
              </div>
            )}

            <div>
              <Label className="text-xs">Time (HH:MM) *</Label>
              <Input type="time" className="h-9 text-xs font-mono" value={time} onChange={e => setTime(e.target.value)} />
            </div>

            <div>
              <Label className="text-xs">Note (optional)</Label>
              <Textarea className="text-xs min-h-[60px]" value={note} onChange={e => setNote(e.target.value)} placeholder="What happened at this step..." />
            </div>

            <div>
              <Label className="text-xs">Screenshot (optional)</Label>
              <UnifiedMediaBox value={image} onChange={setImage} label="" accept={['image', 'url']} maxPreviewHeight="150px" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={resetForm}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={!eventType || !time}>
              {editStep ? 'Update' : 'Add Step'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Preview */}
      {previewImage && (
        <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
          <DialogContent className="max-w-[90vw] max-h-[90vh] p-2 bg-black/95 border-none">
            <img src={previewImage} alt="Journey step" className="max-w-full max-h-[85vh] object-contain rounded-md mx-auto" />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
