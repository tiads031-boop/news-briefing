/**
 * Information Density Detection — Phase 23 (P1)
 *
 * Before expensive per-cluster AI analysis, do a single ultra-lightweight
 * DeepSeek call with just the headline list to determine if today is a
 * "light", "standard", or "heavy" news day.
 *
 * Token cost is near-zero (headlines only, cached system prompt).
 * The result controls:
 *   - MAX_STORIES cap (4 / 8 / 12)
 *   - AI output depth (which modules to include/omit)
 */

import { info, warn } from './logger';

const API_URL = 'https://api.deepseek.com/chat/completions';
const MODEL = 'deepseek-chat';  // Non-reasoning model — density detection is a simple
                                // classification task, no need for v4-pro reasoning overhead.
                                // Reasoning models consume tokens in reasoning_content first,
                                // often leaving zero tokens for the actual content output.
const REQUEST_TIMEOUT_MS = 60_000;

export type NewsDensity = 'light' | 'standard' | 'heavy';

export interface DensityResult {
  density: NewsDensity;
  reasonEn: string;
  reasonZh: string;
}

const SYSTEM_PROMPT = `You are a senior news editor assessing the information density of today's news cycle. Your only job is to look at a list of headlines and decide how "heavy" the news day is.

## Criteria
- **light**: Slow news day. Few high-impact events. Most headlines are routine updates, minor moves, or filler. 0-2 truly significant stories.
- **standard**: Normal news day. A few significant events across finance, tech, or geopolitics. 3-5 stories worth the reader's attention.
- **heavy**: Major news day. Multiple breaking stories with market/geopolitical impact. 6+ significant events. Readers need the full briefing.

## Rules
- Base your judgment on the density of HIGH-IMPACT events, not just the total headline count.
- A day with 300 headlines about minor tech updates is still "light".
- A day with 100 headlines but 6 about interest rate changes, wars, or market crashes is "heavy".
- Be decisive. Do not default to "standard" out of uncertainty.

## Output Format
Output ONLY valid JSON:
{
  "density": "light" | "standard" | "heavy",
  "reasonEn": "One-sentence explanation in English.",
  "reasonZh": "一句话中文解释。"
}`;

export async function detectDensity(
  headlines: string[],
  apiKey: string
): Promise<DensityResult> {
  const headlineList = headlines.slice(0, 120).map((h, i) => `[${i + 1}] ${h}`).join('\n');
  const prompt = `## Today's Headlines (${headlines.length} total, showing first ${Math.min(headlines.length, 120)})\n\n${headlineList}\n\nAssess the information density of today's news cycle. Output valid JSON only.`;

  try {
    info(`Detecting news density from ${headlines.length} headlines...`);

    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        temperature: 0.1,
        max_tokens: 300,
        response_format: { type: 'json_object' },
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`HTTP ${res.status}: ${body}`);
    }

    const json = await res.json();

    // Check for API-level errors (DeepSeek may return 200 with error object)
    if (json.error || !json.choices) {
      warn(`Density API returned unexpected structure: ${JSON.stringify(json).slice(0, 300)}`);
      throw new Error('Density API error');
    }

    const content = json.choices?.[0]?.message?.content || '';
    if (!content.trim()) {
      warn('Density API returned empty content');
      throw new Error('Empty content');
    }

    // Log cache telemetry (reuses fixed system prompt → high hit rate)
    const usage = json.usage || {};
    const cacheHit = usage.prompt_cache_hit_tokens ?? 0;
    const cacheMiss = usage.prompt_cache_miss_tokens ?? 0;
    info(`Density cache: hit=${cacheHit} miss=${cacheMiss}`);

    let parsed: Record<string, string>;
    try {
      parsed = JSON.parse(content.trim());
    } catch {
      // Try to extract JSON from the response
      const match = content.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('Unable to parse density response');
      parsed = JSON.parse(match[0]);
    }

    const density = parsed.density as NewsDensity;
    if (!['light', 'standard', 'heavy'].includes(density)) {
      warn(`Unexpected density value "${density}", defaulting to standard`);
      return { density: 'standard', reasonEn: 'Default (unparseable)', reasonZh: '默认（无法解析）' };
    }

    info(`News density: ${density} — ${parsed.reasonEn}`);
    return {
      density,
      reasonEn: parsed.reasonEn || '',
      reasonZh: parsed.reasonZh || '',
    };
  } catch (err) {
    warn(`Density detection failed, defaulting to standard`, err);
    return {
      density: 'standard',
      reasonEn: 'Default (detection failed)',
      reasonZh: '默认（判定失败）',
    };
  }
}

/** Map density to story cap */
export function densityToStoryCap(density: NewsDensity): number {
  switch (density) {
    case 'light': return 4;
    case 'heavy': return 12;
    default: return 8;
  }
}

/** Adaptive clustering threshold based on article volume */
export function adaptiveThreshold(totalArticles: number): number {
  if (totalArticles > 200) return 0.22;  // Tighter — more articles, merge aggressively
  if (totalArticles > 100) return 0.25;   // Default
  return 0.28;                             // Looser — fewer articles, don't over-merge
}

/** Density-aware output depth instruction for the AI prompt */
export function densityOutputInstruction(density: NewsDensity): string {
  switch (density) {
    case 'light':
      return `## Output Depth — LIGHT MODE
Today is a light news day. Keep the briefing concise:
- Include ONLY: headline, lead, timeline, sources, nextToWatch, and confidence.
- OMIT: perspectives, keyDetails, secondaryEffects, financeJargon, tradingSignals.
- Max 2 timeline events per story.`;
    case 'heavy':
      return `## Output Depth — HEAVY MODE
Today is a heavy news day. Produce a comprehensive briefing:
- Include ALL modules: perspectives (2+ stakeholders), keyDetails (4 items), secondaryEffects, financeJargon (2-4 terms), tradingSignals (1-3 signals).
- For finance/economy stories, the finance modules are MANDATORY.`;
    default:
      return `## Output Depth — STANDARD MODE
Standard news day. Balanced briefing:
- Include: headline, lead, timeline, sources, keyDetails (4 items), perspectives (2 stakeholders), nextToWatch, confidence.
- Include secondaryEffects only if the event has clear market/industry impact.
- Include financeJargon/tradingSignals only for finance/economy stories.`;
  }
}
