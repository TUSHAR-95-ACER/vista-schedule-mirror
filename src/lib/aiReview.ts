/**
 * Client helper for the `ai-review` edge function (AWS Bedrock / Claude).
 * The Bedrock API key lives only in the edge function — never imported here.
 */
import { supabase } from '@/integrations/supabase/client';

export type AIReviewMode =
  | 'quick'
  | 'summary'
  | 'psychology'
  | 'review'
  | 'mentor'
  | 'deep'
  | 'full-journal';

export interface AIReviewRequest {
  /** Routing key — picks Haiku / Sonnet / Opus. */
  mode?: AIReviewMode;
  /** User-facing instruction or question. */
  prompt: string;
  /** Optional JSON payload (trades, plan, psychology snapshot, etc.). */
  payload?: unknown;
  /** Optional system prompt override. */
  system?: string;
}

export interface AIReviewResponse {
  text: string;
  model: string;
  tier: 'haiku' | 'sonnet' | 'opus';
  mode: AIReviewMode;
  usage?: { input_tokens?: number; output_tokens?: number } | null;
}

export async function callAIReview(req: AIReviewRequest): Promise<AIReviewResponse> {
  const { data, error } = await supabase.functions.invoke('ai-review', { body: req });
  if (error) throw new Error(error.message || 'ai-review failed');
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as AIReviewResponse;
}
