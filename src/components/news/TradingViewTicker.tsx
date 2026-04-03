import { useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';

export function TradingViewTicker() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'tradingview-widget-container__widget';
    containerRef.current.appendChild(wrapper);

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbols: [
        { proName: 'FX:EURUSD', title: 'EUR/USD' },
        { proName: 'FX:GBPUSD', title: 'GBP/USD' },
        { proName: 'OANDA:XAUUSD', title: 'Gold' },
        { proName: 'FOREXCOM:US30', title: 'US30' },
        { proName: 'FOREXCOM:NAS100', title: 'NAS100' },
      ],
      showSymbolLogo: true,
      isTransparent: true,
      displayMode: 'adaptive',
      colorTheme: resolvedTheme === 'dark' ? 'dark' : 'light',
      locale: 'en',
      largeChartUrl: '',
    });

    containerRef.current.appendChild(script);
  }, [resolvedTheme]);

  return (
    <div className="w-full border-b border-border/50 overflow-hidden relative">
      <style>{`
        .dark .tradingview-widget-container .tradingview-widget-container__widget a,
        .dark .tradingview-widget-container .tradingview-widget-container__widget span,
        .dark .tradingview-widget-container .tradingview-widget-container__widget div {
          color: white !important;
        }
      `}</style>
      <div className="tradingview-widget-container" ref={containerRef} />
      {/* Overlay to hide TradingView branding on the right */}
      <div className="absolute top-0 right-0 h-full w-[40px] bg-background z-10" />
    </div>
  );
}
