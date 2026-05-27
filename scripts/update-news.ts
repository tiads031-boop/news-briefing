import 'dotenv/config';
import { writeFileSync, mkdirSync, existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { fetchAllRss } from './fetcher/rss-fetcher';
import { clusterArticles, filterAndSortClusters } from './utils/cluster';
import { dedupAgainstArchive, type DedupStats, tokens, jaccard } from './utils/dedup';
import { loadRecentBriefings } from './utils/archive-context';
import { analyzeWithDeepSeek } from './analyzer/deepseek';
import { analyzeWithKimi } from './analyzer/kimi';
import { rankStories } from './analyzer/rank';
import { info, success, error, warn } from './utils/logger';
import { detectDensity, densityToStoryCap, adaptiveThreshold, type NewsDensity } from './utils/density';
import { calculateIssueNumber, loadIssueConfig, todayUtcDate } from './utils/issue';
import { sendTelegramMessage, formatBriefingNotification } from './utils/telegram';
import { resolveOfficialGlossarySource, type OfficialGlossarySourceType, type OfficialGlossaryMatchLevel } from './utils/official-glossary';

const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY;
const KIMI_KEY = process.env.KIMI_API_KEY;
const MAX_CLUSTERS = 16;
// MAX_STORIES is now dynamic, determined by density detection (4/8/12).
// Kept only as an absolute safety ceiling in case density detection fails.
const MAX_STORIES_CEILING = 12;

interface TimelineEntryOutput {
  date: string;
  year?: string;
  heading: string;
  summary: string;
  relatedDate?: string;
  relatedStoryId?: string;
}

interface FinanceJargonOutput {
  term: string;
  explanation: string;
  domain?: string;
  sourceName?: string;
  sourceUrl?: string;
  sourceType?: OfficialGlossarySourceType;
  sourceMatchLevel?: OfficialGlossaryMatchLevel;
  verifiedAt?: string;
}

interface TradingSignalOutput {
  asset: string;
  direction: 'bullish' | 'bearish' | 'neutral';
  rationale: string;
}

interface StoryOutput {
  id: string;
  topic: string;
  topicTier: string;
  agreement: string;
  time: string;
  featured: boolean;
  runningCoverage: boolean;
  gcc?: boolean;
  headline: string;
  headlineEn: string;
  headlineZh: string;
  lead: string;
  leadEn: string;
  leadZh: string;
  timeline: TimelineEntryOutput[];
  timelineEn?: TimelineEntryOutput[];
  timelineZh?: TimelineEntryOutput[];
  keyDetails: string[];
  keyDetailsEn: string[];
  keyDetailsZh: string[];
  perspectives?: Array<{ who: string; what: string; why?: string }>;
  perspectivesEn?: Array<{ who: string; what: string; why?: string }>;
  perspectivesZh?: Array<{ who: string; what: string; why?: string }>;
  forecasts?: Array<{ who: string; quote: string; source?: string }>;
  nextToWatch?: { date: string; event: string; eventEn?: string; eventZh?: string };
  sources: Array<{
    name: string;
    url: string;
    language: string;
    stance?: string;
    take?: string;
    takeEn?: string;
    takeZh?: string;
  }>;
  secondaryEffects?: Array<{
    dimension: string;
    analysis: string;
    movements?: string;
    evidence?: string;
  }>;
  secondaryEffectsEn?: Array<{
    dimension: string;
    analysis: string;
    movements?: string;
    evidence?: string;
  }>;
  secondaryEffectsZh?: Array<{
    dimension: string;
    analysis: string;
    movements?: string;
    evidence?: string;
  }>;
  financeJargon?: FinanceJargonOutput[];
  financeJargonEn?: FinanceJargonOutput[];
  financeJargonZh?: FinanceJargonOutput[];
  tradingSignals?: TradingSignalOutput[];
  tradingSignalsEn?: TradingSignalOutput[];
  tradingSignalsZh?: TradingSignalOutput[];
  confidence?: number;
  generatedAt: string;
}

function cleanRelated(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  if (!t || t === 'null' || t === 'undefined') return undefined;
  return t;
}

function mapTimelineEntry(raw: Record<string, unknown>): TimelineEntryOutput {
  return {
    date: String(raw.date || ''),
    year: raw.year ? String(raw.year) : undefined,
    heading: String(raw.heading || ''),
    summary: String(raw.summary || ''),
    relatedDate: cleanRelated(raw.relatedDate),
    relatedStoryId: cleanRelated(raw.relatedStoryId),
  };
}

function mapJargon(arr: unknown, language: 'en' | 'zh'): FinanceJargonOutput[] | undefined {
  if (!Array.isArray(arr) || arr.length === 0) return undefined;
  return arr
    .filter((x): x is Record<string, unknown> => x !== null && typeof x === 'object')
    .map(x => {
      const term = String(x.term || '');
      const explanation = String(x.explanation || '');
      const domain = x.domain ? String(x.domain) : undefined;
      const attribution = resolveOfficialGlossarySource({ term, explanation, domain, language });
      return {
        term,
        explanation,
        domain,
        ...attribution,
      };
    })
    .filter(x => x.term && x.explanation);
}

function mapSignals(arr: unknown): TradingSignalOutput[] | undefined {
  if (!Array.isArray(arr) || arr.length === 0) return undefined;
  const allowed = new Set(['bullish', 'bearish', 'neutral']);
  return arr
    .filter((x): x is Record<string, unknown> => x !== null && typeof x === 'object')
    .map(x => {
      const dir = String(x.direction || 'neutral').toLowerCase();
      return {
        asset: String(x.asset || ''),
        direction: (allowed.has(dir) ? dir : 'neutral') as 'bullish' | 'bearish' | 'neutral',
        rationale: String(x.rationale || ''),
      };
    })
    .filter(x => x.asset && x.rationale);
}

const STORY_DUPE_THRESHOLD = 0.65;

function isStoryDuplicate(newStory: StoryOutput, existing: StoryOutput[]): boolean {
  const newUrls = new Set(newStory.sources.map(s => s.url).filter(Boolean));
  for (const ex of existing) {
    const exUrls = ex.sources.map(s => s.url).filter(Boolean);
    if (exUrls.some(u => newUrls.has(u))) return true;
    if (newStory.headlineEn && ex.headlineEn) {
      const sim = jaccard(tokens(newStory.headlineEn, 'en'), tokens(ex.headlineEn, 'en'));
      if (sim >= STORY_DUPE_THRESHOLD) return true;
    }
    if (newStory.headlineZh && ex.headlineZh) {
      const sim = jaccard(tokens(newStory.headlineZh, 'zh'), tokens(ex.headlineZh, 'zh'));
      if (sim >= STORY_DUPE_THRESHOLD) return true;
    }
  }
  return false;
}

function mergeAlsoToday(
  existing: Array<{ source: string; title: string; titleEn?: string; titleZh?: string; topic: string; url: string }> | undefined,
  fresh: Array<{ source: string; title: string; titleEn?: string; titleZh?: string; topic: string; url: string }>
): Array<{ source: string; title: string; titleEn?: string; titleZh?: string; topic: string; url: string }> {
  const seen = new Set((existing || []).map(a => a.url).filter(Boolean));
  const merged = [...(existing || [])];
  for (const item of fresh) {
    if (!seen.has(item.url)) {
      merged.push(item);
      seen.add(item.url);
    }
  }
  return merged.slice(0, 10);
}

function normalizeStory(raw: Record<string, unknown>, cluster: import('./fetcher/rss-fetcher').RawArticle[]): StoryOutput {
  const now = new Date();
  const hoursAgo = (d: string) => {
    const diff = Math.floor((now.getTime() - new Date(d).getTime()) / 3600000);
    return diff < 1 ? 'Just now' : `${diff}h ago`;
  };

  const sources = (raw.sources as Array<Record<string, unknown>> || []).map((s, i) => ({
    name: String(s.name || cluster[i]?.source || 'Unknown'),
    url: String(s.url || cluster[i]?.link || '#'),
    language: String(s.language || cluster[i]?.sourceLanguage || 'en'),
    stance: s.stance ? String(s.stance) : 'aligned',
    take: s.takeZh ? String(s.takeZh) : (s.take ? String(s.take) : undefined),
    takeEn: s.takeEn ? String(s.takeEn) : (s.take ? String(s.take) : undefined),
    takeZh: s.takeZh ? String(s.takeZh) : undefined,
  }));

  // Fill missing source info from cluster data
  cluster.forEach((article, i) => {
    if (!sources[i]) {
      sources.push({
        name: article.source,
        url: article.link,
        language: article.sourceLanguage,
        stance: 'aligned',
        take: article.title,
        takeEn: article.title,
        takeZh: article.title,
      });
    } else if (!sources[i].url || sources[i].url === '#') {
      sources[i].url = article.link;
      sources[i].name = article.source;
      sources[i].language = article.sourceLanguage;
    }
  });

  const headlineEn = String(raw.headlineEn || raw.headline || '');
  const headlineZh = String(raw.headlineZh || raw.headline || '');
  const leadEn = String(raw.leadEn || raw.lead || '');
  const leadZh = String(raw.leadZh || raw.lead || '');

  return {
    id: String(raw.id || `story-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
    topic: String(raw.topic || 'technology'),
    topicTier: String(raw.topicTier || raw.topic || 'technology'),
    agreement: String(raw.agreement || 'aligned'),
    time: String(raw.time || hoursAgo(cluster[0]?.pubDate || new Date().toISOString())),
    featured: false,
    runningCoverage: false,
    headline: headlineEn,
    headlineEn,
    headlineZh,
    lead: leadEn,
    leadEn,
    leadZh,
    timeline: (raw.timeline as Array<Record<string, unknown>> || []).map(mapTimelineEntry),
    timelineEn: (raw.timeline as Array<Record<string, unknown>> || []).map(mapTimelineEntry),
    timelineZh: (raw.timelineZh as Array<Record<string, unknown>> || []).map(mapTimelineEntry),
    keyDetails: (raw.keyDetailsEn as string[] || []).map(String),
    keyDetailsEn: (raw.keyDetailsEn as string[] || []).map(String),
    keyDetailsZh: (raw.keyDetailsZh as string[] || []).map(String),
    perspectives: (raw.perspectivesEn as Array<Record<string, unknown>> || []).map(p => ({
      who: String(p.who || ''),
      what: String(p.what || ''),
      why: p.why ? String(p.why) : undefined,
    })),
    perspectivesEn: (raw.perspectivesEn as Array<Record<string, unknown>> || []).map(p => ({
      who: String(p.who || ''),
      what: String(p.what || ''),
      why: p.why ? String(p.why) : undefined,
    })),
    perspectivesZh: (raw.perspectivesZh as Array<Record<string, unknown>> || []).map(p => ({
      who: String(p.who || ''),
      what: String(p.what || ''),
      why: p.why ? String(p.why) : undefined,
    })),
    forecasts: raw.forecasts ? (raw.forecasts as Array<Record<string, unknown>>).map(f => ({
      who: String(f.who || ''),
      quote: String(f.quote || ''),
      source: f.source ? String(f.source) : undefined,
    })) : undefined,
    nextToWatch: raw.nextToWatch ? {
      date: String((raw.nextToWatch as Record<string, unknown>).date || ''),
      event: String((raw.nextToWatch as Record<string, unknown>).eventEn || (raw.nextToWatch as Record<string, unknown>).event || ''),
      eventEn: String((raw.nextToWatch as Record<string, unknown>).eventEn || (raw.nextToWatch as Record<string, unknown>).event || ''),
      eventZh: String((raw.nextToWatch as Record<string, unknown>).eventZh || ''),
    } : undefined,
    sources,
    secondaryEffects: raw.secondaryEffectsEn ? (raw.secondaryEffectsEn as Array<Record<string, unknown>>).map(e => ({
      dimension: String(e.dimension || ''),
      analysis: String(e.analysis || ''),
      movements: e.movements ? String(e.movements) : undefined,
      evidence: e.evidence ? String(e.evidence) : undefined,
    })) : undefined,
    secondaryEffectsEn: raw.secondaryEffectsEn ? (raw.secondaryEffectsEn as Array<Record<string, unknown>>).map(e => ({
      dimension: String(e.dimension || ''),
      analysis: String(e.analysis || ''),
      movements: e.movements ? String(e.movements) : undefined,
      evidence: e.evidence ? String(e.evidence) : undefined,
    })) : undefined,
    secondaryEffectsZh: raw.secondaryEffectsZh ? (raw.secondaryEffectsZh as Array<Record<string, unknown>>).map(e => ({
      dimension: String(e.dimension || ''),
      analysis: String(e.analysis || ''),
      movements: e.movements ? String(e.movements) : undefined,
      evidence: e.evidence ? String(e.evidence) : undefined,
    })) : undefined,
    financeJargon: mapJargon(raw.financeJargonEn, 'en') ?? mapJargon(raw.financeJargonZh, 'zh'),
    financeJargonEn: mapJargon(raw.financeJargonEn, 'en'),
    financeJargonZh: mapJargon(raw.financeJargonZh, 'zh'),
    tradingSignals: mapSignals(raw.tradingSignalsEn) ?? mapSignals(raw.tradingSignalsZh),
    tradingSignalsEn: mapSignals(raw.tradingSignalsEn),
    tradingSignalsZh: mapSignals(raw.tradingSignalsZh),
    confidence: typeof raw.confidence === 'number' ? Math.max(1, Math.min(5, Math.round(raw.confidence))) : undefined,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  info('Starting news update pipeline');

  if (!DEEPSEEK_KEY && !KIMI_KEY) {
    error('No API keys found. Set DEEPSEEK_API_KEY or KIMI_API_KEY in .env');
    process.exit(1);
  }

  // 1. Fetch
  info('Fetching RSS feeds...');
  const articles = await fetchAllRss();
  info(`Fetched ${articles.length} articles total`);

  if (articles.length === 0) {
    warn('No articles fetched. Check RSS sources.');
    process.exit(0);
  }

  // 1.5 Dedup against last 7 days of archives
  info('Deduplicating against archive (last 7 days)...');
  const { articles: freshArticles, stats: dedupStats } = dedupAgainstArchive(articles);
  info(
    `Dedup: kept ${dedupStats.totalOut}/${dedupStats.totalIn} ` +
    `(removed ${dedupStats.removed} = ${dedupStats.byUrl} URL + ${dedupStats.byTitle} title) ` +
    `across ${dedupStats.archiveDays} archive days`
  );

  if (freshArticles.length === 0) {
    warn('All fetched articles already covered. Nothing fresh to analyze.');
    process.exit(0);
  }

  // 2. Cluster with adaptive threshold
  const clusterThreshold = adaptiveThreshold(freshArticles.length);
  info(`Clustering articles (threshold=${clusterThreshold}, articles=${freshArticles.length})...`);
  const rawClusters = clusterArticles(freshArticles, clusterThreshold);
  info(`Formed ${rawClusters.length} raw clusters`);

  // 2.1 Quality filter
  const clusters = filterAndSortClusters(rawClusters);
  info(`Quality filtered: ${rawClusters.length} → ${clusters.length} clusters`);

  // 2.5 Load last-7-days briefing index — gives AI a grounded list of past
  // stories it may reference via relatedDate/relatedStoryId. Without this the
  // AI guesses dates that 404 on click.
  const recentBriefings = loadRecentBriefings(7);
  info(`Loaded ${recentBriefings.length} recent briefing entries for cross-day links`);

  // 3.0 Density detection — one lightweight call before expensive per-cluster analysis
  const headlines = clusters.map(c => c[0]?.title || '(untitled)');
  const densityResult = DEEPSEEK_KEY
    ? await detectDensity(headlines, DEEPSEEK_KEY)
    : { density: 'standard' as NewsDensity, reasonEn: 'Default (no API key)', reasonZh: '默认（无API密钥）' };
  const maxStories = Math.min(densityToStoryCap(densityResult.density), MAX_STORIES_CEILING);
  info(`Density: ${densityResult.density} → max ${maxStories} stories | ${densityResult.reasonEn}`);

  // 3. Analyze — per-story incremental write
  const stories: StoryOutput[] = [];
  const analyzeClusters = clusters.slice(0, MAX_CLUSTERS);
  const sourceList = [...new Set(articles.map(a => a.source))];

  // Prepare archive path early for per-story writes
  const archiveDir = join('public', 'archive');
  const issueDate = todayUtcDate();
  if (!existsSync(archiveDir)) {
    mkdirSync(archiveDir, { recursive: true });
  }
  const todayArchivePath = join(archiveDir, `${issueDate}.json`);

  // Load existing data for incremental merge
  let existingData: {
    stories?: StoryOutput[];
    alsoToday?: Array<{ source: string; title: string; titleEn?: string; titleZh?: string; topic: string; url: string }>;
    sourceList?: string[];
    dedupStats?: DedupStats;
    issueNumber?: number;
    generatedAt?: string;
  } | null = null;

  if (existsSync(todayArchivePath)) {
    try {
      existingData = JSON.parse(readFileSync(todayArchivePath, 'utf-8'));
      info(`Existing archive found for ${issueDate} — incremental merge mode (append-only)`);
    } catch (e) {
      warn(`Failed to read existing archive: ${(e as Error).message}`);
    }
  }

  const mergedStories: StoryOutput[] = existingData?.stories ? [...existingData.stories] : [];
  let newlyAddedStories = 0;

  for (let i = 0; i < analyzeClusters.length && (mergedStories.length + stories.length) < maxStories; i++) {
    const cluster = analyzeClusters[i];
    try {
      let raw: Record<string, unknown>;

      if (DEEPSEEK_KEY) {
        try {
          raw = await analyzeWithDeepSeek(cluster, DEEPSEEK_KEY, recentBriefings, densityResult.density);
        } catch (e) {
          warn(`DeepSeek failed for cluster ${i + 1}, trying Kimi fallback`);
          if (KIMI_KEY) {
            raw = await analyzeWithKimi(cluster, KIMI_KEY, recentBriefings, densityResult.density);
          } else {
            throw e;
          }
        }
      } else if (KIMI_KEY) {
        raw = await analyzeWithKimi(cluster, KIMI_KEY, recentBriefings, densityResult.density);
      } else {
        throw new Error('No API key available');
      }

      const story = normalizeStory(raw, cluster);

      // Dedup against already-merged stories before adding
      if (!isStoryDuplicate(story, mergedStories)) {
        mergedStories.push(story);
        newlyAddedStories++;
        stories.push(story);

        // Sort: newest first
        mergedStories.sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());

        // --- PER-STORY INCREMENTAL WRITE ---
        const partialOutput = {
          stories: mergedStories,
          alsoToday: mergeAlsoToday(existingData?.alsoToday, []), // alsoToday filled at end
          trackedStories: mergedStories.map(s => ({
            title: s.headlineEn.length > 30 ? s.headlineEn.slice(0, 30) + '...' : s.headlineEn,
            count: s.sources.length,
          })),
          sourceList: [...new Set([...(existingData?.sourceList || []), ...sourceList])],
          issueNumber: undefined, // filled at end
          issueDate,
          dedupStats: undefined, // filled at end
          generatedAt: new Date().toISOString(),
          dataVersion: '1.1.0',
          partial: true,
        };
        writeFileSync('public/news-data.json', JSON.stringify(partialOutput, null, 2));
        writeFileSync(todayArchivePath, JSON.stringify(partialOutput, null, 2));

        // Signal to serve.cjs for SSE streaming
        const addedCount = mergedStories.length;
        process.stdout.write(`[STORY_ADDED] ${JSON.stringify({
          count: addedCount,
          total: Math.min(maxStories, analyzeClusters.length),
          headlineEn: story.headlineEn.slice(0, 80),
          headlineZh: story.headlineZh.slice(0, 80),
        })}
`);

        success(`Story ${stories.length}/max generated + written: "${story.headlineEn.slice(0, 50)}..."`);
      } else {
        warn(`Skipping duplicate story: "${story.headlineEn.slice(0, 50)}..."`);
      }
    } catch (e) {
      error(`Failed to analyze cluster ${i + 1}`, e);
    }
  }

  // 4. Build final output
  const alsoToday = freshArticles.slice(0, 7).map(a => {
    const isZh = a.sourceLanguage === 'zh';
    return {
      source: a.source,
      title: a.title,
      titleEn: isZh ? undefined : a.title,
      titleZh: isZh ? a.title : undefined,
      topic: a.category,
      url: a.link,
    };
  });

  let issueNumber: number | undefined;
  try {
    const config = loadIssueConfig();
    issueNumber = calculateIssueNumber(issueDate, config);
    info(`Issue ${issueNumber} (${issueDate})`);
  } catch (e) {
    warn(`Failed to load issue config: ${(e as Error).message}`);
  }

  const finalAlsoToday = mergeAlsoToday(existingData?.alsoToday, alsoToday);
  const finalSourceList = [...new Set([...(existingData?.sourceList || []), ...sourceList])];
  const finalTrackedStories = mergedStories.map(s => ({
    title: s.headlineEn.length > 30 ? s.headlineEn.slice(0, 30) + '...' : s.headlineEn,
    count: s.sources.length,
  }));

  let finalDedupStats: DedupStats | undefined = dedupStats;
  if (existingData?.dedupStats && dedupStats) {
    finalDedupStats = {
      totalIn: existingData.dedupStats.totalIn + dedupStats.totalIn,
      totalOut: existingData.dedupStats.totalOut + dedupStats.totalOut,
      removed: existingData.dedupStats.removed + dedupStats.removed,
      byUrl: existingData.dedupStats.byUrl + dedupStats.byUrl,
      byTitle: existingData.dedupStats.byTitle + dedupStats.byTitle,
      archiveDays: Math.max(existingData.dedupStats.archiveDays, dedupStats.archiveDays),
    };
  }

  if (newlyAddedStories > 0) {
    info(`Merged: ${existingData?.stories?.length || 0} existing + ${newlyAddedStories} new = ${mergedStories.length} total stories`);
  }

  // 4.5 AI Ranking — sort by time+importance
  let ranking: Array<{ storyId: string; rank: number; reasonEn: string; reasonZh: string }> | undefined;
  if (mergedStories.length >= 2) {
    try {
      info('Ranking stories by importance + timeliness...');
      ranking = await rankStories(mergedStories, DEEPSEEK_KEY || KIMI_KEY || '');
      if (ranking && ranking.length > 0) {
        success(`Ranked ${ranking.length} stories`);
      }
    } catch (e) {
      warn(`Ranking failed (will use default order): ${(e as Error).message}`);
    }
  }

  // 5. Final write
  const output = {
    stories: mergedStories,
    alsoToday: finalAlsoToday,
    trackedStories: finalTrackedStories,
    sourceList: finalSourceList,
    issueNumber: issueNumber ?? existingData?.issueNumber,
    issueDate,
    dedupStats: finalDedupStats,
    ranking,
    generatedAt: new Date().toISOString(),
    dataVersion: '1.1.0',
    partial: false,
  };

  const jsonContent = JSON.stringify(output, null, 2);
  writeFileSync('public/news-data.json', jsonContent);
  success(`Final write: ${mergedStories.length} stories to public/news-data.json`);

  writeFileSync(todayArchivePath, jsonContent);
  success(`Archived snapshot to ${todayArchivePath}`);

  // 5.1 Static dates index (for Vercel/static deploys without /api/news-dates)
  const archiveFiles = readdirSync(archiveDir);
  const dates = archiveFiles
    .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .map((f) => f.replace('.json', ''))
    .sort()
    .reverse();
  writeFileSync('public/news-dates.json', JSON.stringify({ dates }, null, 2));
  success(`Wrote ${dates.length} dates to public/news-dates.json`);

  // Signal completion
  process.stdout.write(`[UPDATE_DONE] ${JSON.stringify({ stories: mergedStories.length, ranking: !!ranking })}
`);

  // 6. Telegram notification
  const newStoryTitles = stories.map(s => s.headlineZh || s.headlineEn || s.headline);
  const telegramText = formatBriefingNotification({
    issueNumber: issueNumber ?? existingData?.issueNumber,
    issueDate,
    storyCount: mergedStories.length,
    alsoTodayCount: finalAlsoToday.length,
    sourceCount: finalSourceList.length,
    newStories: newStoryTitles.length > 0 ? newStoryTitles : undefined,
    baseUrl: process.env.BRIEFING_BASE_URL,
  });
  await sendTelegramMessage({ text: telegramText });
}

main().catch(e => {
  error('Pipeline failed', e);
  process.exit(1);
});
