import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYMBOLS = [
  { symbol: 'EUR/USD', display: 'EURUSD', flag: '🇪🇺' },
  { symbol: 'GBP/USD', display: 'GBPUSD', flag: '🇬🇧' },
  { symbol: 'XAU/USD', display: 'XAUUSD', flag: '🥇' },
  { symbol: 'XAG/USD', display: 'XAGUSD', flag: '🥈' },
  { symbol: 'BTC/USD', display: 'BTCUSD', flag: '₿' },
  { symbol: 'USD/CAD', display: 'USDCAD', flag: '🇨🇦' },
];

const STOCK_SYMBOLS = [
  { symbol: 'TSLA', display: 'TESLA', flag: '🚗' },
  { symbol: 'NVDA', display: 'NVIDIA', flag: '🎮' },
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
    const allSymbols = [...SYMBOLS, ...STOCK_SYMBOLS];
    const symbolStr = allSymbols.map(s => s.symbol).join(',');

    const response = await fetch(
      `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(symbolStr)}&apikey=${apiKey}`
    );

    if (!response.ok) {
      throw new Error(`Twelve Data API error: ${response.status}`);
    }

    const data = await response.json();

    const results = allSymbols.map(s => {
      const quote = data[s.symbol] || data;
      const price = parseFloat(quote?.close || quote?.price || '0');
      const prevClose = parseFloat(quote?.previous_close || '0');
      const change = price - prevClose;
      const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;

      return {
        symbol: s.display,
        flag: s.flag,
        price: price,
        change: change,
        changePercent: changePercent,
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
