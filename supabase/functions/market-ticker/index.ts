import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PAIRS = [
  { symbol: 'EUR/USD', display: 'EURUSD', flag: '🇪🇺', decimals: 5 },
  { symbol: 'GBP/USD', display: 'GBPUSD', flag: '🇬🇧', decimals: 5 },
  { symbol: 'XAU/USD', display: 'XAUUSD', flag: '🥇', decimals: 2 },
  { symbol: 'XAG/USD', display: 'XAGUSD', flag: '🥈', decimals: 3 },
  { symbol: 'BTC/USD', display: 'BTCUSD', flag: '₿', decimals: 2 },
  { symbol: 'USD/CAD', display: 'USDCAD', flag: '🇨🇦', decimals: 5 },
  { symbol: 'TSLA', display: 'TESLA', flag: '🚗', decimals: 2 },
  { symbol: 'NVDA', display: 'NVIDIA', flag: '🎮', decimals: 2 },
];

// In-memory cache
let cachedData: any = null;
let cacheTime = 0;
const CACHE_TTL = 60_000; // 60 seconds cache

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const apiKey = Deno.env.get('TWELVE_DATA_API_KEY');
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'TWELVE_DATA_API_KEY not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Return cached data if fresh
  if (cachedData && Date.now() - cacheTime < CACHE_TTL) {
    return new Response(JSON.stringify({ data: cachedData, cached: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Fetch each pair individually to avoid multi-symbol issues
    const results = await Promise.all(
      PAIRS.map(async (p) => {
        try {
          const url = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(p.symbol)}&apikey=${apiKey}`;
          const res = await fetch(url);
          const quote = await res.json();

          if (quote.status === 'error' || quote.code) {
            console.log(`Error for ${p.symbol}:`, quote.message || quote.code);
            return { symbol: p.display, flag: p.flag, price: 0, change: 0, changePercent: 0, decimals: p.decimals };
          }

          const price = parseFloat(quote.close || '0');
          const change = parseFloat(quote.change || '0');
          const changePercent = parseFloat(quote.percent_change || '0');

          return { symbol: p.display, flag: p.flag, price, change, changePercent, decimals: p.decimals };
        } catch (e) {
          console.error(`Fetch error for ${p.symbol}:`, e);
          return { symbol: p.display, flag: p.flag, price: 0, change: 0, changePercent: 0, decimals: p.decimals };
        }
      })
    );

    cachedData = results;
    cacheTime = Date.now();

    return new Response(JSON.stringify({ data: results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Market ticker error:', error);
    // Return cached data on error if available
    if (cachedData) {
      return new Response(JSON.stringify({ data: cachedData, cached: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
