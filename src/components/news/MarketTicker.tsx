import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface TickerItem {
  symbol: string;
  flag: string;
  price: number;
  change: number;
  changePercent: number;
}

export function MarketTicker() {
  const [items, setItems] = useState<TickerItem[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchPrices = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('market-ticker');
      if (error) throw error;
      if (data?.data) setItems(data.data);
    } catch (e) {
      console.error('Ticker fetch error:', e);
    }
  }, []);

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 60000); // Every 60s to respect rate limits
    return () => clearInterval(interval);
  }, [fetchPrices]);

  const formatPrice = (price: number, symbol: string) => {
    if (['BTCUSD', 'TESLA', 'NVIDIA'].includes(symbol)) return price.toFixed(2);
    if (['XAUUSD', 'XAGUSD'].includes(symbol)) return price.toFixed(2);
    return price.toFixed(5);
  };

  if (items.length === 0) {
    return (
      <div className="w-full h-10 border-b border-border/50 bg-background flex items-center justify-center">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          Loading market data...
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
        ref={scrollRef}
        className={cn(
          "flex items-center gap-0 whitespace-nowrap py-2",
          isPaused ? "" : "animate-marquee"
        )}
        style={isPaused ? { animationPlayState: 'paused' } : undefined}
      >
        {doubled.map((item, i) => (
          <div
            key={`${item.symbol}-${i}`}
            className="flex items-center gap-2 px-4 border-r border-border/30 last:border-r-0 cursor-default group transition-transform hover:scale-105"
          >
            <span className="text-sm">{item.flag}</span>
            <span className="text-xs font-bold text-foreground tracking-wide">
              {item.symbol}
            </span>
            <span className="text-xs font-mono text-foreground/80">
              {formatPrice(item.price, item.symbol)}
            </span>
            <span
              className={cn(
                "text-[10px] font-semibold font-mono",
                item.changePercent >= 0 ? "text-success" : "text-destructive"
              )}
            >
              {item.changePercent >= 0 ? '+' : ''}{item.changePercent.toFixed(2)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
