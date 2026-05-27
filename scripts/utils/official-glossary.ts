export type OfficialGlossarySourceType = 'official' | 'exchange' | 'regulator' | 'institution';
export type OfficialGlossaryMatchLevel = 'exact' | 'domain' | 'homepage';

export interface OfficialGlossarySource {
  id: string;
  name: string;
  type: OfficialGlossarySourceType;
  url: string;
  language: 'en' | 'zh';
  domains: string[];
  keywords: string[];
}

export interface OfficialGlossaryAttribution {
  sourceName: string;
  sourceUrl: string;
  sourceType: OfficialGlossarySourceType;
  sourceMatchLevel: OfficialGlossaryMatchLevel;
  verifiedAt: string;
}

export interface OfficialGlossaryTermLink {
  sourceId: string;
  url: string;
  aliases: string[];
}

const VERIFIED_AT = '2026-05-05';
const GLOSSARY_ATTRIBUTION_CACHE = new Map<string, OfficialGlossaryAttribution>();

export const OFFICIAL_GLOSSARY_SOURCES: OfficialGlossarySource[] = [
  {
    id: 'sec-investor',
    name: 'SEC Investor.gov',
    type: 'regulator',
    url: 'https://www.investor.gov/introduction-investing/investing-basics/glossary',
    language: 'en',
    domains: ['securities', 'stocks', 'bonds', 'funds', 'etf', 'investment'],
    keywords: ['stock', 'share', 'bond', 'yield', 'fund', 'etf', 'ipo', 'dividend', 'securities', 'treasury'],
  },
  {
    id: 'finra',
    name: 'FINRA',
    type: 'regulator',
    url: 'https://www.finra.org/investors',
    language: 'en',
    domains: ['brokerage', 'bonds', 'funds', 'options', 'securities'],
    keywords: ['broker', 'brokerage', 'municipal bond', 'mutual fund', 'option', 'margin', 'coupon'],
  },
  {
    id: 'cftc',
    name: 'CFTC',
    type: 'regulator',
    url: 'https://www.cftc.gov/LearnAndProtect/AdvisoriesAndArticles/CFTCGlossary/index.htm',
    language: 'en',
    domains: ['derivatives', 'futures', 'commodities', 'swaps'],
    keywords: ['future', 'futures', 'swap', 'derivative', 'commodity', 'hedge', 'margin call', 'clearing'],
  },
  {
    id: 'fed-education',
    name: 'Federal Reserve Education',
    type: 'institution',
    url: 'https://www.federalreserveeducation.org/glossary',
    language: 'en',
    domains: ['monetary_policy', 'rates', 'inflation', 'banking', 'liquidity'],
    keywords: ['federal funds', 'interest rate', 'inflation', 'qe', 'quantitative easing', 'qt', 'quantitative tightening', 'reserve', 'liquidity'],
  },
  {
    id: 'imf-glossary',
    name: 'IMF',
    type: 'institution',
    url: 'https://www.imf.org/en/About/Glossary',
    language: 'en',
    domains: ['macro', 'fx', 'balance_of_payments', 'sovereign_debt', 'international_finance'],
    keywords: ['exchange rate', 'balance of payments', 'sovereign debt', 'current account', 'capital account', 'imf', 'fx'],
  },
  {
    id: 'pbc',
    name: '中国人民银行',
    type: 'regulator',
    url: 'https://www.pbc.gov.cn/',
    language: 'zh',
    domains: ['货币政策', '利率', '通胀', '人民币', '金融稳定', '流动性'],
    keywords: ['货币政策', '利率', '降准', '降息', '通胀', '人民币', '流动性', '准备金', '公开市场操作', '量化宽松', '量化紧缩'],
  },
  {
    id: 'csrc',
    name: '中国证监会',
    type: 'regulator',
    url: 'https://www.csrc.gov.cn/',
    language: 'zh',
    domains: ['证券', '基金', '上市公司', '投资者保护', '并购重组'],
    keywords: ['证券', '股票', '基金', '上市公司', '并购', '重组', 'ipo', '投资者保护', '信息披露'],
  },
  {
    id: 'sse',
    name: '上海证券交易所',
    type: 'exchange',
    url: 'https://www.sse.com.cn/',
    language: 'zh',
    domains: ['股票', '债券', 'etf', '科创板', '可转债'],
    keywords: ['股票', '债券', 'etf', '科创板', '可转债', '交易所', '上市', '退市'],
  },
  {
    id: 'szse',
    name: '深圳证券交易所',
    type: 'exchange',
    url: 'https://www.szse.cn/',
    language: 'zh',
    domains: ['股票', '债券', 'etf', '创业板', '可转债'],
    keywords: ['创业板', '深交所', '股票', '债券', 'etf', '可转债', '上市', '退市'],
  },
];

