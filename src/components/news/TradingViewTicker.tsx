import { useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';

function injectWhiteTickerText(root: ParentNode | ShadowRoot) {
  const styleId = 'tv-dark-text-override';
  const existing = (root as Document | ShadowRoot).querySelector?.(`#${styleId}`);
  if (existing) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    a, span, div { color: hsl(var(--foreground)) !important; }
    [class*="ticker"], [class*="symbol"], [class*="title"], [class*="description"] {
      color: hsl(var(--foreground)) !important;
      fill: hsl(var(--foreground)) !important;
    }
  `;

  if (root instanceof ShadowRoot) {
    root.appendChild(style);
  } else if (root instanceof HTMLElement) {
    root.prepend(style);
  }
}

export function TradingViewTicker() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = '';

    const applyOverrides = () => {
      if (!containerRef.current || resolvedTheme !== 'dark') return;

      injectWhiteTickerText(containerRef.current);

      const allElements = containerRef.current.querySelectorAll<HTMLElement>('*');
      allElements.forEach((el) => {
        el.style.color = 'hsl(var(--foreground))';
        const shadowRoot = (el as HTMLElement & { shadowRoot?: ShadowRoot }).shadowRoot;
        if (shadowRoot) {
          injectWhiteTickerText(shadowRoot);
          shadowRoot.querySelectorAll<HTMLElement>('*').forEach((shadowEl) => {
            shadowEl.style.color = 'hsl(var(--foreground))';
            shadowEl.style.fill = 'hsl(var(--foreground))';
          });
        }
      });
    };

    const wrapper = document.createElement('div');
    wrapper.className = 'tradingview-widget-container__widget';
    containerRef.current.appendChild(wrapper);

    const observer = new MutationObserver(() => applyOverrides());
    observer.observe(containerRef.current, { childList: true, subtree: true });

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js';
    script.async = true;
    script.onload = () => setTimeout(applyOverrides, 300);
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

    const fallbackTimer = window.setInterval(applyOverrides, 1000);

    return () => {
      observer.disconnect();
      window.clearInterval(fallbackTimer);
    };
  }, [resolvedTheme]);

  return (
    <div className="w-full border-b border-border/50 overflow-hidden relative">
      <div className="tradingview-widget-container" ref={containerRef} />
      <div className="absolute top-0 right-0 h-full w-[40px] bg-background z-10" />
    </div>
  );
}
