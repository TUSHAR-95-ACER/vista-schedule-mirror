import { useEffect, useRef, useState } from 'react';
import { Send, Bot, User, Loader2, X, Sparkles, Paperclip, ImageIcon, FileText, BookOpen, ArrowLeftRight } from 'lucide-react';
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
  page: { label: 'Current Page', icon: FileText },
  trade: { label: 'Current Trade', icon: ArrowLeftRight },
  note: { label: 'Current Note', icon: BookOpen },
};

export function AICoachTriggerButton() {
  const { openDrawer } = useAICoach();
  return (
    <button
      onClick={openDrawer}
      title="AI Coach (contextual)"
      className="fixed top-3 right-4 z-40 h-9 px-3 rounded-full border border-primary/40 bg-card/90 backdrop-blur text-foreground hover:bg-primary/10 transition-colors flex items-center gap-1.5 shadow-md text-xs font-semibold"
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

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

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

  const sendMessage = async () => {
    const text = input.trim();
    if ((!text && pendingImages.length === 0) || loading) return;
    const userMsg: Msg = { role: 'user', content: text || 'Analyze this.' };
    const sentImages = pendingImages;
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setPendingImages([]);
    setLoading(true);
    let acc = '';
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
    } catch (e) { console.error(e); toast.error('Chat error'); }
    setLoading(false);
  };

  const scopes: AICoachScope[] = ['page', 'trade', 'note'];
  const isScopeAvailable = (s: AICoachScope) => s === 'page' || (s === 'trade' ? !!trade : !!note);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && closeDrawer()}>
      <SheetContent
        side="right"
        className="p-0 w-[480px] sm:w-[480px] max-w-[92vw] flex flex-col gap-0 border-l border-border"
      >
        {/* Header */}
        <div className="h-12 border-b border-border px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="text-sm font-heading font-bold uppercase tracking-wide">AI Coach</span>
          </div>
          <button onClick={closeDrawer} className="h-7 w-7 rounded-md hover:bg-accent flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Context bar */}
        <div className="px-4 py-2.5 border-b border-border bg-muted/20 shrink-0 space-y-2">
          <div className="flex items-center gap-1">
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
                    'flex-1 flex items-center justify-center gap-1.5 h-7 rounded-md text-[11px] font-semibold transition-colors',
                    active
                      ? 'bg-primary text-primary-foreground'
                      : available
                        ? 'bg-card border border-border text-foreground/80 hover:bg-accent'
                        : 'bg-card border border-border text-muted-foreground/40 cursor-not-allowed'
                  )}
                >
                  <Icon className="h-3 w-3" />
                  {meta.label}
                </button>
              );
            })}
          </div>
          <div className="text-[10px] text-muted-foreground flex items-center gap-1.5">
            <span className="font-bold uppercase tracking-widest text-primary">Scope:</span>
            <span className="truncate">{activeCtx.label}</span>
          </div>
        </div>

        {/* Chat scroll area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-10">
              <div className="mx-auto h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <p className="text-sm font-semibold mb-1">Your trading copilot</p>
              <p className="text-xs text-muted-foreground max-w-[280px] mx-auto leading-relaxed">
                I already see your full journal. Pick a scope above and ask anything about the {scope === 'page' ? 'current page' : scope === 'trade' ? 'open trade' : 'open note'}.
              </p>
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-3 h-3 text-primary" />
                  </div>
                )}
                <div className={cn(
                  'max-w-[82%] rounded-lg px-3 py-2 text-sm',
                  m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted border border-border'
                )}>
                  {m.role === 'assistant' ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1 [&_li]:my-0.5">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  )}
                </div>
                {m.role === 'user' && (
                  <div className="w-6 h-6 rounded-md bg-muted flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-3 h-3 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))
          )}
          {loading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
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
        <div className="border-t border-border p-3 flex gap-2 items-end shrink-0">
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
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-md h-9 w-9 shrink-0"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            title="Attach chart image"
          >
            <Paperclip className="w-4 h-4" />
          </Button>
          <Textarea
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
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder={`Ask about ${SCOPE_META[scope].label.toLowerCase()}…`}
            className="resize-none min-h-[36px] max-h-[120px] rounded-md text-sm"
            rows={1}
            disabled={loading}
          />
          <Button
            onClick={sendMessage}
            disabled={(!input.trim() && pendingImages.length === 0) || loading}
            size="icon"
            className="rounded-md h-9 w-9 shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
