import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export type NewsPair = 'EURUSD' | 'GBPUSD' | 'XAUUSD';
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
}

export interface NewsAlert {
  id: string;
  title: string;
  source: string;
  seen: boolean;
  publishedAt: string;
}

const SEEN_KEY = 'macro-news-seen';

function getSeenIds(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'));
  } catch { return new Set(); }
}

function markSeen(id: string) {
  const seen = getSeenIds();
  seen.add(id);
  localStorage.setItem(SEEN_KEY, JSON.stringify([...seen]));
}

export function useMacroNews() {
  const [pair, setPair] = useState<NewsPair>('XAUUSD');
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [customDate, setCustomDate] = useState<Date>(new Date());
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [alerts, setAlerts] = useState<NewsAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [newsLoading, setNewsLoading] = useState(false);

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
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('macro-news', {
        body: { pair, date: getDateString(), source: 'calendar' },
      });
      if (error) throw error;
      if (data?.success) {
        setCalendarEvents(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch calendar:', err);
    } finally {
      setLoading(false);
    }
  }, [pair, getDateString]);

  const fetchNews = useCallback(async () => {
    setNewsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('macro-news', {
        body: { pair, date: getDateString(), source: 'news' },
      });
      if (error) throw error;
      if (data?.success) {
        const articles: NewsArticle[] = data.data || [];
        setNews(articles);

        // Build alerts from new unseen articles
        const seen = getSeenIds();
        const newAlerts: NewsAlert[] = articles
          .filter(a => !seen.has(a.id))
          .slice(0, 5)
          .map(a => ({
            id: a.id,
            title: a.title,
            source: a.source,
            seen: false,
            publishedAt: a.publishedAt,
          }));
        setAlerts(prev => {
          const existingIds = new Set(prev.map(a => a.id));
          const fresh = newAlerts.filter(a => !existingIds.has(a.id));
          return [...fresh, ...prev];
        });
      }
    } catch (err) {
      console.error('Failed to fetch news:', err);
    } finally {
      setNewsLoading(false);
    }
  }, [pair, getDateString]);

  const markAlertSeen = useCallback((id: string) => {
    markSeen(id);
    setAlerts(prev => prev.filter(a => a.id !== id));
  }, []);

  const markAllSeen = useCallback(() => {
    alerts.forEach(a => markSeen(a.id));
    setAlerts([]);
  }, [alerts]);

  // Fetch on mount and when filters change
  useEffect(() => {
    fetchCalendar();
    fetchNews();
  }, [fetchCalendar, fetchNews]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchCalendar();
      fetchNews();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchCalendar, fetchNews]);

  return {
    pair, setPair,
    dateFilter, setDateFilter,
    customDate, setCustomDate,
    calendarEvents, news,
    alerts, markAlertSeen, markAllSeen,
    loading, newsLoading,
    refresh: () => { fetchCalendar(); fetchNews(); },
  };
}
