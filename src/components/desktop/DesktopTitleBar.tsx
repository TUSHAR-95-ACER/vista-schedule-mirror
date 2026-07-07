import { useEffect, useState } from 'react';
import { Minus, Square, Copy, X } from 'lucide-react';
import { winClose, winIsMaximized, winMinimize, winToggleMaximize, onWinResize } from '@/lib/desktop';

/**
 * Custom frameless-window title bar for the Tauri desktop shell.
 *
 * Design goals:
 *   - Feels integrated with the sidebar (same dark surface, no white OS strip
 *     and no extra black band above the app content).
 *   - Slim 28px band, subtle bottom hairline that blends into the sidebar.
 *   - Drag anywhere on the empty region — native controls on the right.
 *
 * Inspired by Notion / Discord / VS Code title bars.
 */
export function DesktopTitleBar() {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    winIsMaximized().then(setMaximized);
    onWinResize(async () => setMaximized(await winIsMaximized())).then((u) => { unlisten = u; });
    return () => { unlisten?.(); };
  }, []);

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] flex items-stretch select-none"
      style={{
        height: 'var(--desktop-titlebar-h, 28px)',
        background: 'hsl(var(--sidebar-background))',
        borderBottom: '1px solid hsl(var(--sidebar-border) / 0.6)',
      }}
    >
      {/* Drag region — spans the whole bar minus the buttons */}
      <div
        data-tauri-drag-region
        className="flex-1 h-full flex items-center gap-1.5 pl-2.5 text-[10.5px] font-medium tracking-[0.02em]"
        style={{ color: 'hsl(var(--sidebar-foreground) / 0.55)' }}
      >
        <span
          data-tauri-drag-region
          className="pointer-events-none uppercase"
        >
          TG Master Journal
        </span>
      </div>

      {/* Window controls */}
      <div className="flex h-full items-stretch">
        <TitleBarButton onClick={winMinimize} aria-label="Minimize">
          <Minus className="h-3 w-3" />
        </TitleBarButton>
        <TitleBarButton
          onClick={async () => { await winToggleMaximize(); setMaximized(await winIsMaximized()); }}
          aria-label={maximized ? 'Restore' : 'Maximize'}
        >
          {maximized ? <Copy className="h-2.5 w-2.5" /> : <Square className="h-2.5 w-2.5" />}
        </TitleBarButton>
        <TitleBarButton onClick={winClose} aria-label="Close" danger>
          <X className="h-3 w-3" />
        </TitleBarButton>
      </div>
    </div>
  );
}

function TitleBarButton({
  children,
  onClick,
  danger,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'w-11 h-full flex items-center justify-center transition-colors ' +
        (danger
          ? 'text-[hsl(var(--sidebar-foreground)/0.7)] hover:bg-destructive hover:text-destructive-foreground'
          : 'text-[hsl(var(--sidebar-foreground)/0.7)] hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-foreground))]')
      }
      {...rest}
    >
      {children}
    </button>
  );
}
