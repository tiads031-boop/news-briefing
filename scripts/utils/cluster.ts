import type { RawArticle } from '../fetcher/rss-fetcher';

const EN_STOPWORDS = new Set([
  'the','and','for','are','but','not','you','all','can','had','her','was','one','our','out',
  'day','get','has','him','his','how','its','may','new','now','old','see','two','who',
  'did','she','use','way','many','oil','sit','set','run','eat','far','sea','eye','ago',
  'off','too','any','say','man','try','ask','end','why','let','put','come','here','just',
  'like','long','make','over','such','take','than','them','well','were','with','from',
  'they','know','want','been','good','much','some','time','very','when','come','here',
  'back','after','first','also','its','most','other','even','only','work','life','without',
  'being','have','said','each','which','their','said','there','could','would','should',
  'this','that','these','those','what','where','will','more','about','into','through',
  'during','before','after','above','below','between','among','within','across','around',
]);

const ZH_STOPWORDS = new Set([
  '的','了','在','是','我','有','和','就','不','人','都','一','上','也','很','到','说',
  '要','去','你','会','着','看','好','这','那','为','之','与','及','等','或','但','而',
  '因','于','则','即','若','虽','故','乃','既','且','所','被','把','给','让','向','往',
  '从','自','由','以','至','致','并','将','已','又','还','最','更','太','非常','已经',
  '开始','进行','表示','认为','成为','发展','包括','根据','通过','由于','关于','需要',
]);

function extractKeywords(title: string, lang: 'en' | 'zh'): Set<string> {
  if (lang === 'en') {
    const words = title
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3 && !EN_STOPWORDS.has(w));
    return new Set(words);
  }
  // Chinese: extract continuous CJK characters of length >= 2
  const matches = title.match(/[\u4e00-\u9fa5]{2,}/g) || [];
  return new Set(matches.filter(w => !ZH_STOPWORDS.has(w) && w.length >= 2));
}

// Keywords from article content (first 500 chars) — used as fallback
// when title similarity is below the threshold but articles may still
// be about the same topic (e.g. two Iran stories with different headlines).
function extractContentKeywords(article: RawArticle): Set<string> {
  if (!article.content || article.content.length < 10) return new Set();
  const snippet = article.content.slice(0, 500);
  // Use same extraction logic as title
  if (article.sourceLanguage === 'en') {
    const words = snippet
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3 && !EN_STOPWORDS.has(w));
    return new Set(words);
  }
  const matches = snippet.match(/[\u4e00-\u9fa5]{2,}/g) || [];
  return new Set(matches.filter(w => !ZH_STOPWORDS.has(w) && w.length >= 2));
}

function contentJaccard(a: RawArticle, b: RawArticle): number {
  const kwA = extractContentKeywords(a);
  const kwB = extractContentKeywords(b);
  if (kwA.size === 0 || kwB.size === 0) return 0;
  const intersection = [...kwA].filter(k => kwB.has(k));
  const union = new Set([...kwA, ...kwB]);
  return intersection.length / union.size;
}

function similarity(a: RawArticle, b: RawArticle): number {
  if (a.sourceLanguage !== b.sourceLanguage) return 0;

  // Exact match or containment
  const ta = a.title.toLowerCase();
  const tb = b.title.toLowerCase();
  if (ta === tb) return 1;
  if (ta.includes(tb) || tb.includes(ta)) return 0.8;

  const kwA = extractKeywords(a.title, a.sourceLanguage);
  const kwB = extractKeywords(b.title, b.sourceLanguage);
  if (kwA.size === 0 || kwB.size === 0) return 0;

  const intersection = [...kwA].filter(k => kwB.has(k));
  const union = new Set([...kwA, ...kwB]);
  const titleSim = intersection.length / union.size;

  // Content fallback: if title similarity is below threshold but > 0.1,
  // try content-level Jaccard as a tiebreaker. This catches articles
  // about the same country/topic that use different headline vocabulary
  // (e.g. "Iran restores internet" vs "U.S. strikes Iran").
  if (titleSim < 0.25 && titleSim >= 0.1) {
    const contentSim = contentJaccard(a, b);
    if (contentSim >= 0.2) {
      // Blend: 40% title + 60% content (content is more reliable for topic matching)
      return titleSim * 0.4 + contentSim * 0.6;
    }
  }

  return titleSim;
}

