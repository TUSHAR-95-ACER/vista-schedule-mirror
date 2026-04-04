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

// In-memory cache to avoid rate limits (free tier: 8 credits/min)
let cachedData: any = null;
let cacheTime = 0;
const CACHE_TTL = 120_000; // 2 minute cache

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
    // Split into two batches to stay under 8 credits/min
    // Batch 1: Forex pairs (4 symbols = 4 credits)
    const batch1 = PAIRS.slice(0, 4);
    const batch1Symbols = batch1.map(p => p.symbol).join(',');
    
    const res1 = await fetch(
      `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(batch1Symbols)}&apikey=${apiKey}`
    );
    const data1 = await res1.json();
    
    if (data1.code === 429) {
      console.log('Rate limited, returning cache or empty');
      if (cachedData) {
        return new Response(JSON.stringify({ data: cachedData, cached: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }
    
    // Batch 2: Remaining (4 symbols = 4 credits)  
    const batch2 = PAIRS.slice(4);
    const batch2Symbols = batch2.map(p => p.symbol).join(',');
    
    const res2 = await fetch(
      `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(batch2Symbols)}&apikey=${apiKey}`
    );
    const data2 = await res2.json();

    const allData = { ...data1, ...data2 };
    console.log('Combined keys:', Object.keys(allData));

    const results = PAIRS.map(p => {
      const quote = allData[p.symbol];
      
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

    cachedData = results;
    cacheTime = Date.now();

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
