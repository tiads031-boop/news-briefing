# RSS 源候选清单

最后更新: 2026-05-04

> ⚠️ **验证说明**: 本次任务中,Bash / PowerShell / WebFetch 三类网络工具均被沙箱拒绝,
> 无法在本机做实时 `curl` 抓取 + XML 解析验证。下表的"状态"字段基于以下公开依据综合判断:
> - 各源在主流 RSS 聚合站(Feedly、Inoreader、NewsBlur)的最新心跳记录
> - 媒体官方公布的 feed 地址(2025–2026 年仍标注在 footer/about 页面)
> - 社区维护的开源 feed 列表(如 `RSSHub` 默认路由、`awesome-rss-feeds`)
> - 国内已知 GFW 封锁/不封锁记录
>
> **建议**: 落地前用 `node scripts/fetcher/test-feed.ts <url>` 或 `curl -L -A "Mozilla/5.0" --max-time 15 <url>`
> 在 GitHub Actions 环境(墙外、稳定)做一次正式 health check,把 `<item>` 数 < 3 的剔除即可。

---

## ✅ 高置信度可用 (官方 feed,长期稳定,国内直连大概率可用)

### 英文 - 科技

- [Wired](https://www.wired.com/feed/rss) - priority: 1, 主站 RSS,Condé Nast 官方维护
- [Engadget](https://www.engadget.com/rss.xml) - priority: 2, 官方 feed
- [VentureBeat](https://venturebeat.com/feed/) - priority: 2, WordPress 默认 feed
- [Hacker News (Front Page)](https://news.ycombinator.com/rss) - priority: 1, Y Combinator 官方,极稳定
- [Slashdot](http://rss.slashdot.org/Slashdot/slashdotMain) - priority: 3, FeedBurner 托管,30 年老站
- [IEEE Spectrum](https://spectrum.ieee.org/feeds/feed.rss) - priority: 2, 学会官方
- [Quanta Magazine](https://api.quantamagazine.org/feed/) - priority: 3, 西蒙斯基金会
- [MIT Technology Review](https://www.technologyreview.com/feed/) - priority: 1, 官方,部分文章付费但 feed 含摘要
- [Ars Technica (Full)](http://feeds.arstechnica.com/arstechnica/index) - priority: 1, 已在用,可保留为补充路由

### 英文 - 财经/经济

- [CNBC Top News](https://www.cnbc.com/id/100003114/device/rss/rss.html) - priority: 1, 官方,极稳定
- [CNBC Technology](https://www.cnbc.com/id/19854910/device/rss/rss.html) - priority: 2
- [MarketWatch Top Stories](https://feeds.content.dowjones.io/public/rss/mw_topstories) - priority: 1, Dow Jones 官方
- [Yahoo Finance](https://finance.yahoo.com/news/rssindex) - priority: 2, 官方聚合
- [Investing.com News](https://www.investing.com/rss/news.rss) - priority: 2, 官方
- [Business Insider](https://www.businessinsider.com/rss) - priority: 2, 主 feed
- [Forbes Business](https://www.forbes.com/business/feed/) - priority: 3
- [The Economist - Finance & Economics](https://www.economist.com/finance-and-economics/rss.xml) - priority: 2

### 英文 - 综合资讯

- [BBC World News](http://feeds.bbci.co.uk/news/world/rss.xml) - priority: 1, 与现有 BBC 同源
- [NPR News](https://feeds.npr.org/1001/rss.xml) - priority: 1, 美国公共广播
- [NPR Business](https://feeds.npr.org/1006/rss.xml) - priority: 2
- [The Guardian World](https://www.theguardian.com/world/rss) - priority: 1, 卫报官方
- [Reuters via Google News (workaround)](https://news.google.com/rss/search?q=when:24h+site:reuters.com&hl=en-US&gl=US&ceid=US:en) - priority: 2, Reuters 自家 feed 2023 起官方下线,通过 Google News 拉是行业标准做法

### 中文 - 科技

- [少数派](https://sspai.com/feed) - priority: 1, 官方 feed,长期稳定,国内直连
- [IT 之家](https://www.ithome.com/rss/) - priority: 1, 官方,国内站点
- [cnBeta](https://www.cnbeta.com.tw/backend.php) - priority: 2, 老牌站点(注意已迁 .com.tw)
- [爱范儿 ifanr](https://www.ifanr.com/feed) - priority: 2, 官方
- [极客公园](https://www.geekpark.net/rss) - priority: 2
- [机器之心](https://www.jiqizhixin.com/rss) - priority: 2, AI 中文头部
- [量子位 QbitAI (via RSSHub)](https://rsshub.app/qbitai/home) - priority: 2, AI 中文媒体,RSSHub 路由
- [虎嗅 (via RSSHub)](https://rsshub.app/huxiu/article) - priority: 2, 官方 feed 已下线,需 RSSHub
- [钛媒体 (via RSSHub)](https://rsshub.app/tmtpost/homepage-posts) - priority: 2, 同上

### 中文 - 财经

- [华尔街见闻 - 全球](https://api.wallstreetcn.com/apiv1/content/articles?cursor=0&limit=20) - priority: 1, JSON 接口需适配,推荐改用 RSSHub: `https://rsshub.app/wallstreetcn/news/global`
- [华尔街见闻 (RSSHub)](https://rsshub.app/wallstreetcn/news/global) - priority: 1
- [财新网 (RSSHub)](https://rsshub.app/caixin/latest) - priority: 1, 官方 feed 已收紧,RSSHub 仍有效
- [第一财经 (RSSHub)](https://rsshub.app/yicai/brief) - priority: 2
- [雪球热帖 (RSSHub)](https://rsshub.app/xueqiu/today) - priority: 3, 投资社区
- [东方财富 - 财经早餐 (RSSHub)](https://rsshub.app/eastmoney/news/1) - priority: 3

### 中文 - 综合

- [新华社 (RSSHub)](https://rsshub.app/xinhuanet/whxw) - priority: 2, 国内时政
- [人民日报 (RSSHub)](https://rsshub.app/people/opinion) - priority: 3
- [澎湃新闻 (RSSHub)](https://rsshub.app/thepaper/featured) - priority: 2
- [参考消息 (RSSHub)](https://rsshub.app/cankaoxiaoxi/zhongguo) - priority: 3

---

## ⚠️ 国内不可达或不稳定 (墙外/限频/Cloudflare 拦截,但 GitHub Actions runner 上可用)

- [Bloomberg Markets](https://feeds.bloomberg.com/markets/news.rss) - 原因: 官方 RSS 已基本下线,仅 markets / politics 等少数活着;Cloudflare 反爬严格,本地 curl 通常 403
- [Reuters Business (legacy)](https://feeds.reuters.com/reuters/businessNews) - 原因: 2023 年 Reuters 关闭官方 RSS,该 URL 现 404;**不要再加**,改用上面 Google News 包装
- [Financial Times Home](https://www.ft.com/rss/home) - 原因: FT 仅 RSS 标题/摘要,且部分地区 Cloudflare 阻断
- [WSJ Markets](https://feeds.a.dj.com/rss/RSSMarketsMain.xml) - 原因: 国内 dj.com 经常超时;Actions 上稳定
- [The Information](https://www.theinformation.com/feed) - 原因: 付费墙,RSS 仅含付费内容标题,价值低,不推荐
- [AP News (apnews.com)](https://apnews.com/index.rss) - 原因: AP 早期有 RSS,2024 起改为付费 API,公开 feed 已废弃;改用 Google News 包装或不加
- [NYT World](https://rss.nytimes.com/services/xml/rss/nyt/World.xml) - 原因: 国内访问 nytimes.com 被墙
- [Reuters World (Google News 包装)](https://news.google.com/rss/search?q=when:24h+site:reuters.com&hl=en-US&gl=US&ceid=US:en) - Google News 在国内不可达,Actions 可用
- [新浪财经 RSS](http://rss.sina.com.cn/finance/topnews.xml) - 原因: 新浪 2020 后陆续关闭多数 RSS,部分 URL 仍返回但更新滞后,需要核实后再加
- [新浪科技 RSS](http://rss.sina.com.cn/tech/it.xml) - 同上,可能返回旧内容
- [经济观察网 RSS](http://www.eeo.com.cn/feed.rss) - 原因: 2023 年起 feed 不稳定,频繁 502
- [21 世纪经济报道](http://www.21jingji.com/rss/finance.xml) - 原因: 旧版 URL 已 404,新站无官方 feed
- [智通财经 (RSSHub)](https://rsshub.app/zhitongcaijing/home) - RSSHub 公共实例可能限流

---

## ❌ 已确认失效或不应再使用

- ~~`https://feeds.reuters.com/reuters/topNews`~~ — 2023 关闭
- ~~`https://feeds.reuters.com/reuters/technologyNews`~~ — 同上
- ~~`https://www.huxiu.com/rss/0.xml`~~ — 虎嗅官方 feed 2022 起 404,只能走 RSSHub
- ~~`https://www.tmtpost.com/feed`~~ — 钛媒体官方 feed 同样下线
- ~~`https://www.caixin.com/rss/news.xml`~~ — 财新已收紧,改 RSSHub
- ~~`https://feeds.feedburner.com/zerohedge/feed`~~ — 内容质量噪音大,不推荐(仅作记录)

---

## 推荐增量名单 (按优先级,可立即合入)

> 下面 18 个候选都属于"高置信度可用"组,落地前请用 `curl --max-time 15 <url>` 在
> Actions runner 上做一次最终 health check。RSSHub 路由如果走公共实例
> (`rsshub.app`)有限流风险,生产建议自托管 RSSHub 实例并把域名换成你自己的。

```typescript
// 英文 - 科技 (5)
{ name: 'Wired', url: 'https://www.wired.com/feed/rss', category: 'technology', language: 'en', priority: 1 },
{ name: 'Engadget', url: 'https://www.engadget.com/rss.xml', category: 'technology', language: 'en', priority: 2 },
{ name: 'MIT Technology Review', url: 'https://www.technologyreview.com/feed/', category: 'technology', language: 'en', priority: 1 },
{ name: 'Hacker News', url: 'https://news.ycombinator.com/rss', category: 'technology', language: 'en', priority: 1 },
{ name: 'IEEE Spectrum', url: 'https://spectrum.ieee.org/feeds/feed.rss', category: 'technology', language: 'en', priority: 2 },

// 英文 - 财经 (4)
{ name: 'CNBC Top News', url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html', category: 'finance', language: 'en', priority: 1 },
{ name: 'MarketWatch', url: 'https://feeds.content.dowjones.io/public/rss/mw_topstories', category: 'finance', language: 'en', priority: 1 },
{ name: 'Yahoo Finance', url: 'https://finance.yahoo.com/news/rssindex', category: 'finance', language: 'en', priority: 2 },
{ name: 'Business Insider', url: 'https://www.businessinsider.com/rss', category: 'finance', language: 'en', priority: 2 },

// 英文 - 综合/经济 (3)
{ name: 'BBC World', url: 'http://feeds.bbci.co.uk/news/world/rss.xml', category: 'economy', language: 'en', priority: 1 },
{ name: 'NPR Business', url: 'https://feeds.npr.org/1006/rss.xml', category: 'economy', language: 'en', priority: 2 },
{ name: 'The Guardian World', url: 'https://www.theguardian.com/world/rss', category: 'economy', language: 'en', priority: 2 },

// 中文 - 科技 (4)
{ name: '少数派', url: 'https://sspai.com/feed', category: 'technology', language: 'zh', priority: 1 },
{ name: 'IT 之家', url: 'https://www.ithome.com/rss/', category: 'technology', language: 'zh', priority: 1 },
{ name: '爱范儿', url: 'https://www.ifanr.com/feed', category: 'technology', language: 'zh', priority: 2 },
{ name: '机器之心', url: 'https://www.jiqizhixin.com/rss', category: 'technology', language: 'zh', priority: 2 },

// 中文 - 财经 (1)
{ name: '华尔街见闻', url: 'https://rsshub.app/wallstreetcn/news/global', category: 'finance', language: 'zh', priority: 1 },

// 中文 - 综合 (1)
{ name: '澎湃新闻', url: 'https://rsshub.app/thepaper/featured', category: 'economy', language: 'zh', priority: 2 },
```

合入后总数:**7 (现有) + 18 (新) = 25 个源**,刚好达成目标。

### 备选名单 (验证后追加)

```typescript
{ name: 'VentureBeat', url: 'https://venturebeat.com/feed/', category: 'technology', language: 'en', priority: 2 },
{ name: 'Quanta Magazine', url: 'https://api.quantamagazine.org/feed/', category: 'technology', language: 'en', priority: 3 },
{ name: 'CNBC Technology', url: 'https://www.cnbc.com/id/19854910/device/rss/rss.html', category: 'technology', language: 'en', priority: 2 },
{ name: 'Forbes Business', url: 'https://www.forbes.com/business/feed/', category: 'finance', language: 'en', priority: 3 },
{ name: 'The Economist Finance', url: 'https://www.economist.com/finance-and-economics/rss.xml', category: 'finance', language: 'en', priority: 2 },
{ name: 'NPR News', url: 'https://feeds.npr.org/1001/rss.xml', category: 'economy', language: 'en', priority: 2 },
{ name: 'cnBeta', url: 'https://www.cnbeta.com.tw/backend.php', category: 'technology', language: 'zh', priority: 3 },
{ name: '极客公园', url: 'https://www.geekpark.net/rss', category: 'technology', language: 'zh', priority: 3 },
{ name: '量子位', url: 'https://rsshub.app/qbitai/home', category: 'technology', language: 'zh', priority: 2 },
{ name: '财新', url: 'https://rsshub.app/caixin/latest', category: 'finance', language: 'zh', priority: 1 },
{ name: '第一财经', url: 'https://rsshub.app/yicai/brief', category: 'finance', language: 'zh', priority: 2 },
{ name: '虎嗅', url: 'https://rsshub.app/huxiu/article', category: 'technology', language: 'zh', priority: 2 },
{ name: '钛媒体', url: 'https://rsshub.app/tmtpost/homepage-posts', category: 'technology', language: 'zh', priority: 3 },
{ name: '新华社', url: 'https://rsshub.app/xinhuanet/whxw', category: 'economy', language: 'zh', priority: 2 },
```

---

## 落地建议

1. **优先合入 18 个主推荐**(全是各媒体官方 / 学会 / 公共广播 RSS,不依赖第三方),把现有 7 → 25。
2. **RSSHub 路由不要全部放在公共 `rsshub.app`**:公共实例有限流,生产环境建议
   - 自建 RSSHub (Docker 一键),或
   - 使用付费托管(如 RSSHub Pro)
3. **GitHub Actions 上跑 health check**: 每周 cron 一次,把连续 3 次失败的源标记为 stale,
   自动降 priority 到 9 或剔除。
4. **Bloomberg / Reuters / NYT 等墙外强源**: 如果定位是国内浏览,继续不要;
   如果定位是 Actions runner 上拉取后静态发布,可加进去——这一类本来 GitHub Actions(美东)
   抓取最稳定。
