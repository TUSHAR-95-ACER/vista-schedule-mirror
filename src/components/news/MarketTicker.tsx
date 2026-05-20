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

const CACHE_KEY = 'market-ticker-cache-v1';

function loadCache(): TickerItem[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

export function MarketTicker() {
  const [items, setItems] = useState<TickerItem[]>(() => loadCache());
  const [isPaused, setIsPaused] = useState(false);
  const [error, setError] = useState(false);


  const fetchPrices = useCallback(async () => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('market-ticker');
      if (fnError) throw fnError;
      if (data?.data && Array.isArray(data.data)) {
        // Only overwrite with rows that actually have a price; preserve last good
        // value for any pair the API returned as 0 (rate-limit / outage).
        setItems(prev => {
          const next = data.data.map((fresh: TickerItem) => {
            if (fresh.price > 0) return fresh;
            const cached = prev.find(p => p.symbol === fresh.symbol);
            return cached && cached.price > 0 ? cached : fresh;
          });
          try { localStorage.setItem(CACHE_KEY, JSON.stringify(next)); } catch {}
          return next;
        });
        setError(false);
      }
    } catch (e) {
      console.error('Ticker fetch error:', e);
      setError(true);
    }
  }, []);


  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 300000); // 5 min normal poll
    // Faster retry while we still have any missing prices (rate-limit recovery)
    const retry = setInterval(() => {
      if (items.some(i => i.price === 0) || items.length === 0) fetchPrices();
    }, 30000);
    return () => { clearInterval(interval); clearInterval(retry); };
  }, [fetchPrices, items]);

  const formatPrice = (price: number, decimals: number) => {
    return price.toFixed(decimals);
  };

  if (items.length === 0) {
    return (
      <div className="w-full h-10 border-b border-border/50 bg-background flex items-center pl-4 pr-4">
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
      className="w-full border-b border-border/50 bg-background overflow-hidden flex items-center"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="flex-1 min-w-0 overflow-hidden">
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
              {item.price > 0 ? (
                <>
                  <span className="text-sm font-mono text-foreground/80">
                    {formatPrice(item.price, item.decimals)}
                  </span>
                  <span
                    className={cn(
                      "text-xs font-semibold font-mono",
                      item.changePercent >= 0 ? "text-success" : "text-destructive"
                    )}
                  >
                    {item.changePercent >= 0 ? '+' : ''}{item.changePercent.toFixed(2)}%
                  </span>
                </>
              ) : (
                <span className="h-3 w-16 rounded bg-muted/40 animate-pulse" />
              )}
            </div>
          ))}
        </div>
    </div>

  );
}
