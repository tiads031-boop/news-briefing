import type { RawArticle } from '../fetcher/rss-fetcher';
import type { RecentBriefingEntry } from '../utils/archive-context';

// ── Prompt Cache Layering ────────────────────────────────────────────
// DeepSeek prompt cache pricing: hit ~$0.0145/M tokens, miss ~$1.74/M tokens.
// To maximize cache hits, split each call into three layers ordered by
// stability (most-stable first):
//   1. Fixed layer    → system message (role + schema + rules)
//   2. Semi-fixed     → recent briefings index (changes at most once/day)
//   3. Dynamic layer  → today's articles (changes every call)
// The messages array becomes:
//   [system: fixed] + [user: semi-fixed + dynamic]
// Because the prefix of the user message (semi-fixed) rarely changes,
// DeepSeek can cache it across clusters on the same day.
// ----------------------------------------------------------------------

export function buildSystemPrompt(density?: NewsDensity): string {
  const densityInstruction = density ? '\n\n' + densityOutputInstruction(density) : '';

  return `You are a senior international news editor specializing in financial, economic, and technology reporting. Your task is to synthesize multiple news reports about the same event into a structured bilingual (English + Chinese) briefing.

## Output Format
Output a single valid JSON object with the following structure. Do NOT wrap in markdown code blocks. Ensure all JSON is valid and properly escaped.

{
  "id": "kebab-case-slug-based-on-headline",
  "topic": "finance" | "economy" | "technology",
  "topicTier": "finance" | "economy" | "technology" | "geopolitics",
  "agreement": "aligned" | "mixed" | "disputed",
  "time": "Nh ago" or "Just now",
  "featured": false,
  "runningCoverage": false,
  "headlineEn": "English headline (concise, newspaper style, 8-15 words)",
  "headlineZh": "中文标题（简洁，报纸风格，8-15个字）",
  "leadEn": "English lead paragraph: 2-3 sentences summarizing the core event, significance, and immediate context.",
  "leadZh": "中文导语：2-3句话概括核心事件、意义和即时背景。",
  "timeline": [
    {
      "date": "Mon DD",
      "year": "YYYY",
      "heading": "English heading",
      "summary": "English summary",
      "relatedDate": "YYYY-MM-DD or null if no prior coverage",
      "relatedStoryId": "kebab-case-slug or null"
    }
  ],
  "timelineZh": [
    {
      "date": "Mon DD",
      "year": "YYYY",
      "heading": "中文时间线标题",
      "summary": "中文摘要",
      "relatedDate": "YYYY-MM-DD or null",
      "relatedStoryId": "kebab-case-slug or null"
    }
  ],
  "keyDetailsEn": [
    "Bullet point 1 in English.",
    "Bullet point 2 in English.",
    "Bullet point 3 in English.",
    "Bullet point 4 in English."
  ],
  "keyDetailsZh": [
    "中文要点1。",
    "中文要点2。",
    "中文要点3。",
    "中文要点4。"
  ],
  "perspectivesEn": [
    { "who": "Stakeholder name", "what": "Their position/view in English.", "why": "Different framing" },
    { "who": "Another stakeholder", "what": "Their position/view in English.", "why": "Different framing" }
  ],
  "perspectivesZh": [
    { "who": "利益相关方名称", "what": "他们的立场/观点（中文）。", "why": "Different framing" },
    { "who": "另一方利益相关方", "what": "他们的立场/观点（中文）。", "why": "Different framing" }
  ],
  "sources": [
    {
      "name": "Source Name",
      "url": "original URL from input",
      "language": "en" | "zh",
      "stance": "aligned",
      "takeEn": "English summary of this source's take (1 sentence)",
      "takeZh": "中文摘要：该来源的立场（一句话）"
    }
  ],
  "secondaryEffectsEn": [
    {
      "dimension": "Market / Sector Name",
      "analysis": "English analysis of secondary impact.",
      "movements": "Key observable movements or trends.",
      "evidence": "Supporting evidence from sources."
    }
  ],
  "secondaryEffectsZh": [
    {
      "dimension": "市场/行业名称",
      "analysis": "次级影响的中文分析。",
      "movements": "关键可观察的变动或趋势。",
      "evidence": "来源中的支持证据。"
    }
  ],
  "nextToWatch": {
    "date": "YYYY-MM-DD",
    "eventEn": "What to watch next in English.",
    "eventZh": "下一步关注什么（中文）。"
  },
  "financeJargonEn": [
    { "term": "Financial term or jargon from the articles", "explanation": "Plain English explanation", "domain": "monetary_policy | securities | derivatives | accounting | macro | fx | commodities | banking | m&a" }
  ],
  "financeJargonZh": [
    { "term": "金融术语或行话", "explanation": "通俗易懂的中文解释", "domain": "货币政策 | 证券 | 衍生品 | 会计 | 宏观 | 外汇 | 大宗商品 | 银行 | 并购重组" }
  ],
  "tradingSignalsEn": [
    { "asset": "Asset name (e.g. USD/CNY, S&P 500, BTC)", "direction": "bullish | bearish | neutral", "rationale": "Why this signal, in English" }
  ],
  "tradingSignalsZh": [
    { "asset": "资产名称", "direction": "bullish | bearish | neutral", "rationale": "信号理由（中文）" }
  ],
  "confidence": 3
}

## Requirements
1. The "timeline" (English) and "timelineZh" (Chinese) must be based on actual dates from the articles. Create 2-4 timeline entries in EACH array. The date and year fields should be identical; only heading and summary need to be translated.
2. "perspectives" must represent at least 2 genuinely different stakeholders with different interests.
3. "sources" MUST include every input article's name, URL, and language. Do not invent URLs.
4. "keyDetails" must be factual claims extracted from the articles, not opinions.
5. "secondaryEffects" should analyze market/industry impact if this is finance/economy/tech news.
6. All Chinese content must read naturally as native Chinese journalism, NOT word-for-word translation.
7. If the articles disagree on facts, set "agreement" to "disputed" and note the conflict in perspectives.
8. Use the current year (2026) for all dates.
9. For timeline entries: if a timeline event matches one of the entries in the "Recent Briefings Index" below, set "relatedDate" and "relatedStoryId" to the exact date and id from that index. Match by topic similarity, not just keyword overlap. If no entry in the index matches, set BOTH fields to null. Never invent dates or ids that are not in the index.
10. For finance/economy stories (topicTier="finance" or "economy"): you MUST populate "financeJargonEn"/"financeJargonZh" with 2-4 key terms (M&A vocabulary, monetary policy terms, accounting concepts, derivatives jargon, market structure terms, etc. that appear in the articles or are needed to understand them) and "tradingSignalsEn"/"tradingSignalsZh" with 1-3 actionable market signals (specific assets like USD/CNY, S&P 500, BTC, Brent crude — concrete, not generic "stocks"). For each financeJargon item, set only a semantic "domain" from the allowed examples; NEVER invent or output source URLs. Official source links are added by deterministic post-processing. For technology/geopolitics stories: omit these arrays. If a tech story has clear market implications (M&A, IPO, earnings impact, supply-chain shock), classify it as "topicTier=finance" or "topicTier=economy" instead of "technology" so finance fields get populated.
11. "confidence": Rate your own analysis quality on a scale of 1-5. Consider: (a) source clarity and agreement, (b) factual completeness, (c) potential for hallucination or unsupported inference. Use 5 = high confidence (sources clear, facts solid), 3 = moderate (some gaps or conflicting reports), 1 = low confidence (sources sparse, significant uncertainty, high hallucination risk). Be honest and conservative.
12. Output ONLY valid JSON. No markdown, no explanation, no extra text before or after the JSON.${densityInstruction}`;
}

