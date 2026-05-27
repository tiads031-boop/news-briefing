import Parser from 'rss-parser';
import { RSS_SOURCES, type RssSource } from './sources';
import { shouldSkipSource, recordSourceSuccess, recordSourceError } from '../utils/source-health';

const parser = new Parser({
  timeout: 20000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/rss+xml, application/xml, text/xml, */*',
    'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
  },
  requestOptions: {
    rejectUnauthorized: false,
  },
});

export interface RawArticle {
  title: string;
  link: string;
  content: string;
  pubDate: string;
  source: string;
  sourceLanguage: 'en' | 'zh';
  category: string;
}

async function fetchOneSource(source: RssSource): Promise<RawArticle[]> {
  // Auto-skip persistently failing sources (3+ consecutive errors)
  if (shouldSkipSource(source.name)) {
    console.error(`⏭️  Skipped ${source.name}: persistent failures (3+ consecutive errors)`);
    return [];
  }

  const startTime = Date.now();
  try {
    const feed = await parser.parseURL(source.url);
    const latency = Date.now() - startTime;
    const items = feed.items || [];
    const articles = items.slice(0, 10).map(item => ({
      title: (item.title || '').trim(),
      link: item.link || '',
      content: (item.contentSnippet || item.content || item.summary || '').trim(),
      pubDate: item.pubDate || item.isoDate || new Date().toISOString(),
      source: source.name,
      sourceLanguage: source.language,
      category: source.category,
    })).filter(a => a.title && a.link);

    recordSourceSuccess(source.name, source.url, latency, articles.length);
    return articles;
  } catch (err) {
    const latency = Date.now() - startTime;
    recordSourceError(source.name, source.url, err instanceof Error ? err.message : String(err), latency);
    console.error(`❌ Failed to fetch ${source.name}:`, err instanceof Error ? err.message : String(err));
    return [];
  }
}

export async function fetchAllRss(): Promise<RawArticle[]> {
  const results = await Promise.all(RSS_SOURCES.map(fetchOneSource));
  const all = results.flat();
  // Sort by date descending
  all.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
  return all;
}
