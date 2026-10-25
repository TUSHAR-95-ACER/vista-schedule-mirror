import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PAIRS = [
  { symbol: 'EUR/USD', display: 'EURUSD', flag: '🇪🇺', decimals: 5 },
  { symbol: 'GBP/USD', display: 'GBPUSD', flag: '🇬🇧', decimals: 5 },
  { symbol: 'XAU/USD', display: 'XAUUSD', flag: '🥇', decimals: 2 },
  { symbol: 'BTC/USD', display: 'BTCUSD', flag: '₿', decimals: 2 },
  { symbol: 'USD/CAD', display: 'USDCAD', flag: '🇨🇦', decimals: 5 },
  { symbol: 'DXY', display: 'DXY', flag: '💵', decimals: 3 },
];

// DXY (US Dollar Index) is computed from its six component pairs because
// the index symbol itself is not available on the current data plan.
const DXY_EXTRA_SYMBOLS = ['USD/JPY', 'USD/SEK', 'USD/CHF'];
const DXY_DISPLAY = 'DXY';
const DXY_FLAG = '💵';
const DXY_DECIMALS = 3;

// In-memory cache (survives within same instance)
let cachedData: any = null;
let cacheTime = 0;
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours cache

const num = (v: unknown): number => {
  const n = parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : 0;
};

// Classic USDX formula: composite of the six component pairs.
// EUR/USD and GBP/USD are USD-quoted (negative exponents); the rest are USD-based.
function computeDxy(prices: Record<string, number>): number {
  const eur = prices['EUR/USD'];
  const jpy = prices['USD/JPY'];
  const gbp = prices['GBP/USD'];
  const cad = prices['USD/CAD'];
  const sek = prices['USD/SEK'];
  const chf = prices['USD/CHF'];
  if (!eur || !jpy || !gbp || !cad || !sek || !chf) return 0;
  return (
    50.14348112 *
    Math.pow(eur, -0.576) *
    Math.pow(jpy, 0.136) *
    Math.pow(gbp, -0.119) *
    Math.pow(cad, 0.091) *
    Math.pow(sek, 0.042) *
    Math.pow(chf, 0.036)
  );
}

function componentChangeFactor(rates: Record<string, number>): number {
  const eur = 1 + (rates['EUR/USD'] || 0);
  const jpy = 1 + (rates['USD/JPY'] || 0);
  const gbp = 1 + (rates['GBP/USD'] || 0);
  const cad = 1 + (rates['USD/CAD'] || 0);
  const sek = 1 + (rates['USD/SEK'] || 0);
  const chf = 1 + (rates['USD/CHF'] || 0);
  return (
    Math.pow(eur, -0.576) *
    Math.pow(jpy, 0.136) *
    Math.pow(gbp, -0.119) *
    Math.pow(cad, 0.091) *
    Math.pow(sek, 0.042) *
    Math.pow(chf, 0.036)
  );
}

function buildDxyEntry(
  current: Record<string, number>,
  rates: Record<string, number>,
) {
  const price = computeDxy(current);
  let change = 0;
  let changePercent = 0;
  if (price > 0) {
    // DXY_now = DXY_prev * Π(1+r_i)^e_i — invert to recover the previous close.
    const factor = componentChangeFactor(rates);
    if (factor > 0) {
      const prev = price / factor;
      change = price - prev;
      changePercent = (change / prev) * 100;
    }
  }
  return {
    symbol: DXY_DISPLAY,
    flag: DXY_FLAG,
    price: price > 0 ? price : 0,
    change,
    changePercent,
    decimals: DXY_DECIMALS,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Auth check — prevent third-party API key abuse from anonymous callers
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  try {
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const apiKey = Deno.env.get('TWELVE_DATA_API_KEY');
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'TWELVE_DATA_API_KEY not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Return cache if still valid
  if (cachedData && Date.now() - cacheTime < CACHE_TTL) {
    return new Response(JSON.stringify({ data: cachedData, cached: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const placeholder = () =>
    PAIRS.map(p => ({
      symbol: p.display, flag: p.flag, price: 0, change: 0, changePercent: 0, decimals: p.decimals,
    }));

  try {
    // One batched quote for the display pairs plus the DXY component pairs.
    const allSymbols = [...PAIRS.filter(p => p.symbol !== 'DXY').map(p => p.symbol), ...DXY_EXTRA_SYMBOLS];
    const symbolStr = allSymbols.join(',');
    const url = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(symbolStr)}&apikey=${apiKey}`;

    const response = await fetch(url);
    const rawData = await response.json();

    // Check for rate limiting
    if (rawData.code === 429 || rawData.status === 'error') {
      if (cachedData) {
        cacheTime = Date.now(); // Extend cache
        return new Response(JSON.stringify({ data: cachedData, cached: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      // No cache available - return empty placeholder data instead of error
      return new Response(JSON.stringify({ data: placeholder(), limited: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const current: Record<string, number> = {};
    const prevClose: Record<string, number> = {};
    for (const sym of allSymbols) {
      const quote = rawData[sym];
      if (quote && typeof quote === 'object' && quote.status !== 'error') {
        const close = num(quote.close);
        if (close > 0) {
          current[sym] = close;
          prevClose[sym] = num(quote.prev_close) || close;
        }
      }
    }

    const results = PAIRS.map(p => {
      if (p.symbol === 'DXY') {
        return buildDxyEntry(current, prevClose);
      }
      const close = current[p.symbol] || 0;
      const prev = prevClose[p.symbol] || close;
      if (close <= 0) {
        return { symbol: p.display, flag: p.flag, price: 0, change: 0, changePercent: 0, decimals: p.decimals };
      }
      return {
        symbol: p.display,
        flag: p.flag,
        price: close,
        change: close - prev,
        changePercent: prev > 0 ? ((close - prev) / prev) * 100 : 0,
        decimals: p.decimals,
      };
    });

    // Fallback: retry any missing symbols one by one, then via the lighter /price endpoint.
    for (const m of results) {
      if (m.symbol === DXY_DISPLAY || m.price > 0) continue;
      const pair = PAIRS.find(p => p.display === m.symbol)!;
      try {
        const single = await fetch(`https://api.twelvedata.com/quote?symbol=${encodeURIComponent(pair.symbol)}&apikey=${apiKey}`);
        const q = await single.json();
        const quote = q?.quote && typeof q.quote === 'object' ? q.quote : q;
        if (quote && typeof quote === 'object' && quote.status !== 'error' && num(quote.close) > 0) {
          m.price = num(quote.close);
          const prev = num(quote.prev_close) || m.price;
          m.change = m.price - prev;
          m.changePercent = prev > 0 ? (m.change / prev) * 100 : 0;
          continue;
        }
        const priceRes = await fetch(`https://api.twelvedata.com/price?symbol=${encodeURIComponent(pair.symbol)}&apikey=${apiKey}`);
        const pr = await priceRes.json();
        if (num(pr?.price) > 0) {
          m.price = num(pr.price);
          m.changePercent = m.changePercent || 0;
        }
      } catch (e) {
        console.error(`Fallback quote failed for ${pair.symbol}:`, e);
      }
    }

    const hasData = results.some(r => r.price > 0);
    if (hasData) {
      cachedData = results;
      cacheTime = Date.now();
    }

    return new Response(JSON.stringify({ data: results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Market ticker error:', error);
    if (cachedData) {
      return new Response(JSON.stringify({ data: cachedData, cached: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    // Return placeholder instead of error
    return new Response(JSON.stringify({ data: placeholder(), error: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
