import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface TickerItem {
  symbol: string;
  flag: string;
  price: number;
  change: number;
  changePercent: number;
  decimals: number;
}

export function MarketTicker() {
  const [items, setItems] = useState<TickerItem[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [error, setError] = useState(false);

  const fetchPrices = useCallback(async () => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('market-ticker');
      if (fnError) throw fnError;
      if (data?.data) {
        setItems(data.data);
        setError(false);
      }
    } catch (e) {
      console.error('Ticker fetch error:', e);
      setError(true);
    }
  }, []);

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 180000); // 3 min to match server cache
    return () => clearInterval(interval);
  }, [fetchPrices]);

  const formatPrice = (price: number, decimals: number) => {
    return price.toFixed(decimals);
  };

  if (items.length === 0) {
    return (
      <div className="w-full h-10 border-b border-border/50 bg-background flex items-center justify-center">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          {error ? 'Market data unavailable' : 'Loading market data...'}
        </div>
      </div>
    );
  }

  const doubled = [...items, ...items];

  return (
    <div
      className="w-full border-b border-border/50 bg-background overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div
        className={cn(
          "flex items-center gap-0 whitespace-nowrap py-3",
          "animate-marquee"
        )}
        style={isPaused ? { animationPlayState: 'paused' } : undefined}
      >
        {doubled.map((item, i) => (
          <div
            key={`${item.symbol}-${i}`}
            className="flex items-center gap-3 px-6 border-r border-border/30 last:border-r-0 cursor-default group transition-transform duration-200 hover:scale-105"
          >
            <span className="text-lg">{item.flag}</span>
            <span className="text-sm font-bold text-foreground tracking-wide">
              {item.symbol}
            </span>
            <span className="text-sm font-mono text-foreground/80">
              {item.price > 0 ? formatPrice(item.price, item.decimals) : '—'}
            </span>
            {item.price > 0 && (
              <span
                className={cn(
                  "text-xs font-semibold font-mono",
                  item.changePercent >= 0 ? "text-success" : "text-destructive"
                )}
              >
                {item.changePercent >= 0 ? '+' : ''}{item.changePercent.toFixed(2)}%
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
