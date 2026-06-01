import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Upload, X } from 'lucide-react';
import { PillGroup } from './PillGroup';
import { RichTextEditor } from '@/components/shared/RichTextEditor';
import { SaveStatusIndicator } from '@/components/shared/SaveStatusIndicator';
import { useAutosave } from '@/hooks/useAutosave';
import {
  ResearchTest, Strategy, SESSIONS,
} from '@/types/research';
import { cn } from '@/lib/utils';

interface Props {
  strategy: Strategy;
  test: ResearchTest;
  onSave: (t: ResearchTest) => Promise<void> | void;
}

const BIAS_OPTS = ['Bullish', 'Neutral', 'Bearish'] as const;
const DR_OPTS = ['Premium', 'Discount', 'EQ'] as const;
const LIQ_OPTS = ['BSL Above', 'SSL Below', 'Both', 'None'] as const;
const BREAKOUT_OPTS = ['Strong Displacement', 'Weak Displacement', 'No Displacement'] as const;
const FVG_OPTS = ['High', '50%', 'Low'] as const;
const ENTRY_OPTS = ['DR High', 'DR Low', 'Midpoint', 'FVG', 'Supply/Demand'] as const;
const LTF_OPTS = ['Bullish MSS', 'Bearish MSS', 'Wick Rejection', 'Displacement Off Zone'] as const;
const RESULT_OPTS = ['Win', 'Loss', 'Scratch'] as const;
const EMO_OPTS = ['Process', 'Flow', 'Foggy', 'Revenge'] as const;

