import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const FOREX_FACTORY_URL = 'https://nfs.faireconomy.media/ff_calendar_thisweek.json';

// Auto-derive currencies from any pair
function getCurrenciesForPair(pair: string): string[] {
  const CURRENCY_MAP: Record<string, string> = {
    XAU: 'XAU', XAG: 'XAG', // Metals
  };
  // Standard forex pairs: first 3 chars = base, last 3 = quote
  const base = pair.substring(0, 3).toUpperCase();
  const quote = pair.substring(3, 6).toUpperCase();
  const currencies = [base, quote].map(c => CURRENCY_MAP[c] || c);
  // Gold/metals react to all major USD news
  if (currencies.includes('XAU') || currencies.includes('XAG')) {
    currencies.push('ALL');
  }
  return currencies;
}

// Simple in-memory cache (per isolate lifetime)
const cache: Record<string, { data: any; ts: number }> = {};
const CACHE_TTL = 60 * 1000; // 60 seconds

function getCached(key: string) {
  const entry = cache[key];
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
  return null;
}
function setCache(key: string, data: any) {
  cache[key] = { data, ts: Date.now() };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Auth check — prevent NewsAPI key abuse from anonymous callers
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
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
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { pair, date, source, currencies } = await req.json();
    const pairCurrencies = currencies || getCurrenciesForPair(pair || 'XAUUSD');

    if (source === 'news') {
      return await fetchBreakingNews(pair || 'XAUUSD', pairCurrencies);
    }
    return await fetchEconomicCalendar(pairCurrencies, date);
  } catch (error) {
    console.error('Error in macro-news:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function fetchEconomicCalendar(currencies: string[], date: string) {
  const cacheKey = `cal-${date}`;
  let events = getCached(cacheKey);

  if (!events) {
    try {
      const response = await fetch(FOREX_FACTORY_URL);
      if (!response.ok) throw new Error(`FF API failed: ${response.status}`);
      events = await response.json();
      setCache(cacheKey, events);
    } catch (error) {
      console.error('Calendar fetch error:', error);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch economic calendar' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  }

  let filtered = events.filter((event: any) => {
    if (event.impact !== 'High') return false;
    const eventCurrency = event.country?.toUpperCase();
    if (!eventCurrency) return false;
    if (currencies.includes('ALL')) return true;
    return currencies.some(c => c === eventCurrency);
  });

  if (date) {
    filtered = filtered.filter((event: any) => {
      const eventDate = event.date?.split('T')[0] || '';
      return eventDate === date;
    });
  }

  // Sort by time ascending
  filtered.sort((a: any, b: any) => {
    const ta = new Date(a.date || 0).getTime();
    const tb = new Date(b.date || 0).getTime();
    return ta - tb;
  });

  const mapped = filtered.map((event: any) => ({
    id: `${event.date}-${event.title}`,
    title: event.title,
    date: event.date,
    currency: event.country?.toUpperCase(),
    impact: event.impact,
    forecast: event.forecast || 'N/A',
    previous: event.previous || 'N/A',
    actual: event.actual || null,
  }));

  return new Response(
    JSON.stringify({ success: true, data: mapped }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function fetchBreakingNews(pair: string, currencies: string[]) {
  const apiKey = Deno.env.get('NEWS_API_KEY');
  if (!apiKey) {
    return new Response(
      JSON.stringify({ success: false, error: 'NEWS_API_KEY not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const cacheKey = `news-${pair}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return new Response(
      JSON.stringify({ success: true, data: cached }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Strict macro-only queries
  const isGold = currencies.includes('XAU') || currencies.includes('ALL');
  let query: string;

  if (isGold) {
    query = '("Federal Reserve" OR "interest rate" OR CPI OR NFP OR "non-farm" OR inflation OR FOMC OR "gold price" OR "safe haven" OR "oil crisis" OR sanctions OR "war escalation" OR "missile strike" OR "nuclear") AND (dollar OR USD OR gold OR economy OR markets)';
  } else {
    // Build currency-specific query
    const currencyTerms = currencies.map(c => {
      const map: Record<string, string> = {
        USD: 'USD OR dollar OR "Federal Reserve" OR Fed OR FOMC',
        EUR: 'EUR OR euro OR ECB OR "European Central Bank"',
        GBP: 'GBP OR pound OR sterling OR "Bank of England"',
        JPY: 'JPY OR yen OR "Bank of Japan"',
        AUD: 'AUD OR "Reserve Bank of Australia"',
        NZD: 'NZD OR "Reserve Bank of New Zealand"',
        CAD: 'CAD OR "Bank of Canada"',
        CHF: 'CHF OR franc OR "Swiss National Bank"',
      };
      return map[c] || c;
    }).join(' OR ');
    query = `(${currencyTerms}) AND (CPI OR NFP OR "interest rate" OR inflation OR FOMC OR "rate decision" OR GDP OR "trade war" OR tariff OR sanctions OR "war escalation" OR "oil crisis" OR "central bank" OR "economic data" OR recession OR employment)`;
  }

  query += ' NOT (crypto OR bitcoin OR ethereum OR celebrity OR entertainment OR sports OR NBA OR NFL OR Netflix OR TikTok OR "stock pick" OR IPO OR earnings OR "tech stock" OR startup)';

  try {
    const url = new URL('https://newsapi.org/v2/everything');
    url.searchParams.set('q', query);
    url.searchParams.set('sortBy', 'publishedAt');
    url.searchParams.set('pageSize', '25');
    url.searchParams.set('language', 'en');
    url.searchParams.set('apiKey', apiKey);
    url.searchParams.set('domains', 'reuters.com,bloomberg.com,ft.com,wsj.com,investing.com');

    const response = await fetch(url.toString());
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`NewsAPI error [${response.status}]: ${JSON.stringify(data)}`);
    }

    // Strict server-side impact validation
    const JUNK = /\b(crypto|bitcoin|ethereum|solana|nft|celebrity|kardashian|hollywood|netflix|spotify|tiktok|instagram|sports|nba|nfl|mlb|stock pick|penny stock|IPO|startup|app launch|product launch|gaming|esports|fashion|music|movie)\b/i;

    // Must contain at least one macro keyword to pass
    const MACRO_REQUIRED = /\b(Federal Reserve|Fed |FOMC|CPI|NFP|inflation|interest rate|rate hike|rate cut|central bank|ECB|BOE|GDP|unemployment|payroll|treasury|bond yield|dollar|USD|gold|oil|crude|sanctions|war|military|missile|nuclear|tariff|trade war|recession|economic|fiscal|monetary policy)\b/i;

    const articles = (data.articles || [])
      .filter((article: any) => {
        const text = `${article.title || ''} ${article.description || ''}`;
        if (JUNK.test(text)) return false;
        if (!MACRO_REQUIRED.test(text)) return false;
        return true;
      })
      .slice(0, 15)
      .map((article: any, i: number) => {
        const text = `${article.title || ''} ${article.description || ''}`;
        // Classify impact
        const HIGH_IMPACT = /\b(Federal Reserve|FOMC|CPI|NFP|interest rate|rate hike|rate cut|war escalation|missile strike|nuclear|oil crisis|sanctions|emergency)\b/i;
        const impact = HIGH_IMPACT.test(text) ? 'high' : 'medium';

        return {
          id: `news-${i}-${Date.now()}`,
          title: article.title,
          description: article.description,
          source: article.source?.name,
          url: article.url,
          publishedAt: article.publishedAt,
          imageUrl: article.urlToImage,
          impact,
        };
      });

    setCache(cacheKey, articles);

    return new Response(
      JSON.stringify({ success: true, data: articles }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('News fetch error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to fetch breaking news' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}
