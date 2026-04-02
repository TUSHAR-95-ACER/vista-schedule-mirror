import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { UnifiedMediaBox } from './UnifiedMediaBox';
import { cn } from '@/lib/utils';

interface MultiMediaBoxProps {
  /** Pipe-separated values for backward compat, or array */
  values: string[];
  onChange: (values: string[]) => void;
  label: string;
  accept?: ('image' | 'video' | 'url')[];
  maxItems?: number;
  maxPreviewHeight?: string;
}

export function MultiMediaBox({ values, onChange, label, accept = ['image', 'video', 'url'], maxItems = 5, maxPreviewHeight = '300px' }: MultiMediaBoxProps) {
  const items = values.filter(Boolean);

  const updateItem = (index: number, value: string) => {
    if (!value) {
      // Remove item
      onChange(items.filter((_, i) => i !== index));
    } else {
      const updated = [...items];
      updated[index] = value;
      onChange(updated);
    }
  };

  const addItem = () => {
    if (items.length < maxItems) {
      onChange([...items, '']);
    }
  };

  // Always show at least one empty slot
  const displayItems = items.length === 0 ? [''] : items;
  const canAdd = items.filter(Boolean).length > 0 && items.length < maxItems;

  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium text-muted-foreground tracking-wide uppercase">{label}</Label>
      
      <div className="space-y-3">
        {displayItems.map((item, idx) => (
          <div key={idx} className="relative">
            {/* Item number badge for multiple items */}
            {items.filter(Boolean).length > 1 && item && (
              <div className="absolute -top-1.5 -left-1.5 z-10 h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shadow-sm">
                {idx + 1}
              </div>
            )}
            <UnifiedMediaBox
              value={item}
              onChange={v => updateItem(idx, v)}
              label=""
              accept={accept}
              maxPreviewHeight={maxPreviewHeight}
            />
          </div>
        ))}
      </div>

      {/* Add More button */}
      {canAdd && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full h-9 rounded-xl text-xs font-semibold gap-1.5 border-dashed border-border/60 hover:border-primary/40 hover:bg-primary/[0.03] text-muted-foreground hover:text-primary transition-all"
          onClick={addItem}
        >
          <Plus className="h-3.5 w-3.5" />
          Add More ({items.filter(Boolean).length}/{maxItems})
        </Button>
      )}
    </div>
  );
}
