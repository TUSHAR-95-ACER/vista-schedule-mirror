const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const FOREX_FACTORY_URL = 'https://nfs.faireconomy.media/ff_calendar_thisweek.json';

// Currency mapping for pairs
const PAIR_CURRENCIES: Record<string, string[]> = {
  EURUSD: ['EUR', 'USD'],
  GBPUSD: ['GBP', 'USD'],
  XAUUSD: ['USD', 'XAU', 'ALL'], // Gold reacts to all major USD news
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { pair, date, source } = await req.json();

    // Source: 'calendar' for economic calendar, 'news' for breaking news
    if (source === 'news') {
      return await fetchBreakingNews(pair, date);
    }

    // Default: economic calendar
    return await fetchEconomicCalendar(pair, date);
  } catch (error) {
    console.error('Error in macro-news:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function fetchEconomicCalendar(pair: string, date: string) {
  try {
    const response = await fetch(FOREX_FACTORY_URL);
    if (!response.ok) {
      throw new Error(`Forex Factory API failed: ${response.status}`);
    }

    const events = await response.json();
    const currencies = PAIR_CURRENCIES[pair] || ['USD'];

    // Filter by currency relevance
    let filtered = events.filter((event: any) => {
      if (event.impact !== 'High') return false;
      const eventCurrency = event.country?.toUpperCase();
      if (currencies.includes('ALL')) return true;
      return currencies.includes(eventCurrency);
    });

    // Filter by date if provided
    if (date) {
      filtered = filtered.filter((event: any) => {
        const eventDate = event.date?.split('T')[0] || '';
        return eventDate === date;
      });
    }

    // Map to clean format
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
  } catch (error) {
    console.error('Calendar fetch error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to fetch economic calendar' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function fetchBreakingNews(pair: string, _date: string) {
  const apiKey = Deno.env.get('NEWS_API_KEY');
  if (!apiKey) {
    return new Response(
      JSON.stringify({ success: false, error: 'NEWS_API_KEY not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Build query based on pair
  const queryMap: Record<string, string> = {
    EURUSD: '(EUR OR euro OR ECB OR "European Central Bank") AND (USD OR dollar OR "Federal Reserve" OR Fed)',
    GBPUSD: '(GBP OR pound OR sterling OR "Bank of England" OR BOE) AND (USD OR dollar OR "Federal Reserve" OR Fed)',
    XAUUSD: '(gold OR XAUUSD OR "precious metal") AND (USD OR dollar OR "Federal Reserve" OR Fed OR inflation OR CPI)',
  };

  const query = queryMap[pair] || 'forex USD economy';

  try {
    const url = new URL('https://newsapi.org/v2/everything');
    url.searchParams.set('q', query);
    url.searchParams.set('sortBy', 'publishedAt');
    url.searchParams.set('pageSize', '20');
    url.searchParams.set('language', 'en');
    url.searchParams.set('apiKey', apiKey);
    // Only fetch from approved domains
    url.searchParams.set('domains', 'reuters.com,bloomberg.com,ft.com,aljazeera.com,finance.yahoo.com,wsj.com,nytimes.com,investing.com');

    const response = await fetch(url.toString());
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`NewsAPI error [${response.status}]: ${JSON.stringify(data)}`);
    }

    const articles = (data.articles || []).map((article: any, i: number) => ({
      id: `news-${i}-${Date.now()}`,
      title: article.title,
      description: article.description,
      source: article.source?.name,
      url: article.url,
      publishedAt: article.publishedAt,
      imageUrl: article.urlToImage,
    }));

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
