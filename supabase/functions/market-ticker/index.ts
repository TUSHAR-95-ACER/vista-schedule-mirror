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

let cachedData: any = null;
let cacheTime = 0;
const CACHE_TTL = 120_000;

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
    // Single batch request for all symbols (8 credits = exactly the free limit)
    const symbolStr = PAIRS.map(p => p.symbol).join(',');
    const url = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(symbolStr)}&apikey=${apiKey}`;
    
    const response = await fetch(url);
    const rawData = await response.json();
    
    // Check for rate limit error
    if (rawData.code === 429 || rawData.status === 'error') {
      console.log('Rate limited or error:', rawData.message);
      if (cachedData) {
        return new Response(JSON.stringify({ data: cachedData, cached: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: 'Rate limited, please wait' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results = PAIRS.map(p => {
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

    // Only cache if we got real data (at least one non-zero price)
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
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