function buildArticlesBlock(cluster: RawArticle[]): string {
  return cluster.map((a, i) => `
[${i + 1}] ${a.source} (${a.sourceLanguage === 'zh' ? '中文' : 'English'})
Title: ${a.title}
URL: ${a.link}
Content: ${a.content.slice(0, 600)}${a.content.length > 600 ? '...' : ''}
Published: ${a.pubDate}
`).join('\n---\n');
}

function buildRecentBriefingsBlock(recentBriefings: RecentBriefingEntry[]): string {
  if (recentBriefings.length === 0) {
    return '\n\n## Recent Briefings Index\n(empty — no past briefings to link to. Set every relatedDate and relatedStoryId to null.)';
  }
  return `\n\n## Recent Briefings Index (for cross-day timeline links)\n${recentBriefings
    .map(b => `- date=${b.date} id=${b.id} :: ${b.headlineEn}${b.headlineZh ? ` / ${b.headlineZh}` : ''}`)
    .join('\n')}\n\nThe above is the ONLY set of past briefings the reader can navigate to. When a timeline event in your output corresponds to one of these prior stories, set "relatedDate" to that exact date and "relatedStoryId" to that exact id. If no prior story in this index matches, set both to null. NEVER invent dates or ids that are not in the list above.`;
}

export function buildUserPrompt(
  cluster: RawArticle[],
  recentBriefings: RecentBriefingEntry[] = []
): string {
  // Cache-friendly order: semi-fixed first, dynamic last.
  const briefingsBlock = buildRecentBriefingsBlock(recentBriefings);
  const articlesText = buildArticlesBlock(cluster);

  return `## Input Articles
The following articles are about the same event or closely related events:
${articlesText}${briefingsBlock}`;
}

