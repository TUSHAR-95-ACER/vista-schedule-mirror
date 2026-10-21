import { memo } from 'react';

/**
 * Instrument icon set for the market ticker.
 * Emoji-style badge icons drawn as inline SVG so they render identically
 * on every platform (no font/emoji dependencies). Colors are fixed brand
 * colors (EU blue, Bitcoin orange, etc.) — intentionally not theme tokens.
 */

const S = 20; // rendered size in px, matches the previous emoji visual size

function starPath(cx: number, cy: number, outer: number, inner: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts.join('L')}Z`;
}

const EuFlag = () => (
  <svg width={S} height={S} viewBox="0 0 24 24" className="shrink-0" aria-hidden="true">
    <rect x="1" y="3" width="22" height="18" rx="4" fill="#003399" />
    <g fill="#FFCC00">
      {Array.from({ length: 12 }, (_, i) => {
        const a = (Math.PI / 6) * i;
        const cx = 12 + 6.4 * Math.cos(a);
        const cy = 12 + 6.4 * Math.sin(a);
        return <path key={i} d={starPath(cx, cy, 1.25, 0.5)} />;
      })}
    </g>
  </svg>
);

const GbpFlag = () => (
  <svg width={S} height={S * 0.8} viewBox="0 0 30 20" className="shrink-0" aria-hidden="true">
    <defs>
      <clipPath id="gb-clip">
        <rect x="0" y="0" width="30" height="20" rx="2.5" />
      </clipPath>
    </defs>
    <g clipPath="url(#gb-clip)">
      <rect width="30" height="20" fill="#012169" />
      <path d="M0,0 L30,20 M30,0 L0,20" stroke="#FFFFFF" strokeWidth="4" />
      <path d="M0,0 L30,20 M30,0 L0,20" stroke="#C8102E" strokeWidth="2" />
      <path d="M15,0 V20 M0,10 H30" stroke="#FFFFFF" strokeWidth="6.5" />
      <path d="M15,0 V20 M0,10 H30" stroke="#C8102E" strokeWidth="3.8" />
    </g>
  </svg>
);

const GoldIcon = () => (
  <svg width={S} height={S} viewBox="0 0 24 24" className="shrink-0" aria-hidden="true">
    <defs>
      <linearGradient id="gold-grad" x1="0" y1="0" x2="0.4" y2="1">
        <stop offset="0%" stopColor="#FFE985" />
        <stop offset="45%" stopColor="#F7C948" />
        <stop offset="100%" stopColor="#B8860B" />
      </linearGradient>
    </defs>
    <circle cx="7.4" cy="15.8" r="4.9" fill="url(#gold-grad)" />
    <circle cx="16.6" cy="15.8" r="4.9" fill="url(#gold-grad)" />
    <circle cx="12" cy="9.2" r="5.4" fill="url(#gold-grad)" />
    <ellipse cx="10.2" cy="7.4" rx="1.9" ry="1.3" fill="#FFFFFF" opacity="0.75" transform="rotate(-30 10.2 7.4)" />
    <ellipse cx="5.9" cy="14.2" rx="1.4" ry="1" fill="#FFFFFF" opacity="0.7" transform="rotate(-30 5.9 14.2)" />
    <ellipse cx="15.1" cy="14.2" rx="1.4" ry="1" fill="#FFFFFF" opacity="0.7" transform="rotate(-30 15.1 14.2)" />
  </svg>
);

const BitcoinIcon = () => (
  <svg width={S} height={S} viewBox="0 0 24 24" className="shrink-0" aria-hidden="true">
    <circle cx="12" cy="12" r="10.2" fill="#F7931A" />
    <text
      x="12"
      y="16.6"
      textAnchor="middle"
      fontSize="12.5"
      fontWeight="800"
      fill="#FFFFFF"
      fontFamily="Inter, system-ui, sans-serif"
    >
      B
    </text>
    <rect x="10.5" y="5.1" width="1.5" height="2.6" fill="#FFFFFF" />
    <rect x="12.9" y="5.1" width="1.5" height="2.6" fill="#FFFFFF" />
    <rect x="10.5" y="16.3" width="1.5" height="2.6" fill="#FFFFFF" />
    <rect x="12.9" y="16.3" width="1.5" height="2.6" fill="#FFFFFF" />
  </svg>
);

const CadFlag = () => (
  <svg width={S} height={S} viewBox="0 0 24 24" className="shrink-0" aria-hidden="true">
    <defs>
      <clipPath id="ca-clip">
        <circle cx="12" cy="12" r="10.4" />
      </clipPath>
    </defs>
    <g clipPath="url(#ca-clip)">
      <rect width="24" height="24" fill="#FFFFFF" />
      <rect width="6.6" height="24" fill="#D80621" />
      <rect x="17.4" width="6.6" height="24" fill="#D80621" />
      <path
        d="M12 6.6 L13.1 8.5 L14.8 7.9 L14.4 9.9 L16.5 9.5 L15.6 11.5 L18 11.8 L16.2 13.3 L18.1 14.7 L15.9 14.9 L16.3 17 L14.2 16 L13.8 18.5 L12 16.9 L10.2 18.5 L9.8 16 L7.7 17 L8.1 14.9 L5.9 14.7 L7.8 13.3 L6 11.8 L8.4 11.5 L7.5 9.5 L9.6 9.9 L9.2 7.9 L10.9 8.5 Z"
        fill="#D80621"
      />
    </g>
  </svg>
);

const DxyIcon = () => (
  <svg width={S} height={S} viewBox="0 0 24 24" className="shrink-0" aria-hidden="true">
    <circle cx="12" cy="12" r="10" fill="#101010" stroke="#10B981" strokeWidth="2.4" />
    <text
      x="12"
      y="15.9"
      textAnchor="middle"
      fontSize="11.5"
      fontWeight="700"
      fill="#EDEDED"
      opacity="0.95"
      fontFamily="Inter, system-ui, sans-serif"
    >
      $
    </text>
  </svg>
);

const ICONS: Record<string, () => JSX.Element> = {
  EURUSD: EuFlag,
  GBPUSD: GbpFlag,
  XAUUSD: GoldIcon,
  BTCUSD: BitcoinIcon,
  USDCAD: CadFlag,
  DXY: DxyIcon,
};

/** Renders the SVG badge icon for a known symbol; falls back to the flag emoji. */
export const InstrumentIcon = memo(function InstrumentIcon({
  symbol,
  flag,
}: {
  symbol: string;
  flag: string;
}) {
  const Icon = ICONS[symbol];
  if (!Icon) {
    return (
      <span className="text-lg leading-none" aria-hidden="true">
        {flag}
      </span>
    );
  }
  return <Icon />;
});