export function TestEditor({ strategy, test, onSave }: Props) {
  const navigate = useNavigate();
  const [t, setT] = useState<ResearchTest>(test);
  useEffect(() => { setT(test); }, [test.id]); // eslint-disable-line

  const saveFn = useCallback(async (val: ResearchTest) => {
    await onSave({ ...val, updatedAt: new Date().toISOString() });
  }, [onSave]);

  const { status } = useAutosave({ value: t, onSave: saveFn, debounceMs: 800 });

  const upd = <K extends keyof ResearchTest>(k: K, v: ResearchTest[K]) => setT((p) => ({ ...p, [k]: v }));

  const handleUpload = (key: 'predictedScreenshot' | 'actualScreenshot') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => upd(key, r.result as string);
    r.readAsDataURL(f);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between sticky top-0 z-10 bg-background/95 backdrop-blur py-3 -mx-4 px-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/research-lab/${strategy.id}`)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <div>
            <h1 className="font-heading font-bold text-lg">{strategy.name}</h1>
            <p className="text-xs text-muted-foreground">Test entry · {t.date}</p>
          </div>
        </div>
        <SaveStatusIndicator status={status} />
      </div>

      <Section title="Basic Info">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div><Label>Date</Label><Input type="date" value={t.date} onChange={(e) => upd('date', e.target.value)} /></div>
          <div>
            <Label>Pair</Label>
            <PillGroup options={strategy.pairs} value={t.pair} onChange={(v) => upd('pair', v)} size="sm" />
          </div>
          <div>
            <Label>Session</Label>
            <PillGroup options={SESSIONS as unknown as string[]} value={t.session} onChange={(v) => upd('session', v as any)} size="sm" />
          </div>
        </div>
      </Section>

      <Section title="HTF Bias">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><Label>Predicted Bias</Label><PillGroup options={BIAS_OPTS} value={t.predictedBias} onChange={(v) => upd('predictedBias', v)} /></div>
          <div><Label>Actual Bias</Label><PillGroup options={BIAS_OPTS} value={t.actualBias} onChange={(v) => upd('actualBias', v)} /></div>
        </div>
      </Section>

      <Section title="Dealing Range">
        <PillGroup options={DR_OPTS} value={t.dealingRange} onChange={(v) => upd('dealingRange', v)} />
      </Section>

      <Section title="Liquidity" subtitle="Which liquidity pool was targeted?">
        <PillGroup options={LIQ_OPTS} value={t.liquidityTarget} onChange={(v) => upd('liquidityTarget', v)} />
        <div className="mt-3">
          <Label>Which pool and when?</Label>
          <Textarea value={t.liquidityNote} onChange={(e) => upd('liquidityNote', e.target.value)} placeholder="e.g. SSL swept at London open, then BSL targeted in NY..." />
        </div>
      </Section>

      <Section title="Session Narrative" subtitle="What is today's narrative?">
        <Textarea
          rows={4}
          value={t.narrative}
          onChange={(e) => upd('narrative', e.target.value)}
          placeholder="e.g. Expect London to run SSL and reverse toward BSL."
        />
      </Section>

      <Section title="DR Levels">
        <div className="grid grid-cols-3 gap-3">
          <div><Label>High</Label><Input value={t.drHigh} onChange={(e) => upd('drHigh', e.target.value)} /></div>
          <div><Label>EQ</Label><Input value={t.drEq} onChange={(e) => upd('drEq', e.target.value)} /></div>
          <div><Label>Low</Label><Input value={t.drLow} onChange={(e) => upd('drLow', e.target.value)} /></div>
        </div>
      </Section>

      <Section title="Setup Quality">
        <div className="space-y-4">
          <div><Label>Breakout Quality</Label><PillGroup options={BREAKOUT_OPTS} value={t.breakoutQuality} onChange={(v) => upd('breakoutQuality', v)} /></div>
          <div><Label>FVG Location</Label><PillGroup options={FVG_OPTS} value={t.fvgLocation} onChange={(v) => upd('fvgLocation', v)} /></div>
          <div><Label>Entry Type</Label><PillGroup options={ENTRY_OPTS} value={t.entryType} onChange={(v) => upd('entryType', v)} /></div>
          <div><Label>LTF Confirmation</Label><PillGroup options={LTF_OPTS} value={t.ltfConfirmation} onChange={(v) => upd('ltfConfirmation', v)} /></div>
        </div>
      </Section>

      <Section title="Trade Execution">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div><Label>Entry Price</Label><Input value={t.entryPrice} onChange={(e) => upd('entryPrice', e.target.value)} /></div>
          <div><Label>Stop Loss</Label><Input value={t.stopLoss} onChange={(e) => upd('stopLoss', e.target.value)} /></div>
          <div><Label>TP1</Label><Input value={t.tp1} onChange={(e) => upd('tp1', e.target.value)} /></div>
          <div><Label>TP1 Liquidity Target</Label><Input value={t.tp1Target} onChange={(e) => upd('tp1Target', e.target.value)} /></div>
          <div><Label>TP2</Label><Input value={t.tp2} onChange={(e) => upd('tp2', e.target.value)} /></div>
          <div><Label>TP2 Liquidity Target</Label><Input value={t.tp2Target} onChange={(e) => upd('tp2Target', e.target.value)} /></div>
        </div>
      </Section>

      <Section title="Result">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><Label>Outcome</Label><PillGroup options={RESULT_OPTS} value={t.result} onChange={(v) => upd('result', v)} /></div>
          <div><Label>R Achieved</Label><Input value={t.rAchieved} onChange={(e) => upd('rAchieved', e.target.value)} placeholder="e.g. 2.5" /></div>
        </div>
      </Section>

      <Section title="Process Grade">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {([
            { g: 'A' as const, label: 'A Grade', desc: 'Followed model exactly.' },
            { g: 'B' as const, label: 'B Grade', desc: 'Minor deviation from model.' },
            { g: 'C' as const, label: 'C Grade', desc: 'Significant deviation from model.' },
          ]).map((opt) => (
            <button
              key={opt.g}
              type="button"
              onClick={() => upd('grade', opt.g)}
              className={cn(
                'p-4 rounded-lg border-2 text-left transition-all',
                t.grade === opt.g
                  ? 'border-primary bg-primary/5 shadow-md'
                  : 'border-border hover:border-primary/50 hover:bg-accent',
              )}
            >
              <div className="text-2xl font-heading font-bold">{opt.label}</div>
              <div className="text-xs text-muted-foreground mt-1">{opt.desc}</div>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Emotional State">
        <PillGroup options={EMO_OPTS} value={t.emotionalState} onChange={(v) => upd('emotionalState', v)} />
      </Section>

      <Section title="Screenshots">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ScreenshotSlot
            label="Predicted Setup"
            description="Upload chart before trade. Validate prediction quality."
            value={t.predictedScreenshot}
            onUpload={handleUpload('predictedScreenshot')}
            onRemove={() => upd('predictedScreenshot', undefined)}
          />
          <ScreenshotSlot
            label="Actual Outcome"
            description="Upload chart after trade. Compare prediction vs outcome."
            value={t.actualScreenshot}
            onUpload={handleUpload('actualScreenshot')}
            onRemove={() => upd('actualScreenshot', undefined)}
          />
        </div>
      </Section>

      <Section title="Reflection">
        <div className="space-y-4">
          <div><Label>What Went Well</Label>
            <RichTextEditor value={t.reflectionWentWell} onChange={(v) => upd('reflectionWentWell', v)} placeholder="Strengths in this trade..." />
          </div>
          <div><Label>What To Improve</Label>
            <RichTextEditor value={t.reflectionToImprove} onChange={(v) => upd('reflectionToImprove', v)} placeholder="Areas to refine..." />
          </div>
          <div><Label>Trade Review Notes</Label>
            <RichTextEditor value={t.reflectionNotes} onChange={(v) => upd('reflectionNotes', v)} placeholder="Detailed review..." />
          </div>
        </div>
      </Section>

      <Card className="p-5 border-2 border-primary/40 bg-primary/5">
        <h2 className="font-heading font-bold text-lg mb-1">Model Review</h2>
        <p className="text-xs text-muted-foreground mb-4">The critical post-mortem — answer with intent.</p>
        <div className="space-y-4">
          <div>
            <Label className="text-base">Did this trade follow the model?</Label>
            <RichTextEditor value={t.reviewFollowedModel} onChange={(v) => upd('reviewFollowedModel', v)} placeholder="Yes/No and why..." />
          </div>
          <div>
            <Label className="text-base">What was the narrative?</Label>
            <RichTextEditor value={t.reviewNarrative} onChange={(v) => upd('reviewNarrative', v)} placeholder="Describe the actual market story..." />
          </div>
          <div>
            <Label className="text-base">What would you do differently?</Label>
            <RichTextEditor value={t.reviewDifferently} onChange={(v) => upd('reviewDifferently', v)} placeholder="Lessons & adjustments..." />
          </div>
        </div>
      </Card>
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <Card className="p-5">
      <div className="mb-4">
        <h3 className="font-heading font-semibold text-base">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </Card>
  );
}

function ScreenshotSlot({ label, description, value, onUpload, onRemove }: {
  label: string; description: string; value?: string;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void; onRemove: () => void;
}) {
  return (
    <div className="border border-border rounded-lg p-3">
      <Label>{label}</Label>
      <p className="text-xs text-muted-foreground mb-2">{description}</p>
      {value ? (
        <div className="relative group">
          <img src={value} alt={label} className="w-full rounded-md border border-border cursor-zoom-in"
            onClick={() => window.open(value, '_blank')} />
          <Button variant="destructive" size="icon" className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100" onClick={onRemove}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center h-32 rounded-md border-2 border-dashed border-border hover:border-primary/50 cursor-pointer transition-colors">
          <Upload className="h-5 w-5 text-muted-foreground mb-1" />
          <span className="text-xs text-muted-foreground">Click to upload</span>
          <input type="file" accept="image/*" className="hidden" onChange={onUpload} />
        </label>
      )}
    </div>
  );
}
