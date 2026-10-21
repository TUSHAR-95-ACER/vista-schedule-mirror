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

// In-memory cache (survives within same instance)
let cachedData: any = null;
let cacheTime = 0;
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours cache

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

  try {
    // Use /price endpoint - lighter weight, fewer credits
    const symbolStr = PAIRS.map(p => p.symbol).join(',');
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
      const placeholder = PAIRS.map(p => ({
        symbol: p.display, flag: p.flag, price: 0, change: 0, changePercent: 0, decimals: p.decimals,
      }));
      return new Response(JSON.stringify({ data: placeholder, limited: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let results = PAIRS.map(p => {
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

    // Fallback: indices (e.g. DXY) may not resolve in a batched quote —
    // retry the missing symbols one by one, then via the lighter /price endpoint.
    const missing = results.filter(r => r.price <= 0);
    for (const m of missing) {
      const pair = PAIRS.find(p => p.display === m.symbol)!;
      try {
        const single = await fetch(`https://api.twelvedata.com/quote?symbol=${encodeURIComponent(pair.symbol)}&apikey=${apiKey}`);
        const q = await single.json();
        const quote = q?.quote && typeof q.quote === 'object' ? q.quote : q;
        if (quote && typeof quote === 'object' && quote.status !== 'error' && parseFloat(quote.close || '0') > 0) {
          m.price = parseFloat(quote.close);
          m.change = parseFloat(quote.change || '0');
          m.changePercent = parseFloat(quote.percent_change || '0');
          continue;
        }
        const priceRes = await fetch(`https://api.twelvedata.com/price?symbol=${encodeURIComponent(pair.symbol)}&apikey=${apiKey}`);
        const pr = await priceRes.json();
        if (pr?.price && parseFloat(pr.price) > 0) {
          m.price = parseFloat(pr.price);
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
    const placeholder = PAIRS.map(p => ({
      symbol: p.display, flag: p.flag, price: 0, change: 0, changePercent: 0, decimals: p.decimals,
    }));
    return new Response(JSON.stringify({ data: placeholder, error: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
