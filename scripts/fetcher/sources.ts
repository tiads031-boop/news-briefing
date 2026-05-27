export interface RssSource {
  name: string;
  url: string;
  category: 'finance' | 'economy' | 'technology';
  language: 'en' | 'zh';
  priority: number; // lower = higher priority
}

export const RSS_SOURCES: RssSource[] = [
  // ============================================================
  // English - Technology
  // ============================================================
  {
    name: 'TechCrunch',
    url: 'https://techcrunch.com/feed/',
    category: 'technology',
    language: 'en',
    priority: 1,
  },
  {
    name: 'The Verge',
    url: 'https://www.theverge.com/rss/index.xml',
    category: 'technology',
    language: 'en',
    priority: 1,
  },
  {
    name: 'Ars Technica',
    url: 'https://arstechnica.com/feed/',
    category: 'technology',
    language: 'en',
    priority: 2,
  },
  {
    name: 'Wired',
    url: 'https://www.wired.com/feed/rss',
    category: 'technology',
    language: 'en',
    priority: 1,
  },
  {
    name: 'Engadget',
    url: 'https://www.engadget.com/rss.xml',
    category: 'technology',
    language: 'en',
    priority: 2,
  },
  {
    name: 'MIT Technology Review',
    url: 'https://www.technologyreview.com/feed/',
    category: 'technology',
    language: 'en',
    priority: 1,
  },
  {
    name: 'Hacker News',
    url: 'https://news.ycombinator.com/rss',
    category: 'technology',
    language: 'en',
    priority: 1,
  },
  {
    name: 'IEEE Spectrum',
    url: 'https://spectrum.ieee.org/feeds/feed.rss',
    category: 'technology',
    language: 'en',
    priority: 2,
  },
  {
    name: 'BBC Technology',
    url: 'http://feeds.bbci.co.uk/news/technology/rss.xml',
    category: 'technology',
    language: 'en',
    priority: 1,
  },
  // Karen/GlobalPulse-style section feeds: technology should include both primary
  // reporting and agenda-setting aggregators, not only general tech blogs.
  {
    name: 'Bloomberg Technology',
    url: 'https://feeds.bloomberg.com/technology/news.rss',
    category: 'technology',
    language: 'en',
    priority: 1,
  },
  {
    name: 'New York Times — Technology',
    url: 'https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml',
    category: 'technology',
    language: 'en',
    priority: 1,
  },
  {
    name: 'Techmeme',
    url: 'https://www.techmeme.com/feed.xml',
    category: 'technology',
    language: 'en',
    priority: 1,
  },

  // ============================================================
  // English - Finance / Markets
  // ============================================================
  {
    name: 'CNBC Top News',
    url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html',
    category: 'finance',
    language: 'en',
    priority: 1,
  },
  {
    name: 'MarketWatch',
    url: 'https://feeds.content.dowjones.io/public/rss/mw_topstories',
    category: 'finance',
    language: 'en',
    priority: 1,
  },
  {
    name: 'Yahoo Finance',
    url: 'https://finance.yahoo.com/news/rssindex',
    category: 'finance',
    language: 'en',
    priority: 2,
  },
  {
    name: 'Business Insider',
    url: 'https://www.businessinsider.com/rss',
    category: 'finance',
    language: 'en',
    priority: 2,
  },
  {
    name: 'Bloomberg Markets',
    url: 'https://feeds.bloomberg.com/markets/news.rss',
    category: 'finance',
    language: 'en',
    priority: 1,
  },

  // ============================================================
  // English - Economy / General
  // ============================================================
  {
    name: 'BBC Business',
    url: 'http://feeds.bbci.co.uk/news/business/rss.xml',
    category: 'economy',
    language: 'en',
    priority: 1,
  },
  {
    name: 'BBC World',
    url: 'http://feeds.bbci.co.uk/news/world/rss.xml',
    category: 'economy',
    language: 'en',
    priority: 1,
  },
  {
    name: 'NPR Business',
    url: 'https://feeds.npr.org/1006/rss.xml',
    category: 'economy',
    language: 'en',
    priority: 2,
  },
  {
    name: 'The Guardian World',
    url: 'https://www.theguardian.com/world/rss',
    category: 'economy',
    language: 'en',
    priority: 2,
  },
  // Karen/GlobalPulse-style geopolitics coverage: more regional lenses and
  // section-level world feeds reduce Anglo-US single-axis bias.
  {
    name: 'Financial Times — World',
    url: 'https://www.ft.com/world?format=rss',
    category: 'economy',
    language: 'en',
    priority: 1,
  },
  {
    name: 'New York Times — World',
    url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml',
    category: 'economy',
    language: 'en',
    priority: 1,
  },
  {
    name: 'Washington Post — World',
    url: 'https://feeds.washingtonpost.com/rss/world',
    category: 'economy',
    language: 'en',
    priority: 2,
  },
  {
    name: 'Al Jazeera English',
    url: 'https://www.aljazeera.com/xml/rss/all.xml',
    category: 'economy',
    language: 'en',
    priority: 1,
  },
  {
    name: 'South China Morning Post — World',
    url: 'https://news.google.com/rss/search?q=when:24h+site:scmp.com/news/world&hl=en-US&gl=US&ceid=US:en',
    category: 'economy',
    language: 'en',
    priority: 2,
  },
  {
    name: 'South China Morning Post — China',
    url: 'https://news.google.com/rss/search?q=when:24h+site:scmp.com/news/china&hl=en-US&gl=US&ceid=US:en',
    category: 'economy',
    language: 'en',
    priority: 2,
  },
  {
    name: 'Le Monde in English',
    url: 'https://www.lemonde.fr/en/rss/une.xml',
    category: 'economy',
    language: 'en',
    priority: 2,
  },
  {
    name: 'Axios',
    url: 'https://www.axios.com/feeds/feed.rss',
    category: 'economy',
    language: 'en',
    priority: 3,
  },
  {
    name: 'Reuters via Google News',
    url: 'https://news.google.com/rss/search?q=when:24h+site:reuters.com&hl=en-US&gl=US&ceid=US:en',
    category: 'economy',
    language: 'en',
    priority: 2,
  },

  // ============================================================
  // Chinese - Technology
  // ============================================================
  {
    name: 'Solidot',
    url: 'https://www.solidot.org/index.rss',
    category: 'technology',
    language: 'zh',
    priority: 2,
  },
  {
    name: '36氪',
    url: 'https://36kr.com/feed',
    category: 'technology',
    language: 'zh',
    priority: 2,
  },
  {
    name: '少数派',
    url: 'https://sspai.com/feed',
    category: 'technology',
    language: 'zh',
    priority: 1,
  },
  {
    name: 'IT之家',
    url: 'https://www.ithome.com/rss/',
    category: 'technology',
    language: 'zh',
    priority: 1,
  },
  {
    name: '爱范儿',
    url: 'https://www.ifanr.com/feed',
    category: 'technology',
    language: 'zh',
    priority: 2,
  },
  {
    name: '机器之心',
    url: 'https://news.google.com/rss/search?q=site:jiqizhixin.com/articles&hl=zh-CN&gl=CN&ceid=CN:zh-Hans',
    category: 'technology',
    language: 'zh',
    priority: 2,
  },

  // ============================================================
  // Chinese - Finance
  // ============================================================
  {
    name: '华尔街见闻',
    url: 'https://news.google.com/rss/search?q=when:24h+site:wallstreetcn.com&hl=zh-CN&gl=CN&ceid=CN:zh-Hans',
    category: 'finance',
    language: 'zh',
    priority: 1,
  },
  {
    name: '界面新闻',
    url: 'https://news.google.com/rss/search?q=when:24h+site:jiemian.com/article&hl=zh-CN&gl=CN&ceid=CN:zh-Hans',
    category: 'finance',
    language: 'zh',
    priority: 2,
  },

  // ============================================================
  // Chinese - Economy / General
  // ============================================================
  {
    name: '澎湃新闻',
    url: 'https://news.google.com/rss/search?q=when:24h+site:thepaper.cn&hl=zh-CN&gl=CN&ceid=CN:zh-Hans',
    category: 'economy',
    language: 'zh',
    priority: 2,
  },
  {
    name: '联合早报',
    url: 'https://news.google.com/rss/search?q=when:24h+site:zaobao.com.sg&hl=zh-CN&gl=SG&ceid=SG:zh-Hans',
    category: 'economy',
    language: 'zh',
    priority: 2,
  },
];
