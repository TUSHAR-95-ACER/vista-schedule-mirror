import { useEffect, useRef, useState } from 'react';
import { Send, X, Sparkles, Paperclip, FileText, BookOpen, ArrowLeftRight, Square } from 'lucide-react';
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

const SCOPE_META: Record<AICoachScope, { label: string; icon: any }> = {
  page: { label: 'Page', icon: FileText },
  trade: { label: 'Trade', icon: ArrowLeftRight },
  note: { label: 'Note', icon: BookOpen },
};

const QUICK_PROMPTS: { label: string; prompt: string }[] = [
  { label: 'Biggest leak this month', prompt: 'What is my single biggest recurring leak this month? Be specific with mistake tag, count, and one concrete fix.' },
  { label: 'Best setup', prompt: 'Which setup has the highest win-rate and average RR for me? Give numbers.' },
  { label: 'Emotional pattern', prompt: 'What emotional pattern shows up most in my journal? Reference specific trades.' },
  { label: 'Am I overtrading?', prompt: 'Am I overtrading? Check days I exceeded planned max_trades and any loss clusters.' },
  { label: 'Plan vs execution', prompt: 'Where am I deviating most from my daily/weekly plans? Bias mismatches, skipped setups, or risk breaches.' },
  { label: 'Best/worst session', prompt: 'Which session is my strongest and weakest by win-rate and RR?' },
];

export function AICoachTriggerButton() {
  const { openDrawer } = useAICoach();
  return (
    <button
      onClick={openDrawer}
      title="AI Coach"
      className="fixed top-3 right-4 z-40 h-8 px-3 rounded-md border border-primary/40 bg-card/90 backdrop-blur text-foreground hover:bg-primary/10 transition-colors flex items-center gap-1.5 shadow-sm text-[11px] font-semibold uppercase tracking-wider"
    >
      <Sparkles className="h-3.5 w-3.5 text-primary" />
      <span>AI Coach</span>
    </button>
  );
}

