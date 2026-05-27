import { buildPrompt } from './prompt';
import type { NewsDensity } from '../utils/density';
import type { RawArticle } from '../fetcher/rss-fetcher';
import type { RecentBriefingEntry } from '../utils/archive-context';
import { info, error, warn } from '../utils/logger';

const API_URL = 'https://api.moonshot.cn/v1/chat/completions';
const MODEL = 'kimi-k2.6';
const MAX_RETRIES = 3;
const REQUEST_TIMEOUT_MS = Number(process.env.CI_API_TIMEOUT_MS) || 60_000;
const RETRY_DELAYS_MS = [5_000, 15_000, 45_000];

function isNetworkError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  if (err.name === 'AbortError' || err.name === 'TimeoutError') return true;
  if (msg.includes('terminated') || msg.includes('econnreset') || msg.includes('etimedout') || msg.includes('fetch failed')) return true;
  const cause = (err as { cause?: { code?: string } }).cause;
  if (cause?.code && ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED'].includes(cause.code)) return true;
  return false;
}

function extractJson(content: string): unknown {
  const trimmed = content.trim();

  // 1. Try direct parse
  try {
    return JSON.parse(trimmed);
  } catch {
    // pass
  }

  // 2. Try extracting from markdown code blocks
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch {
      // pass
    }
  }

  // 3. Try finding the outermost JSON object (balanced braces)
  let braceCount = 0;
  let startIdx = -1;
  for (let i = 0; i < trimmed.length; i++) {
    if (trimmed[i] === '{') {
      if (braceCount === 0) startIdx = i;
      braceCount++;
    } else if (trimmed[i] === '}') {
      braceCount--;
      if (braceCount === 0 && startIdx !== -1) {
        try {
          return JSON.parse(trimmed.slice(startIdx, i + 1));
        } catch {
          // pass, continue searching
        }
      }
    }
  }

  // 4. Try greedy regex as last resort
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      // pass
    }
  }

  throw new Error(`Unable to parse JSON from response. Content preview (first 1200 chars):\n${trimmed.slice(0, 1200)}`);
}

export async function analyzeWithKimi(
  cluster: RawArticle[],
  apiKey: string,
  recentBriefings: RecentBriefingEntry[] = [],
  _density?: NewsDensity
): Promise<Record<string, unknown>> {
  const prompt = buildPrompt(cluster, recentBriefings);

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      info(`Kimi analyzing cluster: "${cluster[0].title.slice(0, 50)}..." (attempt ${attempt + 1})`);

      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: 'system', content: 'You are an expert news editor. Output only valid JSON.' },
            { role: 'user', content: prompt },
          ],
          temperature: 1,
          max_tokens: 6000,
          response_format: { type: 'json_object' },
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`HTTP ${res.status}: ${body}`);
      }

      const json = await res.json();
      const content = json.choices?.[0]?.message?.content || '';

      if (!content.trim()) {
        throw new Error('Empty response content');
      }

      const parsed = extractJson(content);
      info(`Kimi analysis succeeded`);
      return parsed as Record<string, unknown>;
    } catch (err) {
      const isNetwork = isNetworkError(err);
      const tag = isNetwork ? '[network]' : '[api]';
      error(`Kimi attempt ${attempt + 1} failed ${tag}`, err);
      if (attempt === MAX_RETRIES) throw err;
      const delay = RETRY_DELAYS_MS[attempt] ?? 30_000;
      warn(`Retrying in ${delay / 1000}s...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }

  throw new Error('Kimi analysis failed after all retries');
}
