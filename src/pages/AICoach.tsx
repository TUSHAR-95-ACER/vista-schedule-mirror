import { useEffect, useRef, useState } from 'react';
import { Send, Bot, User, Sparkles, Activity, TrendingUp, AlertTriangle, Target, Brain, Shield, Compass, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/integrations/supabase/client';

type Msg = { role: 'user' | 'assistant'; content: string };
type Panels = {
  biggest_leak?: string; best_edge?: string; behavior_pattern?: string;
  execution_flaw?: string; risk_profile?: string; this_week_focus?: string;
};

const INTEL_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-intelligence`;
const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-coach`;

const PANEL_DEFS: Array<{ key: keyof Panels; title: string; icon: any; accent: string }> = [
  { key: 'biggest_leak', title: 'Biggest Leak', icon: AlertTriangle, accent: 'text-destructive bg-destructive/10' },
  { key: 'best_edge', title: 'Best Edge', icon: TrendingUp, accent: 'text-success bg-success/10' },
  { key: 'behavior_pattern', title: 'Behavior Pattern', icon: Brain, accent: 'text-primary bg-primary/10' },
  { key: 'execution_flaw', title: 'Execution Flaw', icon: Target, accent: 'text-warning bg-warning/10' },
  { key: 'risk_profile', title: 'Risk Profile', icon: Shield, accent: 'text-blue-500 bg-blue-500/10' },
  { key: 'this_week_focus', title: 'This Week Focus', icon: Compass, accent: 'text-primary bg-primary/10' },
];

export default function AICoach() {
  const [brief, setBrief] = useState('');
  const [panels, setPanels] = useState<Panels>({});
  const [loadingBrief, setLoadingBrief] = useState(true);
  const [loadingPanels, setLoadingPanels] = useState(true);
  const [deepMode, setDeepMode] = useState(false);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadIntel = async (mode: 'flash' | 'deep' = 'flash') => {
    setLoadingBrief(true);
    setLoadingPanels(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { toast.error('Please log in'); return; }
      const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

      const briefP = fetch(INTEL_URL, { method: 'POST', headers, body: JSON.stringify({ mode: 'brief', ...(mode === 'deep' ? { model: 'google/gemini-2.5-pro' } : {}) }) })
        .then(r => r.json()).then(j => { if (j.error) throw new Error(j.error); setBrief(j.brief || ''); }).finally(() => setLoadingBrief(false));
      const panelsP = fetch(INTEL_URL, { method: 'POST', headers, body: JSON.stringify({ mode: 'panels', ...(mode === 'deep' ? { model: 'google/gemini-2.5-pro' } : {}) }) })
        .then(r => r.json()).then(j => { if (j.error) throw new Error(j.error); setPanels(j); }).finally(() => setLoadingPanels(false));

      await Promise.allSettled([briefP, panelsP]);
    } catch (e) {
      console.error(e); toast.error('Failed to load intelligence');
    }
  };

  useEffect(() => { loadIntel('flash'); }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || chatLoading) return;
    const userMsg: Msg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setChatLoading(true);
    let acc = '';
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { toast.error('Please log in'); setChatLoading(false); return; }
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ messages: [...messages, userMsg] }),
      });
      if (!resp.ok || !resp.body) { toast.error('Chat failed'); setChatLoading(false); return; }
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      const upsert = (chunk: string) => {
        acc += chunk;
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant') return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: acc } : m);
          return [...prev, { role: 'assistant', content: acc }];
        });
      };
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buf.indexOf('\n')) !== -1) {
          let line = buf.slice(0, idx); buf = buf.slice(idx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const j = line.slice(6).trim();
          if (j === '[DONE]') { buf = ''; break; }
          try { const p = JSON.parse(j); const c = p.choices?.[0]?.delta?.content; if (c) upsert(c); }
          catch { buf = line + '\n' + buf; break; }
        }
      }
    } catch (e) { console.error(e); toast.error('Chat error'); }
    setChatLoading(false);
  };

  return (
    <div className="min-h-full bg-background">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
              <Activity className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-heading font-extrabold uppercase tracking-wide">Trading Intelligence Terminal</h1>
              <p className="text-xs text-muted-foreground">Your private AI analyst — already reviewed your journal.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={deepMode ? 'default' : 'outline'}
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => { const next = !deepMode; setDeepMode(next); loadIntel(next ? 'deep' : 'flash'); }}
            >
              <Sparkles className="h-3.5 w-3.5" /> {deepMode ? 'Deep Analysis' : 'Fast Coaching'}
            </Button>
            <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5" onClick={() => loadIntel(deepMode ? 'deep' : 'flash')} disabled={loadingBrief || loadingPanels}>
              <RefreshCw className={`h-3.5 w-3.5 ${(loadingBrief || loadingPanels) ? 'animate-spin' : ''}`} /> Refresh
            </Button>
          </div>
        </div>

        {/* TOP: Performance Brief */}
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-primary">This Week's Performance Brief</span>
            </div>
            {loadingBrief ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
                <Loader2 className="h-4 w-4 animate-spin" /> Analyzing your journal…
              </div>
            ) : brief ? (
              <div className="prose prose-sm dark:prose-invert max-w-none [&_ul]:my-2 [&_li]:my-0.5 [&_p]:my-1.5">
                <ReactMarkdown>{brief}</ReactMarkdown>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Not enough data yet. Log a few trades and journals first.</p>
            )}
          </div>
        </section>

        {/* MIDDLE: Intelligence Panels */}
        <section>
          <h2 className="text-xs font-mono font-bold uppercase tracking-widest text-muted-foreground mb-3">Intelligence Panels</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {PANEL_DEFS.map(({ key, title, icon: Icon, accent }) => (
              <div key={key} className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3 min-h-[140px]">
                <div className="flex items-center gap-2">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${accent}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <h3 className="text-xs font-bold uppercase tracking-wide text-foreground">{title}</h3>
                </div>
                {loadingPanels ? (
                  <div className="space-y-2 mt-1">
                    <div className="h-2 bg-muted rounded animate-pulse" />
                    <div className="h-2 bg-muted rounded animate-pulse w-4/5" />
                    <div className="h-2 bg-muted rounded animate-pulse w-3/5" />
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed text-foreground/85">
                    {panels[key] || <span className="text-muted-foreground italic">Not enough data yet.</span>}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* BOTTOM: Deeper Chat */}
        <section className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-muted/20 flex items-center gap-2">
            <Bot className="h-4 w-4 text-primary" />
            <span className="text-xs font-bold uppercase tracking-wide">Drill Down</span>
            <span className="text-[10px] text-muted-foreground">Ask deeper about your trading data…</span>
          </div>
          <div ref={scrollRef} className="max-h-[480px] overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Ask a follow-up question about your performance, leaks, or any specific setup.</p>
            ) : (
              messages.map((m, i) => (
                <div key={i} className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {m.role === 'assistant' && (
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="w-3.5 h-3.5 text-primary" />
                    </div>
                  )}
                  <div className={`max-w-[78%] rounded-xl px-3.5 py-2.5 text-sm ${
                    m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted border border-border'
                  }`}>
                    {m.role === 'assistant' ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1 [&_li]:my-0.5">
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{m.content}</p>
                    )}
                  </div>
                  {m.role === 'user' && (
                    <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                      <User className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
          <div className="border-t border-border p-3 flex gap-2 items-end">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Ask deeper about your trading data..."
              className="resize-none min-h-[40px] max-h-[120px] rounded-lg text-sm"
              rows={1}
              disabled={chatLoading}
            />
            <Button onClick={sendMessage} disabled={!input.trim() || chatLoading} size="icon" className="rounded-lg h-10 w-10 shrink-0">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
