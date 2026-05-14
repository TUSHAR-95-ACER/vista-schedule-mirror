import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Activity, Brain, Sparkles, TrendingUp, TrendingDown, Minus,
  Plus, Trash2, Zap, Target, AlertTriangle, Gauge, History, Coins, DollarSign, Compass,
} from "lucide-react";

type MacroEvent = {
  id?: string;
  release_date: string;
  event: string;
  previous: number | null;
  forecast: number | null;
  actual: number | null;
  unit?: string;
  surprise?: string;
  trend?: string;
  impact?: string;
  notes?: string;
};

type Analysis = {
  id?: string;
  analysis_date: string;
  macro_theme?: string;
  fed_cycle?: string;
  environment?: string;
  narrative?: string;
  narrative_shift?: string;
  interpretation?: string;
  fed_bias?: string;
  usd_bias?: string;
  gold_bias?: string;
  fed_confidence?: number;
  usd_confidence?: number;
  gold_confidence?: number;
  hawkish_probability?: number;
  dovish_probability?: number;
  rate_cut_probability?: number;
  rate_hike_probability?: number;
  recession_risk?: number;
  inflation_pressure?: string;
  market_focus?: string;
  smart_money_view?: string;
  expectation_pricing?: string;
  positioning_risk?: string;
  conflict_signals?: any[];
  future_probabilities?: any[];
  trade_filter?: string;
  confidence_level?: string;
  predicted_outcome?: string;
  actual_outcome?: string;
  outcome_accurate?: boolean | null;
};

const DEFAULT_EVENTS: MacroEvent["event"][] = [
  "NFP", "Unemployment Rate", "CPI YoY", "Core CPI YoY", "PCE YoY",
  "Core PCE YoY", "Retail Sales MoM", "Avg Hourly Earnings YoY", "ISM PMI", "FOMC Tone",
];

const todayISO = () => new Date().toISOString().slice(0, 10);

function biasTone(bias?: string) {
  if (!bias) return "text-muted-foreground";
  if (/Bullish|Hawkish/i.test(bias)) return "text-emerald-400";
  if (/Bearish|Dovish/i.test(bias)) return "text-rose-400";
  return "text-amber-300";
}
function biasIcon(bias?: string) {
  if (/Bullish|Hawkish/i.test(bias || "")) return <TrendingUp className="h-4 w-4" />;
  if (/Bearish|Dovish/i.test(bias || "")) return <TrendingDown className="h-4 w-4" />;
  return <Minus className="h-4 w-4" />;
}

function ProbabilityRing({ value, label, accent = "primary" }: { value: number; label: string; accent?: "primary" | "gold" | "rose" | "emerald" | "blue" }) {
  const v = Math.max(0, Math.min(100, Math.round(value || 0)));
  const colors: Record<string, string> = {
    primary: "stroke-primary",
    gold: "stroke-amber-400",
    rose: "stroke-rose-400",
    emerald: "stroke-emerald-400",
    blue: "stroke-sky-400",
  };
  const r = 32, c = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-[88px] w-[88px]">
        <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
          <circle cx="40" cy="40" r={r} className="stroke-border/40" strokeWidth="6" fill="none" />
          <circle
            cx="40" cy="40" r={r}
            className={`${colors[accent]} transition-all duration-700`}
            strokeWidth="6" fill="none" strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={c - (c * v) / 100}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-heading text-xl font-bold">{v}%</span>
        </div>
      </div>
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground text-center">{label}</span>
    </div>
  );
}

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <Card className={`relative overflow-hidden border-border/60 bg-gradient-to-b from-card/80 to-card/40 backdrop-blur-xl shadow-[0_0_0_1px_hsl(var(--border)/0.3)] ${className}`}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      {children}
    </Card>
  );
}

