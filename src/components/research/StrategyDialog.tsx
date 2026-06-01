import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Strategy, STRATEGY_TYPES, STRATEGY_ICONS, STRATEGY_COLORS, StrategyStatus, StrategyType, createStrategy } from '@/types/research';
import { cn } from '@/lib/utils';

const STATUSES: StrategyStatus[] = ['Testing', 'Promising', 'Validated', 'Failed'];

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: Strategy | null;
  onSave: (s: Strategy) => void;
}

export function StrategyDialog({ open, onOpenChange, initial, onSave }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<StrategyType>('Custom');
  const [icon, setIcon] = useState('🧪');
  const [color, setColor] = useState<string>('blue');
  const [status, setStatus] = useState<StrategyStatus>('Testing');

  useEffect(() => {
    if (!open) return;
    setName(initial?.name || '');
    setDescription(initial?.description || '');
    setType(initial?.type || 'Custom');
    setIcon(initial?.icon || '🧪');
    setColor(initial?.color || 'blue');
    setStatus(initial?.status || 'Testing');
  }, [open, initial]);

  const handleSave = () => {
    if (!name.trim()) return;
    const base = initial || createStrategy();
    onSave({
      ...base,
      name: name.trim(),
      description,
      type,
      icon,
      color,
      status,
      updatedAt: new Date().toISOString(),
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit Strategy' : 'New Strategy'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Strategy Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. ICT Session Narrative Model" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="One-line thesis" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as StrategyType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STRATEGY_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as StrategyStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Icon</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {STRATEGY_ICONS.map((i) => (
                <button key={i} type="button" onClick={() => setIcon(i)}
                  className={cn('w-9 h-9 rounded-md border text-lg flex items-center justify-center',
                    icon === i ? 'border-primary bg-primary/10' : 'border-border hover:bg-accent')}>{i}</button>
              ))}
            </div>
          </div>
          <div>
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {STRATEGY_COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className={cn('w-8 h-8 rounded-full border-2 transition-all',
                    color === c ? 'border-foreground scale-110' : 'border-transparent')}
                  style={{ background: `var(--tw-${c}, hsl(var(--primary)))` }}
                  data-color={c}
                >
                  <span className={cn('block w-full h-full rounded-full',
                    c === 'blue' && 'bg-blue-500',
                    c === 'emerald' && 'bg-emerald-500',
                    c === 'amber' && 'bg-amber-500',
                    c === 'purple' && 'bg-purple-500',
                    c === 'rose' && 'bg-rose-500',
                    c === 'cyan' && 'bg-cyan-500',
                    c === 'orange' && 'bg-orange-500',
                    c === 'slate' && 'bg-slate-500',
                  )} />
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!name.trim()}>Save Strategy</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
