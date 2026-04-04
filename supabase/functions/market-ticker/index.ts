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

  try {
    const symbolStr = PAIRS.map(p => p.symbol).join(',');
    
    // Use /quote endpoint for price + change data
    const url = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(symbolStr)}&apikey=${apiKey}`;
    console.log('Fetching:', url);
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Twelve Data API error: ${response.status}`);
    }

    const rawData = await response.json();
    console.log('Raw response keys:', Object.keys(rawData));
    
    // Log first item to debug structure
    const firstKey = Object.keys(rawData)[0];
    if (firstKey) {
      console.log('First item:', JSON.stringify(rawData[firstKey]).substring(0, 300));
    }

    const results = PAIRS.map(p => {
      // For multiple symbols, data is keyed by symbol name
      const quote = rawData[p.symbol];
      
      if (!quote || quote.status === 'error') {
        console.log(`No data for ${p.symbol}:`, quote?.message || 'missing');
        return {
          symbol: p.display,
          flag: p.flag,
          price: 0,
          change: 0,
          changePercent: 0,
          decimals: p.decimals,
        };
      }

      const price = parseFloat(quote.close || '0');
      const prevClose = parseFloat(quote.previous_close || '0');
      const change = parseFloat(quote.change || '0') || (price - prevClose);
      const changePercent = parseFloat(quote.percent_change || '0') || 
        (prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0);

      return {
        symbol: p.display,
        flag: p.flag,
        price,
        change,
        changePercent,
        decimals: p.decimals,
      };
    });

    return new Response(JSON.stringify({ data: results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Market ticker error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
