import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface MarketSentimentSliderProps {
  /** Long percentage 0-100. 50 = balanced. null/undefined = unset (defaults to 50 visually). */
  value?: number | null;
  onChange: (longPct: number) => void;
  className?: string;
  disabled?: boolean;
  display?: 'slider' | 'split-bar';
}

export function longPercentAtPointer(clientX: number, left: number, width: number, display: 'slider' | 'split-bar') {
  const ratio = width > 0 ? Math.max(0, Math.min(1, (clientX - left) / width)) : 0.5;
  const position = Math.round(ratio * 100);
  return display === 'split-bar' ? 100 - position : position;
}

/**
 * Horizontal draggable sentiment slider.
 * For the split bar, moving right increases SELL and moving left increases BUY.
 */

export function MarketSentimentSlider({ value, onChange, className, disabled, display = 'slider' }: MarketSentimentSliderProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const longPct = Math.max(0, Math.min(100, value ?? 50));
  const shortPct = 100 - longPct;

  const updateFromClientX = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    onChange(longPercentAtPointer(clientX, rect.left, rect.width, display));
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || (e.pointerType === 'mouse' && e.button !== 0)) return;
    e.preventDefault();
    if (typeof e.currentTarget.setPointerCapture === 'function') {
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* pointer already ended */ }
    }
    setDragging(true);
    updateFromClientX(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragging && !disabled) updateFromClientX(e.clientX);
  };

  const handlePointerUp = () => setDragging(false);

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
            <span className="font-sans text-[10px] font-bold tracking-wider">SELL</span>
            <span>{shortPct}%</span>
          </div>
          <div className="flex min-w-0 items-center gap-1.5 text-success">
            <span>{longPct}%</span>
            <span className="font-sans text-[10px] font-bold tracking-wider">BUY</span>
          </div>
        </div>
        <div
          ref={trackRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onLostPointerCapture={handlePointerUp}
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
            'relative h-1.5 w-full overflow-hidden rounded-full bg-muted touch-none',
            disabled ? 'cursor-not-allowed opacity-60' : 'cursor-ew-resize',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            dragging && 'opacity-90',
          )}
        >
          <div className="absolute inset-y-0 left-0 bg-destructive transition-[width] duration-150" style={{ width: `${shortPct}%` }} />
          <div className="absolute inset-y-0 right-0 bg-success transition-[width] duration-150" style={{ width: `${longPct}%` }} />
        </div>
      </div>
    );
  }

  return (
    <div className={cn('select-none', className)}>
      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onLostPointerCapture={handlePointerUp}
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
