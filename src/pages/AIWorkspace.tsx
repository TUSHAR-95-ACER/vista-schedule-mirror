import { useState } from 'react';
import { Sparkles, ExternalLink, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { isDesktop, openAiWorkspace, openExternal } from '@/lib/desktop';

type AiProvider = 'chatgpt' | 'gemini' | 'claude' | 'perplexity';

interface Provider {
  id: AiProvider;
  name: string;
  url: string;
  tagline: string;
  gradient: string;
}

const PROVIDERS: Provider[] = [
  { id: 'chatgpt',    name: 'ChatGPT',    url: 'https://chat.openai.com/',        tagline: 'OpenAI · GPT models',           gradient: 'from-emerald-500/20 to-emerald-500/5' },
  { id: 'gemini',     name: 'Gemini',     url: 'https://gemini.google.com/app',   tagline: 'Google · Gemini 2.x',           gradient: 'from-sky-500/20 to-sky-500/5' },
  { id: 'claude',     name: 'Claude',     url: 'https://claude.ai/new',           tagline: 'Anthropic · Claude',            gradient: 'from-amber-500/20 to-amber-500/5' },
  { id: 'perplexity', name: 'Perplexity', url: 'https://www.perplexity.ai/',      tagline: 'Answer engine · with sources',  gradient: 'from-violet-500/20 to-violet-500/5' },
];

export default function AIWorkspace() {
  const [active, setActive] = useState<AiProvider>('chatgpt');
  const desktop = isDesktop();
  const current = PROVIDERS.find(p => p.id === active)!;

  const openInWorkspace = (id: AiProvider) => {
    setActive(id);
    openAiWorkspace(id);
  };

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-border/60 bg-card/40 px-6 py-5 backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-heading font-bold tracking-tight">
              <Sparkles className="h-6 w-6 text-primary" />
              AI Workspace
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              {desktop
                ? 'Launch official AI apps in dedicated desktop windows. Sessions and cookies are remembered between launches.'
                : 'Desktop-only: these tabs open in dedicated windows in the TG Master Journal desktop app. In the browser, they open in a new tab.'}
            </p>
          </div>
          {!desktop && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] font-medium text-amber-500">
              Best experience in the desktop app
            </div>
          )}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {PROVIDERS.map(p => (
            <button
              key={p.id}
              onClick={() => setActive(p.id)}
              className={cn(
                'group flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all',
                active === p.id
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border/50 bg-card text-muted-foreground hover:border-border hover:text-foreground'
              )}
            >
              <Bot className="h-3.5 w-3.5" />
              {p.name}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto grid max-w-5xl gap-4 md:grid-cols-2">
          {PROVIDERS.map(p => (
            <div
              key={p.id}
              className={cn(
                'group relative overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br p-6 transition-all hover:border-border',
                p.gradient,
                active === p.id && 'ring-1 ring-primary/40'
              )}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-heading font-bold">{p.name}</h2>
                  <p className="mt-1 text-[11px] uppercase tracking-widest text-muted-foreground">{p.tagline}</p>
                </div>
                <Bot className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => openInWorkspace(p.id)} className="gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  {desktop ? 'Open in desktop window' : 'Open in new tab'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => openExternal(p.url)} className="gap-1.5">
                  <ExternalLink className="h-3.5 w-3.5" />
                  Browser
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-8 max-w-5xl rounded-xl border border-border/50 bg-card/60 p-5 text-xs leading-relaxed text-muted-foreground">
          <p className="font-medium text-foreground mb-2">Privacy</p>
          <p>
            The AI Workspace embeds official web apps directly — no journal data,
            trades, plans, or notes are ever forwarded to third-party providers.
            Everything you paste into an AI window is sent only by you, exactly
            as if you opened the site in your browser.
          </p>
        </div>
      </div>
    </div>
  );
}

// Currently active tab is exported for potential future menu integration.
export const _providers = PROVIDERS;