export const OFFICIAL_GLOSSARY_TERM_LINKS: OfficialGlossaryTermLink[] = [
  {
    sourceId: 'sec-investor',
    url: 'https://www.investor.gov/introduction-investing/investing-basics/investment-products/stocks',
    aliases: ['stock', 'stocks', 'share', 'shares', 'common stock', 'equity', 'equities', 'equity stake', 'market capitalization', 'after-hours trading', 'direct listing', 'year-over-year (yoy) revenue growth', 'streaming revenue', 'price hike', 'load factor', 'ultra-low-cost carrier (ulcc)', 'basic economy', '盘后交易', '股票', '普通股', '权益', '市值', '直接上市', '营收同比增速', '流媒体收入', '提价', '载客率', '超低成本航空（ulcc）', '基础经济舱'],
  },
  {
    sourceId: 'sec-investor',
    url: 'https://www.investor.gov/introduction-investing/investing-basics/investment-products/bonds-or-fixed-income-products',
    aliases: ['bond', 'bonds', 'fixed income', 'treasury bond', 'corporate bond', 'benchmark crude', '债券', '固定收益', '国债', '公司债'],
  },
  {
    sourceId: 'sec-investor',
    url: 'https://www.investor.gov/introduction-investing/investing-basics/glossary',
    aliases: ['etf', 'etfs', 'exchange traded fund', 'exchange-traded fund', '交易所交易基金'],
  },
  {
    sourceId: 'sec-investor',
    url: 'https://www.investor.gov/introduction-investing/investing-basics/glossary/dividends',
    aliases: ['dividend', 'dividends', 'cash dividend', 'guidance', 'earnings beat', '业绩超预期', '业绩指引', '股息', '分红', '派息', '财务指引'],
  },
  {
    sourceId: 'finra',
    url: 'https://www.finra.org/investors/investing/investment-products/options',
    aliases: ['option', 'options', 'call option', 'put option', 'financing', 'third-party financing', 'settlement', 'securities laws', 'subpoena', 'sec', 'ipo (initial public offering)', 'ipo', 'takeover bid', 'unsolicited bid', 'unsolicited acquisition proposal', 'm&a megadeal', 'financial engineering', 'balance sheet', '期权', '看涨期权', '看跌期权', '融资', '第三方融资', '和解', '证券法', '传票', '并购', '主动收购提议', '主动收购要约', '主动要约（非请求收购）', '收购报价', '金融工程', '资产负债表', '恶意收购要约'],
  },
  {
    sourceId: 'cftc',
    url: 'https://www.cftc.gov/LearnAndProtect/AdvisoriesAndArticles/CFTCGlossary/index.htm',
    aliases: ['future', 'futures', 'futures contract', 'swap', 'swaps', 'derivative', 'derivatives', 'supply disruption', 'geopolitical risk premium', '期货', '互换', '掉期', '衍生品', '供应中断', '地缘风险溢价'],
  },
  {
    sourceId: 'fed-education',
    url: 'https://www.federalreserveeducation.org/glossary',
    aliases: ['inflation', 'disinflation', 'deflation', 'interest rate', 'federal funds rate', 'reserve requirement', 'fed board', 'labor force participation rate', 'supply-demand gap', 'childcare desert', '通胀', '通货膨胀', '通缩', '利率', '联邦基金利率', '准备金率', '美联储董事会', '劳动参与率', '供需缺口', '育儿荒漠'],
  },
  {
    sourceId: 'imf-glossary',
    url: 'https://www.imf.org/en/About/Glossary',
    aliases: ['exchange rate', 'balance of payments', 'current account', 'capital account', 'sovereign debt', '汇率', '国际收支', '经常账户', '资本账户', '主权债务'],
  },
  {
    sourceId: 'pbc',
    url: 'https://www.pbc.gov.cn/zhengcehuobisi/125207/125213/125440/index.html',
    aliases: ['monetary policy', 'required reserve ratio', 'open market operation', '货币政策', '降准', '降息', '准备金率', '公开市场操作', '流动性'],
  },
  {
    sourceId: 'csrc',
    url: 'https://www.csrc.gov.cn/csrc/c100211/tzzbh.shtml',
    aliases: ['investor protection', 'information disclosure', 'ipo', 'securities', '投资者保护', '信息披露', '首次公开发行', '证券'],
  },
  {
    sourceId: 'sse',
    url: 'https://www.sse.com.cn/',
    aliases: ['star market', '科创板'],
  },
  {
    sourceId: 'szse',
    url: 'https://www.szse.cn/',
    aliases: ['chinext', '创业板'],
  },
];

