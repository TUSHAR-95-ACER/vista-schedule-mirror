import { useEffect, useRef, useState } from 'react';
import { Send, Sparkles, Paperclip, FileText, BookOpen, ArrowLeftRight, Square, Database, Zap, Brain, TrendingUp, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/integrations/supabase/client';
import { useAICoach, type AICoachScope } from '@/contexts/AICoachContext';
import { cn } from '@/lib/utils';

type Msg = { role: 'user' | 'assistant'; content: string };
const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-coach`;

const SCOPE_META: Record<AICoachScope, { label: string; icon: any; placeholder: string; hint: string }> = {
  page:  { label: 'Page',    icon: FileText,       placeholder: 'Ask about this page…',                  hint: 'Scoped to the visible page' },
  trade: { label: 'Trade',   icon: ArrowLeftRight, placeholder: 'Ask about this trade…',                 hint: 'Single trade analysis' },
  note:  { label: 'Note',    icon: BookOpen,       placeholder: 'Ask about this note…',                  hint: 'Single notebook entry' },
  full:  { label: 'Journal', icon: Database,       placeholder: 'Ask anything across your journal…',     hint: 'Deep mentor · full history' },
};

const QUICK_PROMPTS: { label: string; prompt: string; icon: any }[] = [
  { label: 'Biggest leak',       icon: Zap,        prompt: 'What is my single biggest recurring leak this month? Be specific with mistake tag, count, and one concrete fix.' },
  { label: 'Best setup',         icon: Target,     prompt: 'Which setup has the highest win-rate and average RR for me? Give numbers.' },
  { label: 'Emotional pattern',  icon: Brain,      prompt: 'What emotional pattern shows up most in my journal? Reference specific trades.' },
  { label: 'Overtrading?',       icon: TrendingUp, prompt: 'Am I overtrading? Check days I exceeded planned max_trades and any loss clusters.' },
  { label: 'Plan vs execution',  icon: FileText,   prompt: 'Where am I deviating most from my daily/weekly plans?' },
  { label: 'London vs NY',       icon: ArrowLeftRight, prompt: 'Compare my London vs NY session performance — win-rate, RR, and net P/L.' },
];

export function AICoachDrawer() {
  const { open, closeDrawer, scope, setScope, getActiveContext } = useAICoach();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  useEffect(() => {
    if (open) setTimeout(() => textareaRef.current?.focus(), 150);
  }, [open]);

  const filesToDataUrls = async (files: FileList | File[]): Promise<string[]> => {
    const arr = Array.from(files).filter(f => f.type.startsWith('image/')).slice(0, 3);
    return Promise.all(arr.map(f => new Promise<string>((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result as string);
      r.onerror = rej;
      r.readAsDataURL(f);
    })));
  };

  const activeCtx = getActiveContext();
  const ScopeIcon = SCOPE_META[scope].icon;

  const send = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if ((!text && pendingImages.length === 0) || loading) return;
    const userMsg: Msg = { role: 'user', content: text || 'Analyze this.' };
    const sentImages = pendingImages;
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setPendingImages([]);
    setLoading(true);
    let acc = '';
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { toast.error('Please log in'); setLoading(false); return; }
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          attachments: sentImages,
          pageContext: { scope, label: activeCtx.label, detail: activeCtx.detail },
        }),
        signal: ctrl.signal,
      });
      if (!resp.ok || !resp.body) {
        let msg = `Chat failed (${resp.status})`;
        try { const j = await resp.json(); if (j?.error) msg = j.error; } catch {}
        if (resp.status === 402) msg = 'AI credits exhausted — add credits in Settings → Workspace → Usage.';
        if (resp.status === 429) msg = 'Rate limited — please slow down and try again.';
        toast.error(msg);
        setLoading(false);
        return;
      }
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
    } catch (e: any) {
      if (e?.name !== 'AbortError') { console.error(e); toast.error('Chat error'); }
    }
    setLoading(false);
    abortRef.current = null;
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const stop = () => { abortRef.current?.abort(); abortRef.current = null; setLoading(false); };

  const scopes: AICoachScope[] = ['page', 'full'];

  return (
    <Sheet open={open} onOpenChange={(o) => !o && closeDrawer()}>
      <SheetContent
        side="right"
        className="p-0 w-[580px] sm:w-[580px] max-w-[96vw] flex flex-col gap-0 border-l border-border bg-gradient-to-b from-background via-background to-muted/20"
      >
        {/* HEADER — premium gradient strip */}
        <div className="relative shrink-0 border-b border-border/60 bg-gradient-to-r from-primary/[0.08] via-background to-background overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.18),transparent_60%)] pointer-events-none" />
          <div className="relative h-12 pl-4 pr-12 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-[0_0_18px_hsl(var(--primary)/0.45)]">
                  <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-success ring-2 ring-background animate-pulse" />
              </div>
              <div className="leading-tight">
                <div className="text-[11px] font-heading font-bold uppercase tracking-[0.18em] text-foreground">AI Coach</div>
                <div className="text-[9.5px] uppercase tracking-wider text-muted-foreground/80">{SCOPE_META[scope].hint}</div>
              </div>
            </div>
            {messages.length > 0 && (
              <button
                onClick={() => setMessages([])}
                className="text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground border border-border/60 rounded-md px-2 h-6"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* SCOPE — segmented pill */}
        <div className="px-3 pt-2 pb-2 shrink-0">
          <div className="inline-flex p-1 rounded-xl bg-muted/40 border border-border/60 w-full backdrop-blur-sm">
            {scopes.map((s) => {
              const meta = SCOPE_META[s];
              const Icon = meta.icon;
              const active = scope === s;
              return (
                <button
                  key={s}
                  onClick={() => setScope(s)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 px-2 h-7 rounded-lg text-[10.5px] font-semibold uppercase tracking-wider transition-all',
                    active
                      ? 'bg-background text-foreground shadow-sm ring-1 ring-border/80'
                      : 'text-muted-foreground hover:text-foreground hover:bg-background/40'
                  )}
                >
                  <Icon className="h-3 w-3" />
                  {meta.label}
                </button>
              );
            })}
          </div>
          <div className="mt-1.5 px-1 flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
            <ScopeIcon className="h-3 w-3 text-primary shrink-0" />
            <span className="truncate"><span className="text-primary font-semibold">↳ </span>{activeCtx.label}</span>
          </div>
        </div>

        {/* CHAT */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {messages.length === 0 ? (
            <div className="pt-1">
              <div className="text-center mb-3.5">
                <p className="text-[12px] font-heading font-bold uppercase tracking-[0.14em] bg-gradient-to-r from-primary via-foreground to-primary bg-clip-text text-transparent">
                  {scope === 'full' ? 'Deep Mentor Mode' : 'Trading AI Coach'}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1 px-4">
                  {scope === 'full'
                    ? 'Full journal access — trades, plans, psychology, macro & notebook.'
                    : `Ask about ${SCOPE_META[scope].label.toLowerCase()} or tap a prompt below.`}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {QUICK_PROMPTS.map((q) => {
                  const Icon = q.icon;
                  return (
                    <button
                      key={q.label}
                      onClick={() => send(q.prompt)}
                      className="group relative flex items-center gap-2 px-2.5 py-2 rounded-lg border border-border/60 bg-card/60 hover:bg-card hover:border-primary/40 hover:shadow-[0_0_0_1px_hsl(var(--primary)/0.2)] text-left transition-all"
                    >
                      <Icon className="h-3.5 w-3.5 text-primary/70 group-hover:text-primary shrink-0" />
                      <span className="text-[11px] font-medium text-foreground/85 group-hover:text-foreground truncate">{q.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={cn('flex gap-2 animate-fade-in', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                {m.role === 'assistant' && (
                  <div className="h-6 w-6 rounded-md bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/30 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="h-3 w-3 text-primary" />
                  </div>
                )}
                {m.role === 'user' ? (
                  <div className="max-w-[82%] rounded-2xl rounded-tr-md px-3.5 py-2 bg-gradient-to-br from-primary to-primary/85 text-primary-foreground text-[13px] leading-relaxed whitespace-pre-wrap shadow-md">
                    {m.content}
                  </div>
                ) : (
                  <div className="max-w-[88%] rounded-2xl rounded-tl-md px-3.5 py-2 bg-card/80 border border-border/60 text-[13px] leading-relaxed text-foreground shadow-sm backdrop-blur-sm">
                    <div className="prose prose-sm dark:prose-invert max-w-none
                      [&_p]:my-1.5 [&_p]:leading-relaxed [&_p:first-child]:mt-0 [&_p:last-child]:mb-0
                      [&_ul]:my-1.5 [&_ul]:pl-4 [&_li]:my-0.5
                      [&_strong]:text-primary [&_strong]:font-semibold
                      [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-[12px]
                      [&_h1]:text-sm [&_h2]:text-sm [&_h3]:text-sm [&_h1]:font-bold [&_h2]:font-bold [&_h3]:font-semibold
                      [&_h1]:uppercase [&_h1]:tracking-wider [&_h1]:text-primary">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                      {loading && i === messages.length - 1 && (
                        <span className="inline-block w-1.5 h-3.5 ml-0.5 align-middle bg-primary animate-pulse rounded-sm" />
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
          {loading && messages[messages.length - 1]?.role === 'user' && (
            <div className="flex items-center gap-2 pl-8">
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary/80 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-primary/80 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-primary/80 animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Analyzing journal</span>
            </div>
          )}
        </div>

        {/* Pending images */}
        {pendingImages.length > 0 && (
          <div className="border-t border-border/60 px-3 pt-2 flex gap-2 flex-wrap shrink-0">
            {pendingImages.map((src, i) => (
              <div key={i} className="relative w-12 h-12 rounded-md overflow-hidden border border-border">
                <img src={src} alt="attachment" className="w-full h-full object-cover" />
                <button
                  onClick={() => setPendingImages(prev => prev.filter((_, idx) => idx !== i))}
                  className="absolute top-0 right-0 bg-background/80 rounded-bl px-1 text-[10px] hover:bg-background"
                >×</button>
              </div>
            ))}
          </div>
        )}

        {/* COMPOSER */}
        <div className="border-t border-border/60 p-2.5 shrink-0 bg-gradient-to-t from-card/80 to-transparent backdrop-blur-sm">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={async (e) => {
              if (e.target.files) {
                const urls = await filesToDataUrls(e.target.files);
                setPendingImages(prev => [...prev, ...urls].slice(0, 3));
                e.target.value = '';
              }
            }}
          />
          <div className="relative rounded-xl border border-border/70 bg-background shadow-sm focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/15 transition-all">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onPaste={async (e) => {
                const items = Array.from(e.clipboardData?.items || []);
                const files = items.map(i => i.getAsFile()).filter((f): f is File => !!f && f.type.startsWith('image/'));
                if (files.length) {
                  e.preventDefault();
                  const urls = await filesToDataUrls(files);
                  setPendingImages(prev => [...prev, ...urls].slice(0, 3));
                }
              }}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder={SCOPE_META[scope].placeholder}
              className="resize-none min-h-[42px] max-h-[140px] rounded-xl border-0 bg-transparent text-sm pr-20 pl-3.5 pt-2.5 focus-visible:ring-0 focus-visible:ring-offset-0"
              rows={2}
            />
            <div className="absolute right-1.5 bottom-1.5 flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="rounded-lg h-7 w-7"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                title="Attach chart"
              >
                <Paperclip className="w-3.5 h-3.5" />
              </Button>
              {loading ? (
                <Button onClick={stop} size="icon" variant="secondary" className="rounded-lg h-7 w-7" title="Stop">
                  <Square className="w-3 h-3 fill-current" />
                </Button>
              ) : (
                <Button
                  onClick={() => send()}
                  disabled={!input.trim() && pendingImages.length === 0}
                  size="icon"
                  className="rounded-lg h-7 w-7 bg-gradient-to-br from-primary to-primary/80 hover:from-primary hover:to-primary shadow-[0_0_12px_hsl(var(--primary)/0.4)]"
                >
                  <Send className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>
          <div className="mt-1 text-[10px] text-muted-foreground/70 px-1 flex justify-between">
            <span>Enter to send · Shift+Enter newline · Paste images</span>
            {messages.length > 0 && <span>{messages.length} msg</span>}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