export function AICoachDrawer() {
  const { open, closeDrawer, scope, setScope, trade, note, getActiveContext } = useAICoach();
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

  const scopes: AICoachScope[] = ['page', 'trade', 'note'];
  const isScopeAvailable = (s: AICoachScope) => s === 'page' || (s === 'trade' ? !!trade : !!note);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && closeDrawer()}>
      <SheetContent
        side="right"
        className="p-0 w-[560px] sm:w-[560px] max-w-[95vw] flex flex-col gap-0 border-l border-border"
      >
        {/* Header */}
        <div className="h-12 border-b border-border px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="text-[12px] font-heading font-bold uppercase tracking-widest">AI Coach</span>
            {messages.length > 0 && (
              <button
                onClick={() => setMessages([])}
                className="ml-2 text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            )}
          </div>
          <button onClick={closeDrawer} className="h-7 w-7 rounded-md hover:bg-accent flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scope segmented */}
        <div className="px-4 py-2 border-b border-border bg-muted/10 shrink-0">
          <div className="inline-flex p-0.5 rounded-md bg-muted/40 border border-border">
            {scopes.map((s) => {
              const meta = SCOPE_META[s];
              const Icon = meta.icon;
              const active = scope === s;
              const available = isScopeAvailable(s);
              return (
                <button
                  key={s}
                  onClick={() => available && setScope(s)}
                  disabled={!available}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 h-6 rounded text-[10.5px] font-semibold uppercase tracking-wider transition-colors',
                    active
                      ? 'bg-background text-foreground shadow-sm'
                      : available ? 'text-muted-foreground hover:text-foreground' : 'text-muted-foreground/40 cursor-not-allowed'
                  )}
                >
                  <Icon className="h-3 w-3" />
                  {meta.label}
                </button>
              );
            })}
          </div>
          <div className="mt-1.5 text-[10px] text-muted-foreground truncate">
            <span className="text-primary font-semibold">↳ </span>{activeCtx.label}
          </div>
        </div>

        {/* Chat scroll area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {messages.length === 0 ? (
            <div className="py-6">
              <div className="text-center mb-5">
                <div className="mx-auto h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <p className="text-sm font-heading font-bold uppercase tracking-wider mb-1">Trading AI Coach</p>
                <p className="text-xs text-muted-foreground max-w-[320px] mx-auto leading-relaxed">
                  I see your full journal. Ask anything, or start with one of these.
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5 justify-center max-w-[440px] mx-auto">
                {QUICK_PROMPTS.map((q) => (
                  <button
                    key={q.label}
                    onClick={() => send(q.prompt)}
                    className="px-2.5 h-7 rounded-full border border-border bg-card hover:bg-accent text-[11px] font-medium text-foreground/80 hover:text-foreground transition-colors"
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={cn('flex animate-fade-in', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                {m.role === 'user' ? (
                  <div className="max-w-[88%] rounded-2xl rounded-tr-md px-3.5 py-2 bg-primary text-primary-foreground text-[13px] leading-relaxed whitespace-pre-wrap shadow-sm">
                    {m.content}
                  </div>
                ) : (
                  <div className="max-w-[92%] text-[13px] leading-relaxed text-foreground">
                    <div className="prose prose-sm dark:prose-invert max-w-none
                      [&_p]:my-1.5 [&_p]:leading-relaxed
                      [&_ul]:my-1.5 [&_ul]:pl-4 [&_li]:my-0.5
                      [&_strong]:text-foreground [&_strong]:font-semibold
                      [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-[12px]
                      [&_h1]:text-sm [&_h2]:text-sm [&_h3]:text-sm">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                      {loading && i === messages.length - 1 && (
                        <span className="inline-block w-1.5 h-3.5 ml-0.5 align-middle bg-primary animate-pulse" />
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
          {loading && messages[messages.length - 1]?.role === 'user' && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary/70 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-primary/70 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-primary/70 animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
              <span className="text-[11px] uppercase tracking-wider">Analyzing journal</span>
            </div>
          )}
        </div>

        {/* Pending image previews */}
        {pendingImages.length > 0 && (
          <div className="border-t border-border px-3 pt-2 flex gap-2 flex-wrap shrink-0">
            {pendingImages.map((src, i) => (
              <div key={i} className="relative w-14 h-14 rounded-md overflow-hidden border border-border">
                <img src={src} alt="attachment" className="w-full h-full object-cover" />
                <button
                  onClick={() => setPendingImages(prev => prev.filter((_, idx) => idx !== i))}
                  className="absolute top-0 right-0 bg-background/80 rounded-bl p-0.5 hover:bg-background"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Composer */}
        <div className="border-t border-border p-3 shrink-0 bg-card/50">
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
          <div className="relative rounded-lg border border-border bg-background focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-colors">
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
              placeholder={`Ask about ${SCOPE_META[scope].label.toLowerCase()}…`}
              className="resize-none min-h-[44px] max-h-[160px] rounded-lg border-0 bg-transparent text-sm pr-20 pl-3 pt-2.5 focus-visible:ring-0 focus-visible:ring-offset-0"
              rows={2}
            />
            <div className="absolute right-1.5 bottom-1.5 flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="rounded-md h-7 w-7"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                title="Attach chart"
              >
                <Paperclip className="w-3.5 h-3.5" />
              </Button>
              {loading ? (
                <Button onClick={stop} size="icon" variant="secondary" className="rounded-md h-7 w-7" title="Stop">
                  <Square className="w-3 h-3 fill-current" />
                </Button>
              ) : (
                <Button
                  onClick={() => send()}
                  disabled={!input.trim() && pendingImages.length === 0}
                  size="icon"
                  className="rounded-md h-7 w-7"
                >
                  <Send className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>
          <div className="mt-1.5 text-[10px] text-muted-foreground/70 px-1 flex justify-between">
            <span>Enter to send · Shift+Enter for newline · Paste images</span>
            {messages.length > 0 && <span>{messages.length} msg</span>}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