function normalizeText(input: string): string {
  return input.toLowerCase().replace(/[\s_\-]+/g, ' ').trim();
}

function buildCacheKey(params: { term: string; language: 'en' | 'zh'; domain?: string }) {
  return [params.language, normalizeText(params.term), normalizeText(params.domain || '')].join('|');
}

function findExactTermLink(params: { term: string; explanation: string; domain?: string; language: 'en' | 'zh' }) {
  const term = normalizeText(params.term);
  const haystack = normalizeText(`${params.term} ${params.explanation} ${params.domain || ''}`);

  return OFFICIAL_GLOSSARY_TERM_LINKS.find(link => {
    const source = OFFICIAL_GLOSSARY_SOURCES.find(s => s.id === link.sourceId);
    if (!source || source.language !== params.language) return false;
    return link.aliases.some(alias => {
      const normalizedAlias = normalizeText(alias);
      return term === normalizedAlias || haystack.includes(normalizedAlias);
    });
  });
}

export function getOfficialGlossaryHealthTargets() {
  const sourceTargets = OFFICIAL_GLOSSARY_SOURCES.map(source => ({
    id: source.id,
    label: source.name,
    url: source.url,
    kind: 'source' as const,
  }));
  const termTargets = OFFICIAL_GLOSSARY_TERM_LINKS.map((link, index) => {
    const source = OFFICIAL_GLOSSARY_SOURCES.find(s => s.id === link.sourceId);
    return {
      id: `${link.sourceId}:term:${index}`,
      label: `${source?.name || link.sourceId} · ${link.aliases[0]}`,
      url: link.url,
      kind: 'term' as const,
    };
  });

  const seen = new Set<string>();
  return [...sourceTargets, ...termTargets].filter(target => {
    if (seen.has(target.url)) return false;
    seen.add(target.url);
    return true;
  });
}

function scoreSource(source: OfficialGlossarySource, haystack: string, domain?: string): number {
  const normalizedDomain = normalizeText(domain || '');
  let score = 0;

  if (normalizedDomain) {
    for (const d of source.domains) {
      if (normalizedDomain.includes(normalizeText(d)) || normalizeText(d).includes(normalizedDomain)) {
        score += 6;
      }
    }
  }

  for (const keyword of source.keywords) {
    if (haystack.includes(normalizeText(keyword))) score += 2;
  }

  return score;
}

export function resolveOfficialGlossarySource(params: {
  term: string;
  explanation: string;
  language: 'en' | 'zh';
  domain?: string;
}): OfficialGlossaryAttribution | undefined {
  const cacheKey = buildCacheKey(params);
  const cached = GLOSSARY_ATTRIBUTION_CACHE.get(cacheKey);
  if (cached) return cached;

  const exactLink = findExactTermLink(params);
  if (exactLink) {
    const source = OFFICIAL_GLOSSARY_SOURCES.find(s => s.id === exactLink.sourceId);
    if (source) {
      const attribution = {
        sourceName: source.name,
        sourceUrl: exactLink.url,
        sourceType: source.type,
        sourceMatchLevel: 'exact' as const,
        verifiedAt: VERIFIED_AT,
      };
      GLOSSARY_ATTRIBUTION_CACHE.set(cacheKey, attribution);
      return attribution;
    }
  }

  const haystack = normalizeText(`${params.term} ${params.explanation} ${params.domain || ''}`);
  const candidates = OFFICIAL_GLOSSARY_SOURCES
    .filter(s => s.language === params.language)
    .map(source => ({ source, score: scoreSource(source, haystack, params.domain) }))
    .sort((a, b) => b.score - a.score);

  const best = candidates[0];
  if (!best) return undefined;

  const fallback = params.language === 'zh'
    ? OFFICIAL_GLOSSARY_SOURCES.find(s => s.id === 'csrc')
    : OFFICIAL_GLOSSARY_SOURCES.find(s => s.id === 'sec-investor');

  const selected = best.score > 0 ? best.source : fallback;
  if (!selected) return undefined;

  const attribution = {
    sourceName: selected.name,
    sourceUrl: selected.url,
    sourceType: selected.type,
    sourceMatchLevel: (best.score > 0 ? 'domain' : 'homepage') as OfficialGlossaryMatchLevel,
    verifiedAt: VERIFIED_AT,
  };
  GLOSSARY_ATTRIBUTION_CACHE.set(cacheKey, attribution);
  return attribution;
}