export default function MacroIntelligence() {
  const { user } = useAuth();
  const [events, setEvents] = useState<MacroEvent[]>([]);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [latest, setLatest] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [context, setContext] = useState("");

  useEffect(() => { if (user) load(); }, [user]);

  async function load() {
    setLoading(true);
    const [{ data: ev }, { data: an }] = await Promise.all([
      supabase.from("macro_events").select("*").order("release_date", { ascending: false }).limit(50),
      supabase.from("macro_analyses").select("*").order("analysis_date", { ascending: false }).limit(20),
    ]);
    const evs = (ev as any[]) || [];
    if (evs.length === 0) {
      // Seed editable rows with default events
      setEvents(DEFAULT_EVENTS.map((e) => ({
        release_date: todayISO(), event: e, previous: null, forecast: null, actual: null, unit: "",
      })));
    } else {
      setEvents(evs as MacroEvent[]);
    }
    const ans = (an as any[]) || [];
    setAnalyses(ans as Analysis[]);
    setLatest((ans[0] as Analysis) || null);
    setLoading(false);
  }

  function updateEvent(idx: number, patch: Partial<MacroEvent>) {
    setEvents(prev => prev.map((e, i) => (i === idx ? { ...e, ...patch } : e)));
  }
  function addEvent() {
    setEvents(prev => [...prev, { release_date: todayISO(), event: "", previous: null, forecast: null, actual: null, unit: "" }]);
  }
  function removeEvent(idx: number) {
    setEvents(prev => prev.filter((_, i) => i !== idx));
  }

  async function saveEvents() {
    if (!user) return;
    const cleaned = events.filter(e => e.event?.trim());
    if (cleaned.length === 0) return toast.error("Add at least one event");
    // Delete + reinsert for simplicity in MVP
    await supabase.from("macro_events").delete().eq("user_id", user.id);
    const rows = cleaned.map(e => ({
      user_id: user.id,
      release_date: e.release_date || todayISO(),
      event: e.event.trim(),
      previous: e.previous, forecast: e.forecast, actual: e.actual,
      unit: e.unit || null,
      surprise: e.surprise || null,
      trend: e.trend || null,
      impact: e.impact || null,
      notes: e.notes || null,
    }));
    const { error } = await supabase.from("macro_events").insert(rows);
    if (error) return toast.error(error.message);
    toast.success("Events saved");
    load();
  }

  async function runAnalysis() {
    if (!user) return;
    const cleaned = events.filter(e => e.event?.trim() && (e.actual !== null && e.actual !== undefined));
    if (cleaned.length === 0) return toast.error("Enter actual values for at least one event");
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("macro-intelligence", {
        body: { events: cleaned, context },
      });
      if (error) throw error;
      const a = (data as any)?.analysis;
      if (!a) throw new Error("No analysis returned");

      // Apply per-event AI labels back to local rows
      const updated = events.map(e => {
        const m = (a.per_event_analysis || []).find((p: any) => p.event?.toLowerCase() === e.event?.toLowerCase());
        return m ? { ...e, surprise: m.surprise, trend: m.trend, impact: m.impact, notes: m.reasoning } : e;
      });
      setEvents(updated);

      // Persist analysis
      const insertRow = {
        user_id: user.id,
        analysis_date: todayISO(),
        macro_theme: a.macro_theme, fed_cycle: a.fed_cycle, environment: a.environment,
        narrative: a.narrative, narrative_shift: a.narrative_shift, interpretation: a.interpretation,
        fed_bias: a.fed_bias, usd_bias: a.usd_bias, gold_bias: a.gold_bias,
        fed_confidence: a.fed_confidence, usd_confidence: a.usd_confidence, gold_confidence: a.gold_confidence,
        hawkish_probability: a.hawkish_probability, dovish_probability: a.dovish_probability,
        rate_cut_probability: a.rate_cut_probability, rate_hike_probability: a.rate_hike_probability,
        recession_risk: a.recession_risk, inflation_pressure: a.inflation_pressure,
        market_focus: a.market_focus, smart_money_view: a.smart_money_view,
        expectation_pricing: a.expectation_pricing, positioning_risk: a.positioning_risk,
        conflict_signals: a.conflict_signals || [],
        future_probabilities: a.future_probabilities || [],
        trade_filter: a.trade_filter, confidence_level: a.confidence_level,
        predicted_outcome: (a.future_probabilities?.[0]?.outcome) || null,
      };
      const { data: saved, error: saveErr } = await supabase.from("macro_analyses").insert(insertRow).select().maybeSingle();
      if (saveErr) throw saveErr;
      setLatest(saved as Analysis);
      setAnalyses(prev => [saved as Analysis, ...prev].slice(0, 20));
      toast.success("Macro intelligence updated");
    } catch (e: any) {
      toast.error(e?.message || "Analysis failed");
    } finally {
      setRunning(false);
    }
  }

  async function setOutcomeAccuracy(id: string, accurate: boolean, actualOutcome: string) {
    const { error } = await supabase.from("macro_analyses").update({ outcome_accurate: accurate, actual_outcome: actualOutcome }).eq("id", id);
    if (error) return toast.error(error.message);
    setAnalyses(prev => prev.map(a => a.id === id ? { ...a, outcome_accurate: accurate, actual_outcome: actualOutcome } : a));
    toast.success("Outcome recorded");
  }

  const accuracyStats = useMemo(() => {
    const scored = analyses.filter(a => a.outcome_accurate !== null && a.outcome_accurate !== undefined);
    const total = scored.length;
    const hits = scored.filter(a => a.outcome_accurate).length;
    return { total, hits, rate: total ? Math.round((hits / total) * 100) : 0 };
  }, [analyses]);

  const today = new Date();
  const monthLabel = today.toLocaleString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/50">
      <div className="mx-auto max-w-[1400px] px-6 py-8 space-y-6">
        {/* HEADER */}
        <GlassCard className="p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-xl border border-primary/40 bg-primary/10 flex items-center justify-center">
                  <Compass className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h1 className="font-heading text-2xl font-bold tracking-tight">Macro Intelligence</h1>
                  <p className="text-xs text-muted-foreground">Institutional macro decision engine • {monthLabel}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <HeaderChip label="Theme" value={latest?.macro_theme || "—"} />
                <HeaderChip label="Fed Cycle" value={latest?.fed_cycle || "—"} />
                <HeaderChip label="Environment" value={latest?.environment || "—"} />
                <HeaderChip label="Confidence" value={latest?.confidence_level || "—"} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={saveEvents} disabled={running}>Save Events</Button>
              <Button onClick={runAnalysis} disabled={running} className="gap-2">
                <Sparkles className="h-4 w-4" />
                {running ? "Analyzing..." : "Run AI Analysis"}
              </Button>
            </div>
          </div>
          {latest?.narrative && (
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground border-l-2 border-primary/50 pl-4 italic">
              {latest.narrative}
            </p>
          )}
        </GlassCard>

        {/* PRIMARY BIAS ROW */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <BiasCard title="Fed Bias" icon={<Brain className="h-4 w-4" />} bias={latest?.fed_bias} confidence={latest?.fed_confidence} />
          <BiasCard title="USD Bias" icon={<DollarSign className="h-4 w-4" />} bias={latest?.usd_bias} confidence={latest?.usd_confidence} />
          <BiasCard title="Gold Bias" icon={<Coins className="h-4 w-4" />} bias={latest?.gold_bias} confidence={latest?.gold_confidence} accent="gold" />
        </div>

        {/* PROBABILITY METERS */}
        <GlassCard className="p-6">
          <SectionHeader icon={<Gauge className="h-4 w-4" />} title="Fed Expectation Engine" subtitle="Probability landscape" />
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-6 mt-4">
            <ProbabilityRing value={latest?.hawkish_probability || 0} label="Hawkish" accent="rose" />
            <ProbabilityRing value={latest?.dovish_probability || 0} label="Dovish" accent="emerald" />
            <ProbabilityRing value={latest?.rate_cut_probability || 0} label="Rate Cut" accent="emerald" />
            <ProbabilityRing value={latest?.rate_hike_probability || 0} label="Rate Hike" accent="rose" />
            <ProbabilityRing value={latest?.recession_risk || 0} label="Recession Risk" accent="rose" />
            <div className="flex flex-col items-center gap-2 justify-center">
              <Badge variant="outline" className="text-xs">Inflation</Badge>
              <span className={`font-heading text-lg ${biasTone(latest?.inflation_pressure === "Cooling" ? "Bearish" : latest?.inflation_pressure === "High" || latest?.inflation_pressure === "Very High" ? "Bullish" : "Neutral")}`}>
                {latest?.inflation_pressure || "—"}
              </span>
            </div>
          </div>
        </GlassCard>

        {/* AI INTERPRETATION + SMART MONEY */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <GlassCard className="p-6">
            <SectionHeader icon={<Brain className="h-4 w-4" />} title="AI Macro Interpretation" subtitle="What happened, why it matters" />
            <p className="mt-4 text-sm leading-7 whitespace-pre-line">
              {latest?.interpretation || <span className="text-muted-foreground italic">Run analysis to populate the institutional read of current data.</span>}
            </p>
            {latest?.narrative_shift && (
              <div className="mt-4 rounded-lg border border-amber-400/30 bg-amber-400/5 p-3">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-amber-300 font-semibold mb-1">
                  <Zap className="h-3.5 w-3.5" /> Narrative Shift
                </div>
                <p className="text-sm leading-6">{latest.narrative_shift}</p>
              </div>
            )}
          </GlassCard>
          <GlassCard className="p-6">
            <SectionHeader icon={<Sparkles className="h-4 w-4" />} title="Smart Money Interpretation" subtitle="Institutional view" />
            <p className="mt-4 text-sm leading-7 whitespace-pre-line">
              {latest?.smart_money_view || <span className="text-muted-foreground italic">No institutional read yet.</span>}
            </p>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <MiniBlock label="Market Focus" value={latest?.market_focus} icon={<Target className="h-3.5 w-3.5" />} />
              <MiniBlock label="Positioning Risk" value={latest?.positioning_risk} icon={<AlertTriangle className="h-3.5 w-3.5" />} />
              <MiniBlock label="Expectation Pricing" value={latest?.expectation_pricing} icon={<Activity className="h-3.5 w-3.5" />} />
              <MiniBlock label="Trade Filter" value={latest?.trade_filter} icon={<Compass className="h-3.5 w-3.5" />} />
            </div>
          </GlassCard>
        </div>

        {/* DATA INPUT TABLE */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <SectionHeader icon={<Activity className="h-4 w-4" />} title="Economic Data Input" subtitle="Previous / Forecast / Actual" />
            <Button variant="outline" size="sm" onClick={addEvent} className="gap-1"><Plus className="h-3.5 w-3.5" />Add row</Button>
          </div>
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border/60">
                  <th className="text-left font-medium px-2 py-2">Event</th>
                  <th className="text-left font-medium px-2 py-2 w-24">Previous</th>
                  <th className="text-left font-medium px-2 py-2 w-24">Forecast</th>
                  <th className="text-left font-medium px-2 py-2 w-24">Actual</th>
                  <th className="text-left font-medium px-2 py-2 w-32">Surprise</th>
                  <th className="text-left font-medium px-2 py-2 w-28">Trend</th>
                  <th className="text-left font-medium px-2 py-2 w-24">Impact</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}><td colSpan={8} className="py-2"><Skeleton className="h-8 w-full" /></td></tr>
                  ))
                ) : events.map((e, i) => (
                  <tr key={i} className="border-b border-border/30 hover:bg-accent/30 transition-colors">
                    <td className="px-2 py-1.5">
                      <Input value={e.event} onChange={ev => updateEvent(i, { event: ev.target.value })} className="h-8 bg-transparent border-border/40" />
                    </td>
                    <td className="px-2 py-1.5"><NumInput value={e.previous} onChange={v => updateEvent(i, { previous: v })} /></td>
                    <td className="px-2 py-1.5"><NumInput value={e.forecast} onChange={v => updateEvent(i, { forecast: v })} /></td>
                    <td className="px-2 py-1.5"><NumInput value={e.actual} onChange={v => updateEvent(i, { actual: v })} /></td>
                    <td className="px-2 py-1.5"><LabelPill value={e.surprise} tone={e.surprise?.includes("Bullish") || e.surprise?.includes("Hot") ? "emerald" : e.surprise?.includes("Bearish") || e.surprise?.includes("Cooling") ? "rose" : "muted"} /></td>
                    <td className="px-2 py-1.5"><LabelPill value={e.trend} tone={e.trend === "Improving" ? "emerald" : e.trend === "Weakening" ? "rose" : "muted"} /></td>
                    <td className="px-2 py-1.5"><LabelPill value={e.impact} tone={e.impact === "Very High" || e.impact === "High" ? "rose" : e.impact === "Medium" ? "amber" : "muted"} /></td>
                    <td className="px-2 py-1.5"><Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeEvent(i)}><Trash2 className="h-3.5 w-3.5" /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4">
            <Textarea
              placeholder="Optional context: yield action, DXY level, FOMC week, geopolitical backdrop..."
              value={context} onChange={e => setContext(e.target.value)}
              className="min-h-[64px] bg-transparent border-border/40 text-sm"
            />
          </div>
        </GlassCard>

        {/* CONFLICTS + FUTURE PROBABILITIES */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <GlassCard className="p-6">
            <SectionHeader icon={<AlertTriangle className="h-4 w-4" />} title="Macro Conflict Detector" subtitle="Conflicting signals & dominant narrative" />
            <div className="mt-4 space-y-3">
              {(latest?.conflict_signals || []).length === 0 && (
                <p className="text-sm text-muted-foreground italic">No conflicts detected yet.</p>
              )}
              {(latest?.conflict_signals || []).map((c: any, i: number) => (
                <div key={i} className="rounded-lg border border-border/50 bg-background/40 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{c.conflict}</span>
                    <Badge variant="outline" className={c.severity === "High" ? "border-rose-400/40 text-rose-300" : c.severity === "Medium" ? "border-amber-400/40 text-amber-300" : "border-border/50"}>{c.severity}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Dominant: <span className="text-foreground/80">{c.dominant_signal}</span></p>
                </div>
              ))}
            </div>
          </GlassCard>
          <GlassCard className="p-6">
            <SectionHeader icon={<Target className="h-4 w-4" />} title="Future Probability Engine" subtitle="Forward-looking outcomes" />
            <div className="mt-4 space-y-3">
              {(latest?.future_probabilities || []).length === 0 && (
                <p className="text-sm text-muted-foreground italic">No probabilities computed yet.</p>
              )}
              {(latest?.future_probabilities || []).map((p: any, i: number) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium leading-snug pr-3">{p.outcome}</span>
                    <span className="font-heading font-bold text-primary">{Math.round(p.probability)}%</span>
                  </div>
                  <Progress value={Math.max(0, Math.min(100, p.probability))} className="h-1.5" />
                  {p.rationale && <p className="text-xs text-muted-foreground leading-relaxed">{p.rationale}</p>}
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* PREDICTION HISTORY */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between">
            <SectionHeader icon={<History className="h-4 w-4" />} title="Prediction History & Accuracy" subtitle={`${accuracyStats.hits}/${accuracyStats.total} correct • ${accuracyStats.rate}% hit rate`} />
          </div>
          <Separator className="my-4" />
          <div className="space-y-3">
            {analyses.length === 0 && <p className="text-sm text-muted-foreground italic">No prior analyses yet.</p>}
            {analyses.map(a => (
              <div key={a.id} className="rounded-lg border border-border/50 bg-background/30 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">{a.analysis_date}</Badge>
                    <Badge variant="outline" className="text-[10px]">{a.environment || "—"}</Badge>
                    <span className={`flex items-center gap-1 ${biasTone(a.usd_bias)}`}>USD {biasIcon(a.usd_bias)} {a.usd_bias}</span>
                    <span className={`flex items-center gap-1 ${biasTone(a.gold_bias)}`}>Gold {biasIcon(a.gold_bias)} {a.gold_bias}</span>
                    <span className={`flex items-center gap-1 ${biasTone(a.fed_bias)}`}>Fed {biasIcon(a.fed_bias)} {a.fed_bias}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.outcome_accurate === true && <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">Hit</Badge>}
                    {a.outcome_accurate === false && <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/30">Miss</Badge>}
                    {a.outcome_accurate === null && a.id && (
                      <>
                        <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setOutcomeAccuracy(a.id!, true, a.predicted_outcome || "")}>Mark Hit</Button>
                        <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setOutcomeAccuracy(a.id!, false, a.predicted_outcome || "")}>Mark Miss</Button>
                      </>
                    )}
                  </div>
                </div>
                {a.predicted_outcome && (
                  <p className="mt-2 text-xs text-muted-foreground">Predicted: <span className="text-foreground/80">{a.predicted_outcome}</span></p>
                )}
                {a.narrative && <p className="mt-1 text-xs italic text-muted-foreground line-clamp-2">{a.narrative}</p>}
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

function HeaderChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-md border border-border/60 bg-background/40 px-2.5 py-1">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="text-xs font-medium">{value}</span>
    </div>
  );
}

function SectionHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-8 w-8 rounded-lg border border-border/50 bg-background/40 flex items-center justify-center text-primary">{icon}</div>
      <div>
        <h2 className="font-heading text-base font-semibold tracking-tight">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}

function BiasCard({ title, icon, bias, confidence, accent }: { title: string; icon: React.ReactNode; bias?: string; confidence?: number; accent?: "gold" }) {
  const c = Math.max(0, Math.min(100, Math.round(confidence || 0)));
  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
          <span className={accent === "gold" ? "text-amber-400" : "text-primary"}>{icon}</span>{title}
        </div>
        {biasIcon(bias)}
      </div>
      <div className={`mt-3 font-heading text-3xl font-bold ${biasTone(bias)}`}>{bias || "—"}</div>
      <div className="mt-3 flex items-center gap-2">
        <Progress value={c} className="h-1.5 flex-1" />
        <span className="text-xs font-medium tabular-nums w-10 text-right">{c}%</span>
      </div>
    </GlassCard>
  );
}

function MiniBlock({ label, value, icon }: { label: string; value?: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border/50 bg-background/30 p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon}{label}
      </div>
      <p className="mt-1 text-sm leading-snug">{value || <span className="text-muted-foreground italic">—</span>}</p>
    </div>
  );
}

function NumInput({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  return (
    <Input
      type="number" step="any"
      value={value ?? ""}
      onChange={e => {
        const v = e.target.value;
        onChange(v === "" ? null : Number(v));
      }}
      className="h-8 bg-transparent border-border/40 text-sm"
    />
  );
}

function LabelPill({ value, tone }: { value?: string; tone: "emerald" | "rose" | "amber" | "muted" }) {
  if (!value) return <span className="text-xs text-muted-foreground">—</span>;
  const cls = {
    emerald: "border-emerald-400/40 text-emerald-300 bg-emerald-400/10",
    rose: "border-rose-400/40 text-rose-300 bg-rose-400/10",
    amber: "border-amber-400/40 text-amber-300 bg-amber-400/10",
    muted: "border-border/50 text-foreground/70 bg-background/40",
  }[tone];
  return <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${cls}`}>{value}</span>;
}
