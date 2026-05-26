// Shared bias system: options + colors + directional icons.
// Used in Daily/Weekly plans, tags, analytics, charts.

import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type Bias =
  | 'Bullish'
  | 'Slightly Bullish'
  | 'Neutral'
  | 'Sideways'
  | 'Slightly Bearish'
  | 'Bearish';

export interface BiasMeta {
  value: Bias;
  label: string;
  icon: LucideIcon;
  /** Tailwind text color class. */
  text: string;
  /** Tailwind bg color class (subtle). */
  bg: string;
  /** Tailwind border color class. */
  border: string;
  /** Tailwind solid dot color. */
  dot: string;
  /** Numeric direction for analytics: -2 strongly bearish → +2 strongly bullish. */
  score: number;
}

export const BIAS_META: Record<Bias, BiasMeta> = {
  Bullish: {
    value: 'Bullish', label: 'Bullish', icon: TrendingUp,
    text: 'text-success', bg: 'bg-success/15', border: 'border-success/30', dot: 'bg-success',
    score: 2,
  },
  'Slightly Bullish': {
    value: 'Slightly Bullish', label: 'Slightly Bullish', icon: ArrowUpRight,
    text: 'text-success/80', bg: 'bg-success/8', border: 'border-success/20', dot: 'bg-success/70',
    score: 1,
  },
  Neutral: {
    value: 'Neutral', label: 'Neutral', icon: Minus,
    text: 'text-muted-foreground', bg: 'bg-muted/40', border: 'border-border', dot: 'bg-muted-foreground/60',
    score: 0,
  },
  Sideways: {
    value: 'Sideways', label: 'Sideways', icon: Minus,
    text: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/25', dot: 'bg-warning',
    score: 0,
  },
  'Slightly Bearish': {
    value: 'Slightly Bearish', label: 'Slightly Bearish', icon: ArrowDownRight,
    text: 'text-destructive/80', bg: 'bg-destructive/8', border: 'border-destructive/20', dot: 'bg-destructive/70',
    score: -1,
  },
  Bearish: {
    value: 'Bearish', label: 'Bearish', icon: TrendingDown,
    text: 'text-destructive', bg: 'bg-destructive/15', border: 'border-destructive/30', dot: 'bg-destructive',
    score: -2,
  },
};

/** Standard ordering for selects (strongest bull → strongest bear). */
export const BIAS_OPTIONS: BiasMeta[] = [
  BIAS_META.Bullish,
  BIAS_META['Slightly Bullish'],
  BIAS_META.Neutral,
  BIAS_META.Sideways,
  BIAS_META['Slightly Bearish'],
  BIAS_META.Bearish,
];

export function getBiasMeta(bias: string | undefined | null): BiasMeta | null {
  if (!bias) return null;
  return (BIAS_META as Record<string, BiasMeta>)[bias] ?? null;
}

/** Treat 'Slightly Bullish' as Bullish and 'Slightly Bearish' as Bearish
 *  for analytics that compare predicted vs actual directional accuracy. */
export function normalizeBiasDirection(bias: string | undefined | null): 'Bullish' | 'Bearish' | 'Sideways' | 'Neutral' | '' {
  if (!bias) return '';
  if (bias === 'Bullish' || bias === 'Slightly Bullish') return 'Bullish';
  if (bias === 'Bearish' || bias === 'Slightly Bearish') return 'Bearish';
  if (bias === 'Sideways') return 'Sideways';
  if (bias === 'Neutral') return 'Neutral';
  return '';
}
