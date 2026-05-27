/**
 * Editorial Review Script — Phase 21 P0-B
 *
 * Loads recent archive briefings and runs a lightweight editorial assessment
 * via DeepSeek. The AI acts as a senior editor reviewing the day's output,
 * producing diff-style recommendations (strike + replacement + rationale).
 *
 * Usage:
 *   npx tsx scripts/editorial-review.ts [daysBack=3]
 *
 * Output:
 *   reports/editorial-review-YYYY-MM-DD.md
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { config } from 'dotenv';
import { info, error } from './utils/logger';

config();

const API_URL = 'https://api.deepseek.com/chat/completions';
const MODEL = 'deepseek-v4-pro';
const REQUEST_TIMEOUT_MS = 180_000;
const ARCHIVE_DIR = path.resolve('public', 'archive');
const REPORTS_DIR = path.resolve('reports');

interface ArchiveStory {
  id: string;
  headlineEn: string;
  headlineZh: string;
  leadEn: string;
  leadZh: string;
  topicTier: string;
  agreement: string;
  sources: { name: string; url: string; language: string; takeEn?: string; takeZh?: string }[];
  timeline?: { date: string; heading: string; summary: string }[];
  keyDetailsEn?: string[];
  keyDetailsZh?: string[];
  perspectivesEn?: { who: string; what: string }[];
  perspectivesZh?: { who: string; what: string }[];
  confidence?: number;
  generatedAt?: string;
}

interface ArchiveFile {
  issueDate: string;
  issueNumber: number;
  stories: ArchiveStory[];
}

function loadRecentArchives(daysBack: number): ArchiveFile[] {
  const files = fs.readdirSync(ARCHIVE_DIR)
    .filter(f => f.endsWith('.json'))
    .sort()
    .reverse()
    .slice(0, daysBack);

  const archives: ArchiveFile[] = [];
  for (const f of files) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(ARCHIVE_DIR, f), 'utf-8'));
      archives.push(data);
    } catch {
      error(`Failed to parse archive ${f}`);
    }
  }
  return archives.reverse(); // chronological order
}

function formatStoryForReview(s: ArchiveStory, idx: number): string {
  const srcList = s.sources.map(src => `- ${src.name} (${src.language}) ${src.takeEn ?? ''}`).join('\n');
  return `
--- Story #${idx + 1} ---
id: ${s.id}
headlineEn: ${s.headlineEn}
headlineZh: ${s.headlineZh}
leadEn: ${s.leadEn}
leadZh: ${s.leadZh}
topicTier: ${s.topicTier}
agreement: ${s.agreement}
confidence: ${s.confidence ?? 'N/A'}
sources (${s.sources.length}):\n${srcList}
keyDetailsEn: ${(s.keyDetailsEn ?? []).join(' | ')}
perspectivesEn: ${(s.perspectivesEn ?? []).map(p => `${p.who}: ${p.what}`).join(' | ')}
`;
}

function buildEditorialPrompt(archive: ArchiveFile): string {
  const storiesText = archive.stories.map((s, i) => formatStoryForReview(s, i)).join('\n');

  return `You are the Editor-in-Chief of GlobalPulse, a curated bilingual news briefing. You are reviewing the day's output before it goes to readers.

## Editorial Principles
1. **Coverage vs Curation**: We are NOT an aggregator. If two stories overlap in theme or event, one must be cut or merged.
2. **Source Depth**: A story with only 1-2 sources is fragile. Either downgrade it or find a stronger angle.
3. **Perspective Tension**: If every source says the same thing, the story lacks editorial value. Simplify or drop.
4. **Reader Value**: Ask "what decision does this help the reader make?" If none, consider dropping.
5. **Bilingual Quality**: Headlines and leads must feel native in both languages. Flag awkward translation.

## Today's Briefing — Issue ${archive.issueNumber} (${archive.issueDate})
${storiesText}

## Your Task
For EACH story above, produce an editorial recommendation in this exact JSON format:

[
  {
    "storyId": "exact-id-from-input",
    "verdict": "keep" | "merge" | "downgrade" | "drop",
    "strike": "Exact text from the story that should be removed or rewritten (can be empty string if no strike)",
    "replace": "Your replacement text, or empty string if dropping entirely",
    "rationaleEn": "One-sentence editorial rationale in English.",
    "rationaleZh": "一句话编辑理由（中文）。"
  }
]

Rules:
- If verdict is "merge", set strike to the redundant part and replace to a note like "Merge with story-{otherId}".
- If verdict is "drop", set replace to empty string.
- If verdict is "keep", still set strike/replace if you see wording worth improving; otherwise both can be empty.
- Be decisive. A briefing with 6 stories should probably have 3-4 truly strong ones.
- Output ONLY valid JSON. No markdown, no extra commentary.`;
}

async function runEditorialReview(archive: ArchiveFile): Promise<string> {
  const prompt = buildEditorialPrompt(archive);

  info(`Requesting editorial review for Issue ${archive.issueNumber} (${archive.issueDate})...`);

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY not set');
  }

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: 'You are a decisive senior news editor. Output only valid JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 8000,
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

  // Log cache telemetry
  const usage = json.usage || {};
  const cacheHit = usage.prompt_cache_hit_tokens ?? 0;
  const cacheMiss = usage.prompt_cache_miss_tokens ?? 0;
  info(`Editorial review cache: hit=${cacheHit} miss=${cacheMiss}`);

  if (!content.trim()) {
    throw new Error('Empty response');
  }

  // Extract JSON array (the AI may wrap it in an object or return directly)
  let parsed: unknown;
  try {
    parsed = JSON.parse(content.trim());
  } catch {
    // Try to find JSON array inside text
    const arrMatch = content.match(/\[[\s\S]*\]/);
    if (arrMatch) {
      parsed = JSON.parse(arrMatch[0]);
    } else {
      throw new Error('Unable to parse JSON from editorial review response');
    }
  }

  // If the model wrapped the array in an object, unwrap it
  let recommendations: unknown[];
  if (Array.isArray(parsed)) {
    recommendations = parsed;
  } else if (parsed && typeof parsed === 'object' && Array.isArray((parsed as Record<string, unknown>).recommendations)) {
    recommendations = (parsed as Record<string, unknown>).recommendations as unknown[];
  } else {
    // Try to find any array property
    const obj = parsed as Record<string, unknown>;
    const arrProp = Object.values(obj).find(v => Array.isArray(v));
    if (arrProp) {
      recommendations = arrProp as unknown[];
    } else {
      throw new Error('Unexpected editorial review response structure');
    }
  }

  return renderReport(archive, recommendations);
}

function renderReport(archive: ArchiveFile, recommendations: unknown[]): string {
  const dateStr = archive.issueDate;
  let md = `# Editorial Review — Issue ${archive.issueNumber} (${dateStr})\n\n`;
  md += `> Generated: ${new Date().toISOString()}\n\n`;
  md += `## Summary\n\n`;

  const storyMap = new Map(archive.stories.map(s => [s.id, s]));

  for (const rec of recommendations) {
    const r = rec as Record<string, string>;
    const story = storyMap.get(r.storyId);
    if (!story) continue;

    const verdictEmoji = { keep: '✅', merge: '🔀', downgrade: '⬇️', drop: '❌' }[r.verdict] ?? '❓';
    md += `### ${verdictEmoji} ${story.headlineEn}\n\n`;
    md += `- **Verdict**: \`${r.verdict}\`\n`;
    md += `- **Rationale (EN)**: ${r.rationaleEn}\n`;
    md += `- **Rationale (ZH)**: ${r.rationaleZh}\n`;

    if (r.strike) {
      md += `- **Strike**: ~~${r.strike}~~\n`;
    }
    if (r.replace) {
      md += `- **Replace**: ${r.replace}\n`;
    }
    md += `\n`;
  }

  md += `---\n\n`;
  md += `## Raw Recommendations\n\n`;
  md += '```json\n';
  md += JSON.stringify(recommendations, null, 2);
  md += '\n```\n';

  return md;
}

async function main() {
  const daysBack = parseInt(process.argv[2] || '3', 10);
  const archives = loadRecentArchives(daysBack);

  if (archives.length === 0) {
    error('No archives found.');
    process.exit(1);
  }

  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }

  // Review the most recent archive
  const target = archives[archives.length - 1];
  const report = await runEditorialReview(target);

  const outFile = path.join(REPORTS_DIR, `editorial-review-${target.issueDate}.md`);
  fs.writeFileSync(outFile, report, 'utf-8');
  info(`Editorial review written to ${outFile}`);
}

main().catch(err => {
  error('Editorial review failed', err);
  process.exit(1);
});