// Legacy unified prompt — kept for Kimi and any backward-compat callers.
export function buildPrompt(
  cluster: RawArticle[],
  recentBriefings: RecentBriefingEntry[] = []
): string {
  const articlesText = buildArticlesBlock(cluster);
  const briefingsBlock = buildRecentBriefingsBlock(recentBriefings);

  return `You are a senior international news editor specializing in financial, economic, and technology reporting. Your task is to synthesize multiple news reports about the same event into a structured bilingual (English + Chinese) briefing.

## Input Articles
The following articles are about the same event or closely related events:
${articlesText}${briefingsBlock}

## Output Format
Output a single valid JSON object with the following structure. Do NOT wrap in markdown code blocks. Ensure all JSON is valid and properly escaped.

{
  "id": "kebab-case-slug-based-on-headline",
  "topic": "finance" | "economy" | "technology",
  "topicTier": "finance" | "economy" | "technology" | "geopolitics",
  "agreement": "aligned" | "mixed" | "disputed",
  "time": "Nh ago" or "Just now",
  "featured": false,
  "runningCoverage": false,
  "headlineEn": "English headline (concise, newspaper style, 8-15 words)",
  "headlineZh": "中文标题（简洁，报纸风格，8-15个字）",
  "leadEn": "English lead paragraph: 2-3 sentences summarizing the core event, significance, and immediate context.",
  "leadZh": "中文导语：2-3句话概括核心事件、意义和即时背景。",
  "timeline": [
    {
      "date": "Mon DD",
      "year": "YYYY",
      "heading": "English heading",
      "summary": "English summary",
      "relatedDate": "YYYY-MM-DD or null if no prior coverage",
      "relatedStoryId": "kebab-case-slug or null"
    }
  ],
  "timelineZh": [
    {
      "date": "Mon DD",
      "year": "YYYY",
      "heading": "中文时间线标题",
      "summary": "中文摘要",
      "relatedDate": "YYYY-MM-DD or null",
      "relatedStoryId": "kebab-case-slug or null"
    }
  ],
  "keyDetailsEn": [
    "Bullet point 1 in English.",
    "Bullet point 2 in English.",
    "Bullet point 3 in English.",
    "Bullet point 4 in English."
  ],
  "keyDetailsZh": [
    "中文要点1。",
    "中文要点2。",
    "中文要点3。",
    "中文要点4。"
  ],
  "perspectivesEn": [
    { "who": "Stakeholder name", "what": "Their position/view in English.", "why": "Different framing" },
    { "who": "Another stakeholder", "what": "Their position/view in English.", "why": "Different framing" }
  ],
  "perspectivesZh": [
    { "who": "利益相关方名称", "what": "他们的立场/观点（中文）。", "why": "Different framing" },
    { "who": "另一方利益相关方", "what": "他们的立场/观点（中文）。", "why": "Different framing" }
  ],
  "sources": [
    {
      "name": "Source Name",
      "url": "original URL from input",
      "language": "en" | "zh",
      "stance": "aligned",
      "takeEn": "English summary of this source's take (1 sentence)",
      "takeZh": "中文摘要：该来源的立场（一句话）"
    }
  ],
  "secondaryEffectsEn": [
    {
      "dimension": "Market / Sector Name",
      "analysis": "English analysis of secondary impact.",
      "movements": "Key observable movements or trends.",
      "evidence": "Supporting evidence from sources."
    }
  ],
  "secondaryEffectsZh": [
    {
      "dimension": "市场/行业名称",
      "analysis": "次级影响的中文分析。",
      "movements": "关键可观察的变动或趋势。",
      "evidence": "来源中的支持证据。"
    }
  ],
  "nextToWatch": {
    "date": "YYYY-MM-DD",
    "eventEn": "What to watch next in English.",
    "eventZh": "下一步关注什么（中文）。"
  },
  "financeJargonEn": [
    { "term": "Financial term or jargon from the articles", "explanation": "Plain English explanation", "domain": "monetary_policy | securities | derivatives | accounting | macro | fx | commodities | banking | m&a" }
  ],
  "financeJargonZh": [
    { "term": "金融术语或行话", "explanation": "通俗易懂的中文解释", "domain": "货币政策 | 证券 | 衍生品 | 会计 | 宏观 | 外汇 | 大宗商品 | 银行 | 并购重组" }
  ],
  "tradingSignalsEn": [
    { "asset": "Asset name (e.g. USD/CNY, S&P 500, BTC)", "direction": "bullish | bearish | neutral", "rationale": "Why this signal, in English" }
  ],
  "tradingSignalsZh": [
    { "asset": "资产名称", "direction": "bullish | bearish | neutral", "rationale": "信号理由（中文）" }
  ],
  "confidence": 3
}

## Requirements
1. The "timeline" (English) and "timelineZh" (Chinese) must be based on actual dates from the articles. Create 2-4 timeline entries in EACH array. The date and year fields should be identical; only heading and summary need to be translated.
2. "perspectives" must represent at least 2 genuinely different stakeholders with different interests.
3. "sources" MUST include every input article's name, URL, and language. Do not invent URLs.
4. "keyDetails" must be factual claims extracted from the articles, not opinions.
5. "secondaryEffects" should analyze market/industry impact if this is finance/economy/tech news.
6. All Chinese content must read naturally as native Chinese journalism, NOT word-for-word translation.
7. If the articles disagree on facts, set "agreement" to "disputed" and note the conflict in perspectives.
8. Use the current year (2026) for all dates.
9. For timeline entries: if a timeline event matches one of the entries in the "Recent Briefings Index" above, set "relatedDate" and "relatedStoryId" to the exact date and id from that index. Match by topic similarity, not just keyword overlap. If no entry in the index matches, set BOTH fields to null. Never invent dates or ids that are not in the index.
10. For finance/economy stories (topicTier="finance" or "economy"): you MUST populate "financeJargonEn"/"financeJargonZh" with 2-4 key terms (M&A vocabulary, monetary policy terms, accounting concepts, derivatives jargon, market structure terms, etc. that appear in the articles or are needed to understand them) and "tradingSignalsEn"/"tradingSignalsZh" with 1-3 actionable market signals (specific assets like USD/CNY, S&P 500, BTC, Brent crude — concrete, not generic "stocks"). For each financeJargon item, set only a semantic "domain" from the allowed examples; NEVER invent or output source URLs. Official source links are added by deterministic post-processing. For technology/geopolitics stories: omit these arrays. If a tech story has clear market implications (M&A, IPO, earnings impact, supply-chain shock), classify it as "topicTier=finance" or "topicTier=economy" instead of "technology" so finance fields get populated.
11. "confidence": Rate your own analysis quality on a scale of 1-5. Consider: (a) source clarity and agreement, (b) factual completeness, (c) potential for hallucination or unsupported inference. Use 5 = high confidence (sources clear, facts solid), 3 = moderate (some gaps or conflicting reports), 1 = low confidence (sources sparse, significant uncertainty, high hallucination risk). Be honest and conservative.
12. Output ONLY valid JSON. No markdown, no explanation, no extra text before or after the JSON.`;
}
