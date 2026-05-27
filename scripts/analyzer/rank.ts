import { info, error, warn } from '../utils/logger';

const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';
const MODEL = 'deepseek-v4-pro';
const REQUEST_TIMEOUT_MS = 180_000;

interface StoryForRanking {
  id: string;
  topicTier: string;
  headlineEn: string;
  headlineZh: string;
  leadEn: string;
  leadZh: string;
  time: string;
  sourceCount: number;
  runningCoverage: boolean;
}

function buildRankingPrompt(stories: StoryForRanking[]): string {
  const storiesBlock = stories.map((s, i) =>
    `[${i}] id="${s.id}"\n  topic: ${s.topicTier} | time: ${s.time} | sources: ${s.sourceCount} | running: ${s.runningCoverage}\n  EN: ${s.headlineEn}\n  ZH: ${s.headlineZh}`
  ).join('\n\n');

  return `You are a senior news editor ranking stories for a daily briefing read by finance, tech, and economy professionals.

Rank the following ${stories.length} stories by a combined score of TIMELINESS × IMPORTANCE. Consider these dimensions:

1. **Recency** (20%): How recently did this break? "Just now" > "2h ago" > "6h ago"
2. **Market Impact** (25%): Does it move markets, affect asset prices, or change investment theses?
3. **Global Significance** (20%): How many people / regions / sectors are affected?
4. **Reader Relevance** (20%): Is this directly relevant to finance/tech/economy professionals?
5. **Source Density** (10%): More independent sources covering the same event = higher signal
6. **Novelty** (5%): Is this a new development, not a continuation of known news?

## Stories to Rank
${storiesBlock}

## Output Format
Return valid JSON only:
{
  "ranking": [
    {
      "storyId": "exact-id-from-above",
      "rank": 1,
      "reasonEn": "Concise reason in English (≤100 chars). What makes this rank here?",
      "reasonZh": "中文排名理由（≤30字）。为什么排在这个位置？"
    }
  ]
}

## Rules
- Every story must appear exactly once in the ranking array
- Ranks must be 1 through ${stories.length} with no gaps or duplicates
- "reasonEn" and "reasonZh" should explain WHY this story earned this specific rank
- For the #1 story, the reason should highlight what makes it the most important/urgent
- For lower-ranked stories, briefly note why they rank below higher ones (less impact? older? niche?)
- Reasons must be specific to each story, not generic
- Output ONLY valid JSON, no markdown, no explanation`;
}

export interface RankingEntry {
  storyId: string;
  rank: number;
  reasonEn: string;
  reasonZh: string;
}

export async function rankStories(
  stories: StoryForRanking[],
  apiKey: string
): Promise<RankingEntry[]> {
  if (stories.length < 2) return [];

  const prompt = buildRankingPrompt(stories);

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      info(`Ranking ${stories.length} stories (attempt ${attempt + 1})...`);

      const res = await fetch(DEEPSEEK_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: 'system', content: 'You are a news ranking engine. Output only valid JSON.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.2,
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

      // Parse JSON from response
      let parsed: { ranking?: RankingEntry[] } = {};
      const trimmed = content.trim();
      try {
        parsed = JSON.parse(trimmed);
      } catch {
        const block = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (block) parsed = JSON.parse(block[1].trim());
        else throw new Error('Unable to parse ranking JSON');
      }

      if (!parsed.ranking || !Array.isArray(parsed.ranking)) {
        throw new Error('Missing or invalid ranking array');
      }

      // Validate: all story IDs present, ranks 1..N
      const ids = new Set(stories.map(s => s.id));
      const ranked = parsed.ranking.filter(e => ids.has(e.storyId));
      if (ranked.length !== stories.length) {
        warn(`Ranking returned ${ranked.length}/${stories.length} stories — some missing`);
      }

      return ranked.sort((a, b) => a.rank - b.rank);
    } catch (err) {
      error(`Ranking attempt ${attempt + 1} failed`, err);
      if (attempt >= 1) {
        warn('Ranking failed after retry — stories will use default order');
        return [];
      }
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  return [];
}
