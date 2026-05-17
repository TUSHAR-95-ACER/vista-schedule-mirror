import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

export type AICoachScope = 'page' | 'trade' | 'note';

export interface AICoachContextSnapshot {
  /** Short label shown in the drawer (e.g. "Trade • GBPUSD • 23 Apr 2026"). */
  label: string;
  /** Verbose text payload sent to the AI as additional context. */
  detail: string;
}

interface AICoachState {
  open: boolean;
  scope: AICoachScope;
  pageLabel: string;
  pageDetail: string;
  trade: AICoachContextSnapshot | null;
  note: AICoachContextSnapshot | null;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  setScope: (s: AICoachScope) => void;
  setPage: (snap: AICoachContextSnapshot) => void;
  setTrade: (snap: AICoachContextSnapshot | null) => void;
  setNote: (snap: AICoachContextSnapshot | null) => void;
  getActiveContext: () => AICoachContextSnapshot;
}

const Ctx = createContext<AICoachState | null>(null);

export function AICoachProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<AICoachScope>('page');
  const [pageLabel, setPageLabel] = useState('Current Page');
  const [pageDetail, setPageDetail] = useState('');
  const [trade, setTradeState] = useState<AICoachContextSnapshot | null>(null);
  const [note, setNoteState] = useState<AICoachContextSnapshot | null>(null);

  const setPage = useCallback((snap: AICoachContextSnapshot) => {
    setPageLabel(snap.label);
    setPageDetail(snap.detail);
  }, []);

  // Auto-promote scope when a trade/note is registered, demote when cleared
  const setTrade = useCallback((snap: AICoachContextSnapshot | null) => {
    setTradeState(snap);
    if (snap) setScope('trade');
    else setScope((s) => (s === 'trade' ? 'page' : s));
  }, []);
  const setNote = useCallback((snap: AICoachContextSnapshot | null) => {
    setNoteState(snap);
    if (snap) setScope('note');
    else setScope((s) => (s === 'note' ? 'page' : s));
  }, []);

  const getActiveContext = useCallback((): AICoachContextSnapshot => {
    if (scope === 'trade' && trade) return trade;
    if (scope === 'note' && note) return note;
    return { label: pageLabel, detail: pageDetail };
  }, [scope, trade, note, pageLabel, pageDetail]);

  const value = useMemo<AICoachState>(() => ({
    open, scope, pageLabel, pageDetail, trade, note,
    openDrawer: () => setOpen(true),
    closeDrawer: () => setOpen(false),
    toggleDrawer: () => setOpen((o) => !o),
    setScope, setPage, setTrade, setNote, getActiveContext,
  }), [open, scope, pageLabel, pageDetail, trade, note, setPage, setTrade, setNote, getActiveContext]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAICoach() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAICoach must be used inside <AICoachProvider>');
  return v;
}

/**
 * Helper hook: registers a page-level context snapshot for the duration of the
 * component lifetime. Pass a memoized object to avoid update loops.
 */
export function useRegisterPageContext(snap: AICoachContextSnapshot | null) {
  const { setPage } = useAICoach();
  const lastRef = useRef<string>('');
  useEffect(() => {
    if (!snap) return;
    const key = snap.label + '||' + snap.detail;
    if (key === lastRef.current) return;
    lastRef.current = key;
    setPage(snap);
  }, [snap, setPage]);
}
