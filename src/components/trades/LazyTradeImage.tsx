import { useEffect, useRef, useState } from 'react';
import { ImageOff, Loader2 } from 'lucide-react';
import { useTrading } from '@/contexts/TradingContext';
import type { Trade } from '@/types/trading';
import { getRawUrl } from '@/lib/mediaSlot';

interface Props {
  trade: Trade;
  alt: string;
  className?: string;
}

/**
 * Renders a trade chart image, lazily fetching the heavy base64 column
 * (executionImage / predictionImage) only once the card scrolls into view.
 * The list query never ships these blobs, which is the main perf win.
 */
export function LazyTradeImage({ trade, alt, className }: Props) {
  const { hydrateTradeMedia } = useTrading();
  const ref = useRef<HTMLDivElement | null>(null);
  const initial = trade.executionImage || trade.predictionImage || null;
  const [src, setSrc] = useState<string | null>(initial);
  const [loading, setLoading] = useState(false);
  const [tried, setTried] = useState(Boolean(initial));

  useEffect(() => {
    if (tried || !ref.current) return;
    const el = ref.current;
    const io = new IntersectionObserver(
      entries => {
        if (entries.some(e => e.isIntersecting)) {
          io.disconnect();
          setTried(true);
          setLoading(true);
          hydrateTradeMedia(trade.id).then(full => {
            setLoading(false);
            if (!full) return;
            setSrc(full.executionImage || full.predictionImage || null);
          });
        }
      },
      { rootMargin: '200px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [trade.id, hydrateTradeMedia, tried]);

  // Resolve encoded urlmeta:… slot values into a real image URL.
  const resolvedSrc = src ? getRawUrl(src) : null;
  const isLoadable = !!resolvedSrc && /^(https?:|data:|blob:|\/)/.test(resolvedSrc);

  return (
    <div ref={ref} className={className}>
      {isLoadable ? (
        <img src={resolvedSrc!} alt={alt} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" decoding="async" />)
      : src && !isLoadable ? (
        <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground/60 px-3 text-center">
          <ImageOff className="h-8 w-8" />
          <span className="text-[10px] font-medium truncate max-w-full">Linked media</span>
        </div>
      ) : null }
      {!isLoadable && (
        <div className="w-full h-full flex items-center justify-center text-muted-foreground/50">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground/50">
          <ImageOff className="h-10 w-10" />
          <span className="text-xs font-medium">No Chart</span>
        </div>
      )}
    </div>
  );
}