/**
 * Cluster quality score (0–10). Used to prioritize clusters for AI analysis
 * and filter out ones that would produce empty or low-value stories.
 *
 * Scoring dimensions:
 *   - Article count (0–4 pts): 1→0, 2→2, 3+→4
 *   - Source diversity (0–3 pts): unique sources / total articles ratio
 *   - Content richness (0–3 pts): average content length > 200→3, > 100→1.5, else 0
 */
export function clusterQuality(cluster: RawArticle[]): number {
  // Article count
  const countScore = cluster.length >= 4 ? 4 : cluster.length >= 3 ? 3 : cluster.length >= 2 ? 2 : 0;

  // Source diversity
  const uniqueSources = new Set(cluster.map(a => a.source)).size;
  const diversityScore = cluster.length > 0 ? Math.min(3, (uniqueSources / cluster.length) * 3) : 0;

  // Content richness
  const avgContentLen = cluster.reduce((sum, a) => sum + (a.content?.length ?? 0), 0) / cluster.length;
  const richnessScore = avgContentLen > 200 ? 3 : avgContentLen > 100 ? 1.5 : 0;

  return Math.round((countScore + diversityScore + richnessScore) * 10) / 10;
}

/**
 * Check if the cluster topic is likely high-value for the briefing.
 * Low-value: single-source articles about routine product updates,
 * minor version releases, or feed noise without geopolitical/market angle.
 */
export function isHighValueTopic(cluster: RawArticle[]): boolean {
  const allTitles = cluster.map(a => a.title.toLowerCase()).join(' ');
  const highValuePatterns = [
    /(?:sanction|war|conflict|strike|military|ceasefire|nuclear|diplomacy)/i,
    /(?:stock|market|index|nasdaq|s\&p|dow|shanghai|hang\s*seng|nikkei|rall(?:y|ies)|plung|crash|surge)/i,
    /(?:trade|tariff|export|import|supply.chain|shortage)/i,
    /(?:fed|federal reserve|central bank|interest rate|inflation|cpi|gdp|recession)/i,
    /(?:oil|crude|brent|gold|bitcoin|btc|crypto|commodity)/i,
    /(?:ipo|merger|acquisition|takeover|bid|bankruptcy|layoff|restructur)/i,
    /(?:regulation|crackdown|ban|restrict|fine|penalty|antitrust|lawsuit)/i,
    /(?:sanction|制裁|战争|军事|停火|核|外交|冲突)/i,
    /(?:贸易|关税|出口|进口|供应链|短缺)/i,
    /(?:股市|指数|暴跌|暴涨|下跌|上涨|投资者)/i,
    /(?:央行|利率|通胀|CPI|GDP|衰退)/i,
    /(?:收购|并购|上市|IPO|破产|裁员|重组)/i,
    /(?:监管|禁令|限制|罚款|反垄断|诉讼)/i,
  ];
  return highValuePatterns.some(p => p.test(allTitles));
}

// Filter and sort clusters: remove low-quality single-article noise,
// then order by quality score (high first), tie-breaking by size.
export function filterAndSortClusters(
  clusters: RawArticle[][],
  minQuality = 1.5
): RawArticle[][] {
  const filtered = clusters.filter(c => {
    // Single-article cluster with low quality → likely noise
    if (c.length === 1) {
      const q = clusterQuality(c);
      if (q < minQuality) return false;
      // Also reject single-article clusters that are clearly low-value
      if (!isHighValueTopic(c)) return false;
    }
    return true;
  });

  filtered.sort((a, b) => {
    const qa = clusterQuality(a);
    const qb = clusterQuality(b);
    // Primary: quality score
    if (qb !== qa) return qb - qa;
    // Secondary: cluster size
    return b.length - a.length;
  });

  return filtered;
}

export function clusterArticles(articles: RawArticle[], threshold = 0.25): RawArticle[][] {
  const clusters: RawArticle[][] = [];

  for (const article of articles) {
    let bestCluster = -1;
    let bestSim = 0;

    for (let i = 0; i < clusters.length; i++) {
      const rep = clusters[i][0];
      const sim = similarity(article, rep);
      if (sim > bestSim) {
        bestSim = sim;
        bestCluster = i;
      }
    }

    if (bestSim >= threshold) {
      clusters[bestCluster].push(article);
    } else {
      clusters.push([article]);
    }
  }

  // Sort clusters: bigger clusters first, then by recency
  clusters.sort((a, b) => {
    if (b.length !== a.length) return b.length - a.length;
    return new Date(b[0].pubDate).getTime() - new Date(a[0].pubDate).getTime();
  });

  return clusters;
}
