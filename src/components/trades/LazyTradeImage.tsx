import { useEffect, useRef, useState } from 'react';
import { ImageOff, Loader2 } from 'lucide-react';
import { useTrading } from '@/contexts/TradingContext';
import type { Trade } from '@/types/trading';

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
  const [src, setSrc] = useState<string | null>(
    trade.executionImage || trade.predictionImage || null
  );
  const [loading, setLoading] = useState(false);
  const [tried, setTried] = useState(Boolean(src));

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

  return (
    <div ref={ref} className={className}>
      {src ? (
        <img src={src} alt={alt} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" decoding="async" />
      ) : loading ? (
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
