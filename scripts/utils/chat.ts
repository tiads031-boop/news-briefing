/**
 * AI Chat Context Assembly — Phase 25
 *
 * Builds the injected context for each chat request by combining:
 *   1. The target story's full AI analysis (from news-data.json)
 *   2. Related stories from recent archives (topic/keyword match)
 *   3. User's unresolved knowledge gaps (from user-knowledge-gaps.json)
 *
 * The combined context is injected into a system message that primes
 * the AI as an editorial companion rather than a generic chatbot.
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

const PUBLIC_DIR = join(process.cwd(), 'public');
const ARCHIVE_DIR = join(PUBLIC_DIR, 'archive');
const GAPS_FILE = join(PUBLIC_DIR, 'user-knowledge-gaps.json');

// ── Types ──────────────────────────────────────────────────────────────
export interface KnowledgeGap {
  id: string;
  topic: string;
  context: string;
  createdAt: string;
  resolvedAt: string | null;
}

export interface GapsStore {
  gaps: KnowledgeGap[];
}

export interface StoryBrief {
  id: string;
  headlineEn: string;
  headlineZh: string;
  topicTier: string;
  leadEn?: string;
  leadZh?: string;
  timeline?: { date: string; heading: string; summary: string }[];
  perspectivesEn?: { who: string; what: string }[];
  perspectivesZh?: { who: string; what: string }[];
  keyDetailsEn?: string[];
  keyDetailsZh?: string[];
  sources?: { name: string; url: string; language: string }[];
  confidence?: number;
}

// ── Gap management ─────────────────────────────────────────────────────
export function loadGaps(): KnowledgeGap[] {
  if (!existsSync(GAPS_FILE)) return [];
  try {
    const data: GapsStore = JSON.parse(readFileSync(GAPS_FILE, 'utf-8'));
    return (data.gaps || []).filter(g => !g.resolvedAt);
  } catch {
    return [];
  }
}

export function saveGap(topic: string, context: string): void {
  const store: GapsStore = { gaps: [] };
  if (existsSync(GAPS_FILE)) {
    try {
      Object.assign(store, JSON.parse(readFileSync(GAPS_FILE, 'utf-8')));
    } catch { /* rebuild if corrupt */ }
  }

  // Dedup: skip if same topic already exists unresolved
  if (store.gaps.some(g => g.topic === topic && !g.resolvedAt)) return;

  store.gaps.push({
    id: `gap-${Date.now()}`,
    topic,
    context,
    createdAt: new Date().toISOString().split('T')[0],
    resolvedAt: null,
  });

  // Cap at 20
  if (store.gaps.filter(g => !g.resolvedAt).length > 20) {
    const oldest = store.gaps
      .filter(g => !g.resolvedAt)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .slice(0, store.gaps.filter(g => !g.resolvedAt).length - 20);
    for (const g of oldest) g.resolvedAt = new Date().toISOString().split('T')[0];
  }

  const { writeFileSync } = require('fs');
  writeFileSync(GAPS_FILE, JSON.stringify(store, null, 2));
}

// ── Story loading ──────────────────────────────────────────────────────
export function loadCurrentStory(storyId: string): StoryBrief | null {
  const newsDataPath = join(PUBLIC_DIR, 'news-data.json');
  if (!existsSync(newsDataPath)) return null;
  try {
    const data = JSON.parse(readFileSync(newsDataPath, 'utf-8'));
    return data.stories?.find((s: StoryBrief) => s.id === storyId) || null;
  } catch {
    return null;
  }
}

export function loadRelatedStories(story: StoryBrief, maxResults = 3): StoryBrief[] {
  if (!existsSync(ARCHIVE_DIR)) return [];

  const keywords = extractKeywords(story);
  const results: { story: StoryBrief; score: number }[] = [];
  const archiveFiles = readdirSync(ARCHIVE_DIR)
    .filter(f => f.endsWith('.json'))
    .sort()
    .reverse()
    .slice(0, 7);

  for (const file of archiveFiles) {
    try {
      const data = JSON.parse(readFileSync(join(ARCHIVE_DIR, file), 'utf-8'));
      for (const s of (data.stories || []) as StoryBrief[]) {
        if (s.id === story.id) continue; // skip self
        const score = relevanceScore(s, keywords);
        if (score > 0) results.push({ story: s, score });
      }
    } catch { /* skip corrupt archives */ }
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, maxResults).map(r => r.story);
}

function extractKeywords(story: StoryBrief): Set<string> {
  const text = [
    story.headlineEn, story.headlineZh,
    ...(story.keyDetailsEn || []), ...(story.keyDetailsZh || []),
  ].join(' ').toLowerCase();

  return new Set(
    text
      .replace(/[^\w\s\u4e00-\u9fa5]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3)
  );
}

function relevanceScore(story: StoryBrief, keywords: Set<string>): number {
  const text = [story.headlineEn, story.leadEn || '', story.topicTier].join(' ').toLowerCase();
  let score = 0;
  // Topic match: +2
  for (const kw of keywords) {
    if (text.includes(kw)) score += 1;
  }
  return score;
}

// ── Prompt building ────────────────────────────────────────────────────
export function buildChatSystemPrompt(
  story: StoryBrief,
  gaps: KnowledgeGap[],
  relatedStories: StoryBrief[]
): string {
  let prompt = `You are an editorial companion for GlobalPulse, a curated bilingual news briefing. A reader has just finished reading the following story and wants to discuss it further.

## Current Story
${formatStoryForPrompt(story)}`;

  if (gaps.length > 0) {
    prompt += `\n\n## Reader's Knowledge Gaps
The reader has previously shown they don't fully understand these concepts. Use this to tailor your explanations:\n`;
    for (const g of gaps.slice(0, 5)) {
      prompt += `- ${g.topic}: ${g.context}\n`;
    }
  }

  if (relatedStories.length > 0) {
    prompt += `\n\n## Related Recent Coverage\n`;
    for (const s of relatedStories) {
      prompt += `- "${s.headlineEn}" | ${s.headlineZh} | topic: ${s.topicTier}\n`;
    }
    prompt += `\nIf the reader's question relates to broader context, you may reference these related stories.`;
  }

  prompt += `\n\n## Guidelines
- Answer in the language the reader uses. If they write Chinese, reply in Chinese. If English, reply in English.
- Keep answers concise (2-4 sentences), but offer to elaborate if the reader wants more depth.
- When the reader asks "展开讲讲" or "这是什么意思", recognize this as a knowledge gap. At the end of your answer, add [GAP: <topic>] to log it.
- Don't pretend to know things not in the provided context. If unsure, say so.`;

  return prompt;
}

function formatStoryForPrompt(story: StoryBrief): string {
  const parts = [
    `Headline: ${story.headlineEn}`,
    `中文标题: ${story.headlineZh}`,
    `Topic: ${story.topicTier}`,
  ];
  if (story.leadEn) parts.push(`Summary: ${story.leadEn}`);
  if (story.keyDetailsEn?.length) {
    parts.push(`Key Details: ${story.keyDetailsEn.join(' | ')}`);
  }
  if (story.perspectivesEn?.length) {
    const pList = story.perspectivesEn.map(p => `${p.who}: ${p.what}`).join(' | ');
    parts.push(`Perspectives: ${pList}`);
  }
  if (story.sources?.length) {
    parts.push(`Sources (${story.sources.length}): ${story.sources.map(s => s.name).join(', ')}`);
  }
  if (story.confidence) parts.push(`AI Confidence: ${story.confidence}/5`);
  return parts.join('\n');
}
