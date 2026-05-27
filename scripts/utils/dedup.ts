import { readdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { RawArticle } from '../fetcher/rss-fetcher';
import { warn } from './logger';

const ARCHIVE_DIR = join('public', 'archive');
const LOOKBACK_DAYS = 7;
const TITLE_SIM_THRESHOLD = 0.6;

// Inline minimal copy of cluster.ts keyword extraction so we avoid coupling.
const EN_STOPWORDS = new Set([
  'the','and','for','are','but','not','you','all','can','had','her','was','one','our','out',
  'day','get','has','him','his','how','its','may','new','now','old','see','two','who',
  'did','she','use','way','many','off','too','any','say','man','try','ask','end','why','let',
  'put','come','here','just','like','long','make','over','such','take','than','them','well',
  'were','with','from','they','know','want','been','good','much','some','time','very','when',
  'back','after','first','also','most','other','even','only','work','life','being','have',
  'said','each','which','their','there','could','would','should','this','that','these','those',
  'what','where','will','more','about','into','through','during','before','above','below',
  'between','among','within','across','around',
]);

const ZH_STOPWORDS = new Set([
  '的','了','在','是','我','有','和','就','不','人','都','一','上','也','很','到','说',
  '要','去','你','会','着','看','好','这','那','为','之','与','及','等','或','但','而',
  '因','于','则','即','若','虽','故','乃','既','且','所','被','把','给','让','向','往',
  '从','自','由','以','至','致','并','将','已','又','还','最','更','太','非常','已经',
]);

export function tokens(title: string, lang: 'en' | 'zh'): Set<string> {
  if (lang === 'en') {
    return new Set(
      title
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 3 && !EN_STOPWORDS.has(w))
    );
  }
  const cjk = title.match(/[一-龥]{2,}/g) || [];
  return new Set(cjk.filter(w => !ZH_STOPWORDS.has(w)));
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

interface HistoricalSignature {
  url: string;
  title: string;
  lang: 'en' | 'zh';
  tokens: Set<string>;
  date: string;
}

function listArchiveDates(): string[] {
  if (!existsSync(ARCHIVE_DIR)) return [];
  return readdirSync(ARCHIVE_DIR)
    .filter(f => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .map(f => f.replace('.json', ''))
    .sort()
    .reverse()
    .slice(0, LOOKBACK_DAYS);
}

function loadHistorical(): HistoricalSignature[] {
  const dates = listArchiveDates();
  const sigs: HistoricalSignature[] = [];

  for (const date of dates) {
    const file = join(ARCHIVE_DIR, `${date}.json`);
    try {
      const raw = JSON.parse(readFileSync(file, 'utf-8'));
      const stories = Array.isArray(raw.stories) ? raw.stories : [];
      for (const story of stories) {
        const sources = Array.isArray(story.sources) ? story.sources : [];
        for (const src of sources) {
          if (!src || typeof src !== 'object') continue;
          const url = typeof src.url === 'string' ? src.url : '';
          const title = typeof src.takeEn === 'string'
            ? src.takeEn
            : typeof src.takeZh === 'string'
              ? src.takeZh
              : typeof src.take === 'string'
                ? src.take
                : '';
          const lang: 'en' | 'zh' = src.language === 'zh' ? 'zh' : 'en';
          if (!url && !title) continue;
          sigs.push({
            url,
            title,
            lang,
            tokens: title ? tokens(title, lang) : new Set(),
            date,
          });
        }
        // Also fingerprint by headline so cluster-level reruns are caught
        const headlineEn = typeof story.headlineEn === 'string' ? story.headlineEn : '';
        const headlineZh = typeof story.headlineZh === 'string' ? story.headlineZh : '';
        if (headlineEn) {
          sigs.push({ url: '', title: headlineEn, lang: 'en', tokens: tokens(headlineEn, 'en'), date });
        }
        if (headlineZh) {
          sigs.push({ url: '', title: headlineZh, lang: 'zh', tokens: tokens(headlineZh, 'zh'), date });
        }
      }
    } catch (e) {
      warn(`Dedup: skipped malformed archive ${date}: ${(e as Error).message}`);
    }
  }
  return sigs;
}

export interface DedupStats {
  totalIn: number;
  totalOut: number;
  removed: number;
  byUrl: number;
  byTitle: number;
  archiveDays: number;
}

export interface DedupResult {
  articles: RawArticle[];
  stats: DedupStats;
}

export function dedupAgainstArchive(articles: RawArticle[]): DedupResult {
  const dates = listArchiveDates();
  if (dates.length === 0) {
    return {
      articles,
      stats: { totalIn: articles.length, totalOut: articles.length, removed: 0, byUrl: 0, byTitle: 0, archiveDays: 0 },
    };
  }

  const historical = loadHistorical();
  const seenUrls = new Set(historical.map(h => h.url).filter(u => u));

  let byUrl = 0;
  let byTitle = 0;

  const filtered = articles.filter(article => {
    if (article.link && seenUrls.has(article.link)) {
      byUrl++;
      return false;
    }
    const tk = tokens(article.title, article.sourceLanguage);
    if (tk.size === 0) return true;
    for (const sig of historical) {
      if (sig.lang !== article.sourceLanguage) continue;
      if (sig.tokens.size === 0) continue;
      if (jaccard(tk, sig.tokens) >= TITLE_SIM_THRESHOLD) {
        byTitle++;
        return false;
      }
    }
    return true;
  });

  return {
    articles: filtered,
    stats: {
      totalIn: articles.length,
      totalOut: filtered.length,
      removed: articles.length - filtered.length,
      byUrl,
      byTitle,
      archiveDays: dates.length,
    },
  };
}
