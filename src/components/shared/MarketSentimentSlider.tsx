import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface MarketSentimentSliderProps {
  /** Long percentage 0-100. 50 = balanced. null/undefined = unset (defaults to 50 visually). */
  value?: number | null;
  onChange: (longPct: number) => void;
  className?: string;
  disabled?: boolean;
  display?: 'slider' | 'split-bar';
}

/**
 * Horizontal draggable sentiment slider.
 * Far left = 100% short / 0% long. Far right = 0% short / 100% long. Center = 50/50.
 */
function BearIcon() {
  return (
    <svg viewBox="0 0 32 20" aria-hidden="true" className="h-4 w-6 shrink-0 fill-current">
      <path d="M2.2 10.3c1.3-.5 2.2-1.5 2.9-3 .7-1.4 2-2.1 3.5-1.9l2 .2c1.7-1 3.8-1.4 6-1.1l3.4.5c3.2.5 5.4 2.4 6.6 4.8l2.3 1.4c.5.3.8.8.8 1.4v.8c0 .5-.4.9-.9.9h-1.3l-.6 3h-2.6l-.4-3h-6.7l-.6 3h-2.6l-.2-3H9.5l-.7 3H6.2l-.3-3.5c-1.4-.3-2.4-.9-3.2-1.8l-1.1-1.2c-.5-.6-.2-1.4.6-1.7Zm6.4-3.5a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4Z" />
      <path d="M26.1 10.7c1.3-.1 2.2.2 3 .9l1.2 1.1c.3.3.1.9-.4.9h-2.1l-1.7-1.1v-1.8Z" />
    </svg>
  );
}

function BullIcon() {
  return (
    <svg viewBox="0 0 36 20" aria-hidden="true" className="h-4 w-7 shrink-0 fill-current">
      <path d="M8.1 6.4 4.3 2.2c-.4-.4-.1-1.1.5-1l5.7 1.2c1.2-.7 2.7-1 4.5-.9l4.1.3c3.4.3 6 2.3 7.5 5.2l2.2 1.4c.7.5 1.1 1.2 1.1 2v1.5c0 .5-.4.9-.9.9h-1.4l-.7 3.3h-2.7l-.4-3.3h-6.6l-.5 3.3h-2.8l-.2-3.3H8.4l-.7 3.3H5l-.3-3.7c-1.3-.3-2.3-1.1-3-2.2L.8 8.6c-.3-.5.1-1.2.7-1.2l3 .1 1.7-1.2 1.9.1Z" />
      <path d="m27.7 8.9 3.1-2.8c.5-.4 1.1-.1 1 .5l-.6 2.3 3.5-.2c.6 0 .9.7.4 1.1l-3.1 2.7-3.2-.4-1.1-1.3V8.9Z" />
    </svg>
  );
}

export function MarketSentimentSlider({ value, onChange, className, disabled, display = 'slider' }: MarketSentimentSliderProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const longPct = Math.max(0, Math.min(100, value ?? 50));
  const shortPct = 100 - longPct;

  const updateFromClientX = useCallback((clientX: number) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const ratio = (clientX - rect.left) / rect.width;
    const next = Math.round(Math.max(0, Math.min(1, ratio)) * 100);
    onChange(next);
  }, [onChange]);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => updateFromClientX(e.clientX);
    const onUp = () => setDragging(false);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [dragging, updateFromClientX]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    setDragging(true);
    updateFromClientX(e.clientX);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled || !['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    e.preventDefault();
    onChange(Math.max(0, Math.min(100, longPct + (e.key === 'ArrowRight' ? 1 : -1))));
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (disabled) return;
    const delta = Math.sign(e.deltaX || e.deltaY);
    if (!delta) return;
    e.preventDefault();
    onChange(Math.max(0, Math.min(100, longPct + delta)));
  };

  if (display === 'split-bar') {
    return (
      <div className={cn('w-full select-none', className)}>
        <div className="mb-1 flex items-center justify-between gap-3 font-mono text-xs font-semibold tabular-nums">
          <div className="flex min-w-0 items-center gap-1.5 text-destructive">
            <BearIcon />
            <span>{shortPct}%</span>
          </div>
          <div className="flex min-w-0 items-center gap-1.5 text-success">
            <span>{longPct}%</span>
            <BullIcon />
          </div>
        </div>
        <div
          ref={trackRef}
          onPointerDown={handlePointerDown}
          onWheel={handleWheel}
          onKeyDown={handleKeyDown}
          role="slider"
          aria-label="Market sentiment"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={longPct}
          aria-valuetext={`${shortPct}% bearish, ${longPct}% bullish`}
          aria-disabled={disabled}
          tabIndex={disabled ? -1 : 0}
          className={cn(
            'relative flex h-1.5 w-full overflow-hidden rounded-full bg-muted touch-none',
            disabled ? 'cursor-not-allowed opacity-60' : 'cursor-ew-resize',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            dragging && 'opacity-90',
          )}
        >
          <div className="h-full bg-destructive transition-[width] duration-150" style={{ width: `${shortPct}%` }} />
          <div className="h-full bg-success transition-[width] duration-150" style={{ width: `${longPct}%` }} />
        </div>
      </div>
    );
  }

  return (
    <div className={cn('select-none', className)}>
      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onWheel={handleWheel}
        className={cn(
          'relative h-10 rounded-xl border border-border bg-background overflow-hidden cursor-ew-resize',
          'transition-shadow',
          dragging && 'shadow-[0_0_0_2px_hsl(var(--primary)/0.35)]',
          disabled && 'opacity-60 cursor-not-allowed',
        )}
      >
        {/* Red short fill (left) */}
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-destructive/30 to-destructive/10 transition-all duration-150"
          style={{ width: `${shortPct}%` }}
        />
        {/* Green long fill (right) */}
        <div
          className="absolute inset-y-0 right-0 bg-gradient-to-l from-success/30 to-success/10 transition-all duration-150"
          style={{ width: `${longPct}%` }}
        />
        {/* Center line */}
        <div className="absolute inset-y-1 left-1/2 -translate-x-1/2 w-px bg-border/60 pointer-events-none" />
        {/* Handle */}
        <div
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 h-7 w-1.5 rounded-full bg-foreground/80 shadow-md pointer-events-none transition-[left] duration-150"
          style={{ left: `${longPct}%` }}
        />
        {/* Labels */}
        <div className="relative z-10 flex items-center justify-between h-full px-3 text-[11px] font-heading font-semibold tracking-wide pointer-events-none">
          <span className="text-destructive">SHORT {shortPct}%</span>
          <span className="text-success">LONG {longPct}%</span>
        </div>
      </div>
      <div className="mt-1 flex justify-between text-[9px] text-muted-foreground/60 px-1">
        <span>Bearish crowd</span>
        <span>Balanced</span>
        <span>Bullish crowd</span>
      </div>
    </div>
  );
}
