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
    <svg viewBox="0 0 38 20" aria-hidden="true" className="h-5 w-9 shrink-0 fill-current">
      <path d="M4.9 7.5c-1.1-.5-1.6-1.4-1.5-2.6l.1-1.2c0-.5-.5-.8-.9-.5L1.2 4.5c-.5.4-.6 1.1-.3 1.7l1.5 2 2.5-.3Z" />
      <path d="M2.8 9.2c.2-2.5 2.2-4.4 4.7-4.4h1.6c2-2.2 4.8-3.4 8.2-3.4h5.1c4.6 0 8 2.5 9.8 6.2l2.8 1.7c.7.4 1.1 1.1 1.1 1.9v1.2h-3.3l-.7 5h-2.7l-.5-4.8h-5.3l-.7 4.8h-2.8l-.2-4.7h-5.2l-.6 4.7h-2.7l-.2-4.8H7.8c-1.7 0-3.2-1-3.9-2.6l-.9-1.7c-.3-.5.1-1.1.7-1.1h.4Z" />
      <path d="M4 8.5c-1 .1-1.8.6-2.5 1.4l-.4.5c-.4.5-.2 1.2.4 1.5l2.2 1h3.2V8.5H4Z" />
      <circle cx="8" cy="4.8" r="1.7" />
      <circle cx="5.9" cy="8.5" r=".55" className="fill-background" />
    </svg>
  );
}

function BullIcon() {
  return (
    <svg viewBox="0 0 38 20" aria-hidden="true" className="h-5 w-9 shrink-0 fill-current">
      <path d="M5.3 7.2c-1-.5-1.5-1.5-1.3-2.7l.2-1c.1-.5-.5-.8-.9-.5L1.7 4.7c-.4.4-.5 1.1-.2 1.6l1.3 1.8 2.5-.2Z" />
      <path d="M28.1 7.2c-.8-1.2-1-2.6-.6-4.2.2-.6.9-.7 1.2-.2l1.4 2c.6-1.2 1.6-2 2.8-2.3.6-.2 1 .4.7.9l-1.5 2.5c-.5 1-1.5 1.6-2.8 1.7l-1.2-.4Z" />
      <path d="M31.8 7.7c.4-1.5 1.4-2.6 2.8-3.1.6-.2 1 .4.7.9l-.8 1.5 1.3.3c.6.2.7.9.1 1.2l-2.2.8-1.5-.7-.4-.9Z" />
      <path d="M4.1 8.8c1-2.1 3.2-3.4 5.7-3.4h1.3c2.1-2.1 5.1-3.2 8.6-3.2h5c4.1 0 7.1 2.1 8.7 5.5l2.2 1.4c.7.5 1.1 1.2 1.1 2v1.1h-3l-.7 5h-2.7l-.5-4.8h-5.2l-.7 4.8h-2.7l-.2-4.7h-5.2l-.6 4.7h-2.7l-.2-4.8H8.6c-1.7 0-3.2-.9-4-2.4l-.8-1.2Z" />
      <circle cx="33.2" cy="9.2" r=".55" className="fill-background" />
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
    onChange(display === 'split-bar' ? 100 - next : next);
  }, [display, onChange]);

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
    const rightwardStep = display === 'split-bar' ? -1 : 1;
    const step = e.key === 'ArrowRight' ? rightwardStep : -rightwardStep;
    onChange(Math.max(0, Math.min(100, longPct + step)));
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
          aria-valuenow={display === 'split-bar' ? shortPct : longPct}
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
