import { useEffect, useState } from 'react';
import { Minus, Square, Copy, X } from 'lucide-react';
import { winClose, winIsMaximized, winMinimize, winToggleMaximize, onWinResize } from '@/lib/desktop';

/**
 * Custom frameless-window title bar for the Tauri desktop shell.
 *
 * Renders as a fixed 34px band at the very top of the window with:
 *   - a drag region (double-click toggles maximize — native behaviour)
 *   - product identity
 *   - minimize / maximize-restore / close controls (dark, no white strip)
 *
 * The rest of the app is offset by CSS variable `--desktop-titlebar-h` set
 * in index.css when `html.is-desktop` is present.
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
      className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-between select-none"
      style={{
        height: 'var(--desktop-titlebar-h, 34px)',
        background: 'hsl(var(--background))',
        borderBottom: '1px solid hsl(var(--border) / 0.5)',
      }}
    >
      {/* Drag region — everything except the buttons */}
      <div
        data-tauri-drag-region
        className="flex-1 h-full flex items-center gap-2 px-3 text-[11px] font-medium tracking-wide text-muted-foreground"
      >
        <span
          data-tauri-drag-region
          className="inline-flex items-center justify-center w-4 h-4 rounded-sm bg-primary/15 text-primary text-[9px] font-bold"
        >
          MJ
        </span>
        <span data-tauri-drag-region className="pointer-events-none">
          TG Master Journal
        </span>
      </div>

      {/* Window controls */}
      <div className="flex h-full items-stretch">
        <TitleBarButton onClick={winMinimize} aria-label="Minimize">
          <Minus className="h-3.5 w-3.5" />
        </TitleBarButton>
        <TitleBarButton
          onClick={async () => { await winToggleMaximize(); setMaximized(await winIsMaximized()); }}
          aria-label={maximized ? 'Restore' : 'Maximize'}
        >
          {maximized ? <Copy className="h-3 w-3" /> : <Square className="h-3 w-3" />}
        </TitleBarButton>
        <TitleBarButton onClick={winClose} aria-label="Close" danger>
          <X className="h-3.5 w-3.5" />
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
        'w-11 h-full flex items-center justify-center text-muted-foreground transition-colors ' +
        (danger
          ? 'hover:bg-destructive hover:text-destructive-foreground'
          : 'hover:bg-muted/40 hover:text-foreground')
      }
      {...rest}
    >
      {children}
    </button>
  );
}
