import React, { createContext, useContext } from 'react';
import { useMacroNews, NewsPair, DateFilter, CalendarEvent, NewsArticle, NewsAlert } from '@/hooks/useMacroNews';

interface MacroNewsContextType {
  pair: NewsPair;
  setPair: (p: NewsPair) => void;
  dateFilter: DateFilter;
  setDateFilter: (d: DateFilter) => void;
  customDate: Date;
  setCustomDate: (d: Date) => void;
  calendarEvents: CalendarEvent[];
  news: NewsArticle[];
  alerts: NewsAlert[];
  markAlertSeen: (id: string) => void;
  markAllSeen: () => void;
  loading: boolean;
  newsLoading: boolean;
  refresh: () => void;
}

const MacroNewsContext = createContext<MacroNewsContextType | null>(null);

export function MacroNewsProvider({ children }: { children: React.ReactNode }) {
  const value = useMacroNews();
  return <MacroNewsContext.Provider value={value}>{children}</MacroNewsContext.Provider>;
}

export function useMacroNewsContext() {
  const ctx = useContext(MacroNewsContext);
  if (!ctx) throw new Error('useMacroNewsContext must be used within MacroNewsProvider');
  return ctx;
}
