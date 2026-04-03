import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export type DateFilter = 'today' | 'tomorrow' | 'custom';

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  currency: string;
  impact: string;
  forecast: string;
  previous: string;
  actual: string | null;
}

export interface NewsArticle {
  id: string;
  title: string;
  description: string;
  source: string;
  url: string;
  publishedAt: string;
  imageUrl: string | null;
  impact: 'high' | 'medium';
}

// Default pairs
const DEFAULT_PAIRS = ['EURUSD', 'GBPUSD', 'XAUUSD'];
const PAIRS_STORAGE_KEY = 'macro-news-pairs';

function loadPairs(): string[] {
  try {
    const stored = localStorage.getItem(PAIRS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : DEFAULT_PAIRS;
  } catch { return DEFAULT_PAIRS; }
}

function savePairs(pairs: string[]) {
  localStorage.setItem(PAIRS_STORAGE_KEY, JSON.stringify(pairs));
}

// Client-side cache
const clientCache: Record<string, { data: any; ts: number }> = {};
const CLIENT_CACHE_TTL = 60 * 1000; // 60 seconds to match auto-refresh

function getCached(key: string) {
  const e = clientCache[key];
  if (e && Date.now() - e.ts < CLIENT_CACHE_TTL) return e.data;
  return null;
}
function setClientCache(key: string, data: any) {
  clientCache[key] = { data, ts: Date.now() };
}

export function useMacroNews() {
  const [pairs, setPairsState] = useState<string[]>(loadPairs);
  const [activePair, setActivePair] = useState<string>(() => loadPairs()[0] || 'XAUUSD');
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [customDate, setCustomDate] = useState<Date>(new Date());
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [newsLoading, setNewsLoading] = useState(false);
  const fetchingRef = useRef(false);

  const setPairs = useCallback((newPairs: string[]) => {
    setPairsState(newPairs);
    savePairs(newPairs);
    if (!newPairs.includes(activePair) && newPairs.length > 0) {
      setActivePair(newPairs[0]);
    }
  }, [activePair]);

  const addPair = useCallback((pair: string) => {
    const upper = pair.toUpperCase().replace(/[^A-Z]/g, '');
    if (upper.length < 6) return;
    const formatted = upper.substring(0, 6);
    setPairsState(prev => {
      if (prev.includes(formatted)) return prev;
      const next = [...prev, formatted];
      savePairs(next);
      return next;
    });
  }, []);

  const removePair = useCallback((pair: string) => {
    setPairsState(prev => {
      const next = prev.filter(p => p !== pair);
      if (next.length === 0) return prev; // don't allow empty
      savePairs(next);
      if (activePair === pair) setActivePair(next[0]);
      return next;
    });
  }, [activePair]);

  const getDateString = useCallback(() => {
    if (dateFilter === 'today') return format(new Date(), 'yyyy-MM-dd');
    if (dateFilter === 'tomorrow') {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      return format(d, 'yyyy-MM-dd');
    }
    return format(customDate, 'yyyy-MM-dd');
  }, [dateFilter, customDate]);

  const fetchCalendar = useCallback(async () => {
    const dateStr = getDateString();
    const cacheKey = `cal-${activePair}-${dateStr}`;
    const cached = getCached(cacheKey);
    if (cached) { setCalendarEvents(cached); return; }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('macro-news', {
        body: { pair: activePair, date: dateStr, source: 'calendar' },
      });
      if (error) throw error;
      if (data?.success) {
        setCalendarEvents(data.data || []);
        setClientCache(cacheKey, data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch calendar:', err);
    } finally {
      setLoading(false);
    }
  }, [activePair, getDateString]);

  const fetchNews = useCallback(async () => {
    const cacheKey = `news-${activePair}`;
    const cached = getCached(cacheKey);
    if (cached) { setNews(cached); return; }

    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setNewsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('macro-news', {
        body: { pair: activePair, source: 'news' },
      });
      if (error) throw error;
      if (data?.success) {
        const articles: NewsArticle[] = data.data || [];
        setNews(articles);
        setClientCache(cacheKey, articles);
      }
    } catch (err) {
      console.error('Failed to fetch news:', err);
    } finally {
      setNewsLoading(false);
      fetchingRef.current = false;
    }
  }, [activePair]);

  // Fetch on filter change
  useEffect(() => {
    fetchCalendar();
    fetchNews();
  }, [fetchCalendar, fetchNews]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      Object.keys(clientCache).forEach(k => delete clientCache[k]);
      fetchCalendar();
      fetchNews();
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchCalendar, fetchNews]);

  return {
    pairs, activePair, setActivePair,
    addPair, removePair,
    dateFilter, setDateFilter,
    customDate, setCustomDate,
    calendarEvents, news,
    loading, newsLoading,
    refresh: () => {
      Object.keys(clientCache).forEach(k => delete clientCache[k]);
      fetchCalendar();
      fetchNews();
    },
  };
}
