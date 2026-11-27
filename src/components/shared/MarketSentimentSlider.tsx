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
 * Far left = 100% short / 0% long. Far right = 0% short / 100% long. Center = 50/50.
 */
function BearIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 shrink-0 fill-current">
      <path d="M6.1 7.2a3 3 0 0 1-2.5-2.9 2.4 2.4 0 0 1 4.7-.7c1-.4 2.2-.6 3.7-.6s2.7.2 3.7.6a2.4 2.4 0 0 1 4.7.7 3 3 0 0 1-2.5 2.9c.7 1.1 1.1 2.5 1.1 4 0 4.8-3.1 8.2-7 8.2s-7-3.4-7-8.2c0-1.5.4-2.9 1.1-4Z" />
      <circle cx="8.8" cy="10.1" r=".7" className="fill-background" />
      <circle cx="15.2" cy="10.1" r=".7" className="fill-background" />
      <path d="M8.2 13c0-1.1.8-1.8 1.8-1.8h4c1 0 1.8.7 1.8 1.8 0 1.5-1.7 2.7-3.8 2.7S8.2 14.5 8.2 13Z" className="fill-background" />
      <path d="M10.8 12.8h2.4a.8.8 0 0 1 .8.8v.2a2 2 0 0 1-4 0v-.2a.8.8 0 0 1 .8-.8Z" />
    </svg>
  );
}

function BullIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 shrink-0 fill-current">
      <path d="M6.1 7.3C3.6 6.6 2.1 4.2 2.4 2.1c2.3.3 4.2 1.6 5.2 3.5h8.8c1-1.9 2.9-3.2 5.2-3.5.3 2.1-1.2 4.5-3.7 5.2.5 1 .8 2.2.8 3.5 0 5-3 8.5-6.7 8.5s-6.7-3.5-6.7-8.5c0-1.3.3-2.5.8-3.5Z" />
      <circle cx="9" cy="10.2" r=".7" className="fill-background" />
      <circle cx="15" cy="10.2" r=".7" className="fill-background" />
      <path d="M8.1 13.1c0-1.1.8-1.8 1.9-1.8h4c1.1 0 1.9.7 1.9 1.8 0 1.7-1.7 2.8-3.9 2.8s-3.9-1.1-3.9-2.8Z" className="fill-background" />
      <path d="M10.8 12.8h2.4a.8.8 0 0 1 .8.8v.3a2 2 0 0 1-4 0v-.3a.8.8 0 0 1 .8-.8Z" />
    </svg>
  );
}

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
