import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const INSTRUMENTS = [
  { symbol: 'EUR/USD', display: 'EURUSD', flag: '🇪🇺', decimals: 5 },
  { symbol: 'GBP/USD', display: 'GBPUSD', flag: '🇬🇧', decimals: 5 },
  { symbol: 'XAU/USD', display: 'XAUUSD', flag: '🥇', decimals: 2 },
  { symbol: 'BTC/USD', display: 'BTCUSD', flag: '₿', decimals: 2 },
  { symbol: 'USD/CAD', display: 'USDCAD', flag: '🇨🇦', decimals: 5 },
  { symbol: 'NIFTY 50', display: 'NIFTY 50', flag: '🇮🇳', decimals: 2 },
  { symbol: 'SENSEX', display: 'SENSEX', flag: '🇮🇳', decimals: 2 },
  { symbol: 'XTI/USD', display: 'WTI OIL', flag: '🛢️', decimals: 2 },
];

// Some providers resolve these instruments under alternate symbols; try them
// one by one in the fallback pass, cheapest-first.
const FALLBACK_SYMBOLS: Record<string, string[]> = {
  'NIFTY 50': ['NIFTY50', 'NSEI'],
  'SENSEX': ['BSE SENSEX', 'BSESN'],
  'XTI/USD': ['WTI/USD', 'CRUDEOIL'],
};

// In-memory cache (survives within same instance)
let cachedData: any = null;
let cacheTime = 0;
const CACHE_TTL = 6 * 60 * 60 * 1000;      // full data: 6 hours cache
const PARTIAL_CACHE_TTL = 10 * 60 * 1000;  // partial data: retry missing symbols in 10 min

const num = (v: unknown): number => {
  const n = parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : 0;
};

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
  const ttl = cachedData?.some?.((r: any) => r.price <= 0) ? PARTIAL_CACHE_TTL : CACHE_TTL;
  if (cachedData && Date.now() - cacheTime < ttl) {
    return new Response(JSON.stringify({ data: cachedData, cached: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const placeholder = () =>
    INSTRUMENTS.map(p => ({
      symbol: p.display, flag: p.flag, price: 0, change: 0, changePercent: 0, decimals: p.decimals,
    }));

  try {
    // Single batched quote for all instruments — the cheapest way to fetch.
    const symbolStr = INSTRUMENTS.map(p => p.symbol).join(',');
    const url = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(symbolStr)}&apikey=${apiKey}`;

    const response = await fetch(url);
    const rawData = await response.json();

    // Rate limited or provider error
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

    const results = INSTRUMENTS.map(p => {
      const quote = rawData[p.symbol];
      if (!quote || typeof quote !== 'object' || quote.status === 'error') {
        return { symbol: p.display, flag: p.flag, price: 0, change: 0, changePercent: 0, decimals: p.decimals };
      }
      return {
        symbol: p.display,
        flag: p.flag,
        price: parseFloat(quote.close || '0'),
        change: parseFloat(quote.change || '0'),
        changePercent: parseFloat(quote.percent_change || '0'),
        decimals: p.decimals,
      };
    });

    // Fallback: instruments that failed in the batch may resolve under an
    // alternate symbol — retry one alternate per missing instrument only, so
    // we never burn more than a couple of extra credits per refresh.
    for (const m of results) {
      if (m.price > 0) continue;
      const inst = INSTRUMENTS.find(p => p.display === m.symbol)!;
      const alternates = FALLBACK_SYMBOLS[inst.symbol] || [];
      for (const alt of alternates) {
        try {
          const single = await fetch(`https://api.twelvedata.com/quote?symbol=${encodeURIComponent(alt)}&apikey=${apiKey}`);
          const q = await single.json();
          const quote = q?.quote && typeof q.quote === 'object' ? q.quote : q;
          if (quote && typeof quote === 'object' && quote.status !== 'error' && num(quote.close) > 0) {
            m.price = num(quote.close);
            m.change = num(quote.change);
            m.changePercent = num(quote.percent_change);
            break;
          }
          if (q?.code === 429) break; // out of credits this minute — stop trying
        } catch (e) {
          console.error(`Fallback quote failed for ${alt}:`, e);
        }
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
