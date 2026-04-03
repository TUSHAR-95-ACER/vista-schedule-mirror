import { useEffect, useRef, useMemo } from 'react';
import { useTheme } from 'next-themes';

export function TradingViewTicker() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const theme = resolvedTheme === 'dark' ? 'dark' : 'light';

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = '';

    // Load the web component script
    const script = document.createElement('script');
    script.type = 'module';
    script.src = 'https://widgets.tradingview-widget.com/w/en/tv-ticker-tape.js';
    document.head.appendChild(script);

    // Create the web component
    const ticker = document.createElement('tv-ticker-tape');
    ticker.setAttribute('symbols', 'FX:EURUSD,OANDA:GBPUSD,OANDA:XAUUSD,FOREXCOM:US30,FOREXCOM:NAS100');
    ticker.setAttribute('theme', theme);
    if (theme === 'dark' || theme === 'light') {
      ticker.setAttribute('transparent', '');
    }
    containerRef.current.appendChild(ticker);

    return () => {
      if (containerRef.current) containerRef.current.innerHTML = '';
    };
  }, [theme]);

  return (
    <div className="w-full border-b border-border/50 overflow-hidden relative">
      <div className="tradingview-widget-container" ref={containerRef} />
      <div className="absolute top-0 right-0 h-full w-10 bg-background z-10 pointer-events-none" />
    </div>
  );
}
