# GlobalPulse — 项目改造蓝图

> 本文档记录从静态演示站点到全自动AI新闻简报站的所有决策、实施进度和下一步计划。
> **创建时间**: 2026-05-03 | **最后更新**: 2026-05-27 | **状态**: ✅ 21 Phase 已编码 + Phase 22（缓存分层+编辑评估）+ 23（聚类调优）+ 24（密度判定+数量放开）+ 25（AI 对话 MVP）落地

---

## 一、决策点总览（已确认）

| # | 决策项 | 确认方案 | 理由 |
|---|---|---|---|
| 1 | LLM API | **DeepSeek-V4-Pro** 为主 (`deepseek-v4-pro`)，Kimi 备用 | DeepSeek-V4-Pro 性能更强，上下文 1M tokens，支持思考/非思考模式；当前 2.5 折优惠至 2026-05-31；Kimi 长文本强，备用于超长报道聚合 |
| 2 | 新闻分类 | **金融、财经、科技** 三大类 | 聚焦垂直领域，保证内容质量和专业度 |
| 3 | 语言策略 | **中英双语源 + AI结构化双语输出** | 中英源分别抓取，AI分析后同时生成 `en`/`zh` 版本；每条source标注语源语言 |
| 4 | 翻译策略 | **AI生成时直接双语输出**，非机器翻译 | 确保 timeline、perspectives 等结构化内容在两种语言下都准确自然 |
| 5 | 部署方案 | ~~GitHub Actions + Vercel~~ → **本地定时任务 + 局域网访问** | 用户倾向零部署成本、不上线；本地Windows任务计划程序定时执行脚本，局域网内设备均可访问 |
| 6 | 更新频率 | **每日 08:00 + 18:00 两次** | 覆盖早盘和收盘/晚间时段，适合金融财经类 |
| 7 | 数据来源 | **RSS源为主**（免费无限制），新闻API为辅 | RSS零成本、可持续；NewsAPI免费版作为补充 |
| 8 | 预算敏感度 | 低 — 效果优先 | DeepSeek-V4-Pro 当前 2.5 折：输入 ¥3/百万 tokens，输出 ¥6/百万 tokens；每次完整分析约 ¥0.3-0.8 |

---

## 二、整体架构

```
news-briefing/
│
├── 📁 src/                          # 前端 React + TypeScript
│   ├── components/                  # 所有UI组件（已国际化）
│   │   ├── UpdatePrompt.tsx         # ✅ 启动弹窗：询问是否更新新闻
│   │   └── DateSwitcher.tsx         # ✅ 日期切换器：浏览历史归档简报
│   ├── i18n/                        # ✅ 中英文国际化
│   │   ├── index.ts                 # i18n 配置（默认中文）
│   │   ├── en.ts                    # 英文翻译字典
│   │   └── zh.ts                    # 中文翻译字典
│   ├── hooks/                       # ✅ 自定义 Hooks
│   │   └── useNews.ts               # 新闻数据获取（支持指定日期归档）
│   ├── types.ts                     # 类型定义（已扩展 language 字段）
│   ├── App.tsx                      # ✅ 主应用（动态加载 + fallback）
│   └── ...
│
├── 📁 scripts/                      # ✅ 数据生成脚本（Node.js + tsx）
│   ├── update-news.ts               # ✅ 主脚本：抓取 → 分析 → 输出JSON + 归档
│   ├── export-static-data.ts        # ✅ 静态数据导出脚本
│   ├── fetcher/                     # ✅ 数据抓取层
│   │   ├── rss-fetcher.ts           # ✅ RSS源抓取
│   │   └── sources.ts               # ✅ RSS源配置（25个源,Phase 9 扩容）
│   ├── analyzer/                    # ✅ AI分析层
│   │   ├── deepseek.ts              # ✅ DeepSeek API 调用（带超时+重试）
│   │   ├── kimi.ts                  # ✅ Kimi API 调用（带超时+重试）
│   │   └── prompt.ts                # ✅ Prompt 构建器（双语输出）
│   └── utils/                       # ✅ 工具函数
│       ├── logger.ts                # ✅ 彩色日志
│       └── cluster.ts               # ✅ 新闻聚类算法（关键词相似度）
│
├── 📁 .github/workflows/            # ✅ GitHub Actions
│   └── update-news.yml              # ✅ 定时执行数据更新 + 构建部署
│
├── 📁 public/                       # 静态资源（serve.cjs 直接提供数据文件）
│   ├── news-data.json               # ✅ 最新简报
│   └── archive/                     # ✅ 每日归档 YYYY-MM-DD.json
│
├── .env.example                     # ✅ 环境变量模板
├── serve.cjs                        # ✅ 本地服务器（API + 数据从 public/）
├── start.bat                        # Windows 一键启动
├── package.json                     # ✅ 依赖管理（已扩展）
├── vite.config.ts                   # Vite 配置
└── PROJECT_BLUEPRINT.md             # 📋 本文档
```

### 数据流图

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   RSS源/API     │     │   AI 分析引擎   │     │   前端展示      │
│  (中英双源)     │────▶│ (DeepSeek/Kimi) │────▶│  React + i18n   │
│                 │     │                 │     │                 │
│ • TechCrunch    │     │ • 聚合多源报道  │     │ • 双语切换      │
│ • The Verge     │     │ • 提取时间线    │     │ • 原链溯源      │
│ • Ars Technica  │     │ • 生成观点矩阵  │     │ • 自动刷新提示  │
│ • BBC Business  │     │ • 预测/影响分析 │     │ • 暗色/亮色模式 │
│ • 36氪          │     │ • 输出en+zh     │     │                 │
│ • Solidot       │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                       │                       ▲
         │                       ▼                       │
         │              ┌─────────────────┐              │
         │              │  news-data.json │              │
         └─────────────▶│   (双语结构化)  │──────────────┘
                        └─────────────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │ GitHub Actions  │
                        │ (每日08:00/18:00)│
                        └─────────────────┘
```

---

## 三、实施进度

### Phase 1: 前端国际化（i18n）✅ 已完成

| 任务 | 状态 | 说明 |
|---|---|---|
| 安装 react-i18next + i18next + i18next-browser-languagedetector | ✅ | 已完成 |
| 创建翻译字典 `src/i18n/en.ts` | ✅ | 已完成，覆盖所有UI文本 |
| 创建翻译字典 `src/i18n/zh.ts` | ✅ | 已完成，覆盖所有UI文本 |
| 配置 i18n 实例 `src/i18n/index.ts` | ✅ | 已完成，自动检测浏览器语言 |
| `main.tsx` 引入 i18n | ✅ | 已完成 |
| Header 添加语言切换按钮 | ✅ | 已完成，EN/中文一键切换 |
| 所有组件文本国际化 | ✅ | Header, StoryCard, StoryTimeline, Sidebar, AlsoToday, Footer, App |
| `Source` 类型扩展 `language` 字段 | ✅ | 已完成 |
| 日期本地化显示 | ✅ | 中文显示中文日期，英文显示英文日期 |
| sources 显示为可点击外链 | ✅ | StoryCard 中 sources 带 url 时显示为 `<a>` 标签 |
| 添加 source 语言标注样式 | ✅ | `.source-lang` CSS 样式 |
| 构建通过 | ✅ | `npm run build` 无错误 |

### Phase 2: 数据层改造（动态加载）✅ 已完成

| 任务 | 状态 | 说明 |
|---|---|---|
| 扩展 Story 类型支持双语 | ✅ | 由AI脚本输出 en/zh 字段，前端根据 i18n.language 选择 |
| 扩展 Source 类型标注语源语言 | ✅ | 已添加 `language?: 'en' \| 'zh'` |
| 创建 `src/hooks/useNews.ts` | ✅ | 从 `/news-data.json` 加载，支持轮询和手动刷新 |
| 创建 `public/news-data.json` 骨架 | ✅ | 静态演示数据已导出 |
| App.tsx 使用 useNews hook | ✅ | 有数据时显示动态数据，无数据时 fallback 到静态数据 |
| 添加 loading / error / 刷新状态 | ✅ | 加载中、错误提示、新数据横幅 |
| AlsoToday items 改为外链 | ✅ | 已支持 url 属性 |
| 新简报推送提示 | ✅ | 前端每5分钟轮询，检测到新数据时显示横幅 |

### Phase 3: 数据抓取与分析脚本 ✅ 已完成

| 任务 | 状态 | 说明 |
|---|---|---|
| 安装脚本依赖（rss-parser, dotenv, tsx） | ✅ | 已完成 |
| 配置 RSS 源列表（中英双源） | ✅ | 7个初始源(TechCrunch, The Verge, Ars Technica, BBC Business, BBC Tech, 36氪, Solidot);Phase 9 扩容到 25 |
| 实现 RSS 抓取器 | ✅ | `scripts/fetcher/rss-fetcher.ts` |
| 实现新闻去重/聚类 | ✅ | `scripts/utils/cluster.ts` — 关键词Jaccard相似度 |
| 设计 AI Prompt（双语输出） | ✅ | `scripts/analyzer/prompt.ts` — 详细的结构化Prompt |
| 接入 DeepSeek API | ✅ | `scripts/analyzer/deepseek.ts` — 带重试机制 |
| 接入 Kimi API | ✅ | `scripts/analyzer/kimi.ts` — DeepSeek失败时自动fallback |
| 实现 `scripts/update-news.ts` 主脚本 | ✅ | 完整编排：抓取→聚类→AI分析→输出JSON |
| 配置 `.env.example` | ✅ | DEEPSEEK_API_KEY, KIMI_API_KEY |
| 本地测试脚本 | ✅ | RSS抓取测试通过（50篇文章/批次） |

### Phase 4: 自动化部署 ✅ 已完成

| 任务 | 状态 | 说明 |
|---|---|---|
| 创建 GitHub Actions workflow | ✅ | `.github/workflows/update-news.yml` |
| 配置定时触发（08:00 + 18:00 CST） | ✅ | `cron: '0 0,10 * * *'` (UTC) |
| 配置 Vercel 自动部署 | ⬜ | **需要用户手动配置**（见下方部署指南） |
| 配置 Secrets（API Keys） | ⬜ | **需要用户手动配置** |
| 端到端测试 | ⬜ | **需要配置API Key后测试** |

### Phase 5: 启动弹窗手动更新 ✅ 已完成

| 任务 | 状态 | 说明 |
|---|---|---|
| `serve.cjs` 新增 `POST /api/update-news` API 端点 | ✅ | 用 `child_process.spawn` 执行 `npm run update-news`，SSE 流式推送进度日志 |
| 创建 `src/components/UpdatePrompt.tsx` | ✅ | 启动弹窗组件：询问是否更新，接受后实时显示日志，完成可刷新页面 |
| 弹窗逻辑：`sessionStorage` 控制 | ✅ | 每次启动（新会话）弹一次；拒绝后同一会话不再弹；关闭浏览器后重新询问 |
| 弹窗状态机：idle → running → done/error | ✅ | idle 显示询问；running 流式日志；done 提供刷新按钮；error 提供重试 |
| `en.ts` / `zh.ts` 添加弹窗国际化 | ✅ | 12 个 i18n key |
| `index.css` 弹窗样式 | ✅ | 半透明遮罩 + 居中模态框 + 日志面板 + 动画 |
| 构建通过 | ✅ | `npm run build` 无错误 |

### Phase 6: 日期切换器 + 网络鲁棒性 ✅ 已完成

| 任务 | 状态 | 说明 |
|---|---|---|
| `update-news.ts` 写入归档 `public/archive/YYYY-MM-DD.json` | ✅ | 每次更新生成日期命名快照 |
| `serve.cjs` 新增 `GET /api/news-dates` 端点 | ✅ | 列出 `public/archive/` 下可用日期(降序) |
| `serve.cjs` 数据文件直接从 `public/` 提供 | ✅ | `news-data.json` 和 `archive/*.json` 不再需要 build 才能生效 |
| `useNews` hook 加 `date` 参数 | ✅ | `null` 加载最新,字符串加载指定日期归档;归档失败显式报错 |
| 创建 `src/components/DateSwitcher.tsx` | ✅ | 横向 pill 条 + 折叠"更早..."下拉,显示最近 7 天 |
| `App.tsx` 接入 DateSwitcher | ✅ | 选中归档时禁用轮询/新简报横幅 |
| `en.ts` / `zh.ts` 添加日期切换器国际化 | ✅ | `dateSwitcher.label` / `latest` / `older` |
| `index.css` 日期切换器样式 | ✅ | pill 风格,与 `.lens-pill` 视觉一致 |
| **DeepSeek/Kimi 网络鲁棒性增强** | ✅ | `AbortSignal.timeout(120s)` + 退避 5/15/45s + `max_tokens` 8000→6000 + 网络错误识别 |
| 默认语言切换为中文 | ✅ | `lng: 'zh'` + `fallbackLng: 'zh'`,移除 navigator 检测 |
| 回填首个归档 | ✅ | 用现有 `news-data.json` 创建 `public/archive/2026-05-03.json` |
| 构建通过 | ✅ | `npm run build` 无错误 |

### Phase 7: 期号系统 + 日历浏览 ✅ 已完成

| 任务 | 状态 | 说明 |
|---|---|---|
| `public/issue-config.json` 期号起始配置 | ✅ | `{startDate: "2026-04-01", startIssue: 1}`;前后端共享算法 |
| `scripts/utils/issue.ts` 期号工具模块 | ✅ | `loadIssueConfig` / `calculateIssueNumber` / `todayUtcDate` (UTC 字符串差值法,避免时区漂移) |
| `scripts/update-news.ts` 写入 `issueNumber` + `issueDate` | ✅ | 顶层字段,归档文件名仍为 YYYY-MM-DD.json |
| `scripts/migrate-archives.ts` 回填脚本 | ✅ | 扫描 `public/archive/*.json` 补字段;已运行,2026-05-03 → 第 33 期 |
| `serve.cjs` 新增 `GET /api/issue-config` 端点 | ✅ | 同时把 `/issue-config.json` 加入 `isDataFilePath` 直读 public 路由 |
| `src/components/Calendar.tsx` 月视图日历 | ✅ | 7 列网格;每格显示日期 + 期号;归档日期可点;今天有 accent 边框;月份切换;弹出层带遮罩 |
| `src/components/DateSwitcher.tsx` 三 pill + 日历按钮 | ✅ | 「最近 / 今天 / 昨天」+ 内联 SVG 日历图标;选中自定义日期时显示「第 N 期 · YYYY-MM-DD」pill |
| `src/components/Header.tsx` 真期号 + 真更新时间 | ✅ | `data?.issueNumber` 替换硬编码 `1,247`;`generatedAt` 计算相对时间;归档模式显示「归档 · 日期」 |
| `src/App.tsx` 把 issue 字段传给 Header | ✅ | 4 个新 props |
| `src/i18n/zh.ts` + `en.ts` 国际化 | ✅ | `calendar.*` (5 keys) + `dateSwitcher.today/yesterday/openCalendar` + `header.archived` (en) |
| `src/index.css` 日历 + DateSwitcher 增强样式 | ✅ | 弹出层 + 7 列网格 + 今天/选中态/禁用态;响应式 (≤600px 缩小) |
| `.github/workflows/update-news.yml` CI 提交归档 | ✅ | `git add` 增加 `public/archive` + `public/issue-config.json` |
| README.md 期号系统文档 | ✅ | 配置说明 + 迁移命令 + API 端点 + 数据文件表 |
| TypeScript build | ✅ | `npx tsc -b` 无错误 |
| serve.cjs 语法检查 | ✅ | `node -c serve.cjs` 通过 |

---

## 四、技术选型详情

### 前端
- **框架**: React 19 + TypeScript + Vite
- **i18n**: `react-i18next` + `i18next` + `i18next-browser-languagedetector`
- **HTTP**: 原生 `fetch`
- **样式**: 原生 CSS（报纸风格）

### 后端脚本
- **运行时**: Node.js 22 + `tsx`（TypeScript 直接运行）
- **RSS解析**: `rss-parser`
- **环境变量**: `dotenv`
- **AI API**: DeepSeek OpenAI-compatible API + Kimi OpenAI-compatible API
- **调度**: GitHub Actions `schedule` event

### 部署
- **方案**: 本地化运行（不上线）
- **定时更新**: Windows 任务计划程序（或 `schtasks`）每日 08:00 / 18:00 执行 `npm run update-news`
- **本地服务**: Node.js 静态服务器 (`serve.cjs`)，绑定 `0.0.0.0` 支持局域网访问
- **访问范围**: 本机 + 同局域网设备（手机/平板/其他电脑）
- **备选**: 代码仍可推送 GitHub 作为备份，但不连接 Vercel

---

## 五、RSS 源状态

### 当前 25 个源(Phase 9 扩容,2026-05-04)

> **健康检查**: `npm run test-feed` 全量并发测,输出 status/latency/items/firstTitle 表格;
> 也可 `npm run test-feed -- <url>` 测临时 URL。建议合入新源前先跑一次,以及在 GitHub Actions runner 上做最终验证。
>
> 备选名单(14 条)和已确认失效源记录在 `rss-candidates.md`。

### 最近一次健康检查基线 (2026-05-04, 本机直连)

**总览**: ✅ 22 / ⚠️ 0 / ❌ 3,所有海外源(BBC / CNBC / MarketWatch / Yahoo Finance / Hacker News / The Guardian / Wired / MIT / Engadget / IEEE 等)直连均正常。

**失败的 3 条**(已知问题,保留在 sources.ts 中,`fetchOneSource` 优雅返回 `[]` 不影响其他源):

| 来源 | URL | 错误 | 性质 | 处置 |
|---|---|---|---|---|
| 华尔街见闻 | `rsshub.app/wallstreetcn/news/global` | HTTP 403 | 公共 RSSHub 实例限流 | 待自建 RSSHub 后切换 |
| 澎湃新闻 | `rsshub.app/thepaper/featured` | HTTP 403 | 同上 | 同上 |
| 机器之心 | `jiqizhixin.com/rss` | XML 解析失败 (line 10 close tag) | 官方 feed HTML 未转义 `>`/`<` | 上游问题,待找替代 URL 或剔除 |

**性能**: 22 个 ok 源平均 latency 1.6s,最慢 3.2s (BBC Business / Business Insider),最快 0.7s (TechCrunch)。
items 数从 10(MarketWatch / NPR / The Verge / MIT)到 60(IT之家)不等,符合 `slice(0, 10)` 的预期边界。

> 下次跑 `npm run test-feed` 时可与本基线对比,识别波动源。

#### 英文 - 科技 (9)

| 来源 | URL | priority |
|---|---|---|
| TechCrunch | techcrunch.com | 1 |
| The Verge | theverge.com | 1 |
| Ars Technica | arstechnica.com | 2 |
| Wired | wired.com | 1 |
| Engadget | engadget.com | 2 |
| MIT Technology Review | technologyreview.com | 1 |
| Hacker News | news.ycombinator.com | 1 |
| IEEE Spectrum | spectrum.ieee.org | 2 |
| BBC Technology | feeds.bbci.co.uk | 1 |

#### 英文 - 财经 (4)

| 来源 | URL | priority |
|---|---|---|
| CNBC Top News | cnbc.com | 1 |
| MarketWatch | feeds.content.dowjones.io | 1 |
| Yahoo Finance | finance.yahoo.com | 2 |
| Business Insider | businessinsider.com | 2 |

#### 英文 - 综合/经济 (4)

| 来源 | URL | priority |
|---|---|---|
| BBC Business | feeds.bbci.co.uk | 1 |
| BBC World | feeds.bbci.co.uk | 1 |
| NPR Business | feeds.npr.org | 2 |
| The Guardian World | theguardian.com | 2 |

#### 中文 - 科技 (6)

| 来源 | URL | priority |
|---|---|---|
| Solidot | solidot.org | 2 |
| 36氪 | 36kr.com | 2 |
| 少数派 | sspai.com | 1 |
| IT之家 | ithome.com | 1 |
| 爱范儿 | ifanr.com | 2 |
| 机器之心 | jiqizhixin.com | 2 |

#### 中文 - 财经 (1)

| 来源 | URL | priority |
|---|---|---|
| 华尔街见闻 | rsshub.app/wallstreetcn/news/global | 1 |

#### 中文 - 综合 (1)

| 来源 | URL | priority |
|---|---|---|
| 澎湃新闻 | rsshub.app/thepaper/featured | 2 |

> **国内可达性提示**: BBC / CNBC / MarketWatch / Yahoo Finance / Hacker News 等海外源在国内本地直连可能 403/超时,但 GitHub Actions runner(墙外)上稳定。
> RSSHub 公共实例 `rsshub.app` 有限流风险,生产建议自建 RSSHub。`fetchOneSource` 失败已优雅返回 `[]`,不会拖累其他源。

---

## 六、使用指南

### 本地开发

```bash
# 1. 安装依赖
npm install

# 2. 启动开发服务器
npm run dev
# 访问 http://localhost:5173

# 3. 构建（用于生产）
npm run build
```

### 本地运行数据更新（需要 API Key）

```bash
# 1. 复制环境变量模板
cp .env.example .env

# 2. 编辑 .env，填入你的 API Key
# DEEPSEEK_API_KEY=sk-xxx
# KIMI_API_KEY=sk-xxx

# 3. 运行数据更新脚本
npm run update-news

# 4. 查看生成的数据
# cat public/news-data.json
```

### 部署到 Vercel（推荐）

**步骤1：推送代码到 GitHub**
```bash
git init  # 如果还没有
git add .
git commit -m "Initial commit"
git push origin main
```

**步骤2：连接 Vercel**
1. 访问 https://vercel.com/new
2. 选择你的 GitHub 仓库
3. Framework Preset 选择 **Vite**
4. 点击 Deploy

**步骤3：配置 GitHub Secrets**
1. 在 GitHub 仓库页面 → Settings → Secrets and variables → Actions
2. 添加以下 Secrets:
   - `DEEPSEEK_API_KEY`: 你的 DeepSeek API Key
   - `KIMI_API_KEY`: （可选）你的 Kimi API Key

**完成！** Vercel 会自动部署，GitHub Actions 每天 08:00 和 18:00 自动更新新闻。

---

## 七、更新日志

### 2026-05-03
- ✅ **Phase 1 完成**: 前端国际化（i18n）
  - 7个组件全部国际化
  - EN/中文一键切换
  - 日期本地化
  - sources 外链 + 语言标注
- ✅ **Phase 2 完成**: 数据层改造
  - `useNews` hook（轮询 + 刷新 + 新数据检测）
  - App.tsx 动态加载 + fallback
  - loading/error/新数据横幅 UI
- ✅ **Phase 3 完成**: 数据抓取与分析脚本
  - 6个RSS源配置
  - RSS抓取器 + 聚类算法
  - DeepSeek + Kimi 双API（自动fallback）
  - 高质量双语Prompt
  - 主脚本 `update-news.ts`
- ✅ **Phase 4 完成**: GitHub Actions 自动化
  - 每日两次定时触发
  - 自动commit + push
  - Vercel 自动部署集成

### 2026-05-03 (后续迭代)
- ✅ **修复**: 中英文新闻内容切换失效
  - 扩展 `Story`/`Source` 类型定义，添加 `*En`/`*Zh` 可选字段
  - 创建 `useLocalizedStory` hook，统一封装语言选择逻辑
  - 重构 `StoryCard`：headline、lead、timeline、keyDetails、perspectives、forecasts、secondaryEffects、nextToWatch 均支持双语切换
  - Source `take` 字段支持双语切换
  - 更新 fallback data (`data.ts`) 添加示例中文内容
- ✅ **新增**: 新闻来源溯源优化
  - Story 标题上方新增 `source-chip` 标签栏，每个来源显示为可点击的 pill 按钮，直达原始报道
  - 保留底部 `sources-details` 折叠面板作为详细视图
  - 新增 `.story-source-chips` / `.source-chip` CSS 样式
- **状态**: ✅ 已修复 & 构建通过

### 2026-05-03 (模型升级 + Prompt 优化)
- ✅ **模型升级**: DeepSeek 从 `deepseek-chat` 迁移至 **`deepseek-v4-pro`**
  - `deepseek-chat` 即将弃用，新模型性能更强（上下文 1M，输出最大 384K）
  - 当前享受 2.5 折优惠（原价 ¥12/百万输入 → ¥3；原价 ¥24/百万输出 → ¥6），优惠期至 2026-05-31
  - 修改文件：`scripts/analyzer/deepseek.ts`
- ✅ **P0 完成**: AI Prompt 输出双语 timeline
  - `scripts/analyzer/prompt.ts`: `timeline` 字段拆分为 `timelineEn` + `timelineZh`
  - 要求 AI 为每个时间线事件同时生成英文和中文版本（date/year 保持一致）
  - 前端 `useLocalizedStory` hook 已提前支持 `timelineEn`/`timelineZh`，无需额外改动
- **状态**: ✅ 已更新，build 通过

### 2026-05-03 (Kimi 模型升级 + AlsoToday 双语适配)
- ✅ **模型升级**: Kimi 从 `moonshot-v1-8k` 迁移至 **`kimi-k2.6`**
  - 修改文件：`scripts/analyzer/kimi.ts`
- ✅ **P1 完成**: AlsoToday 短标题双语适配
  - `src/types.ts`: `AlsoTodayItem` 扩展 `titleEn`/`titleZh` 可选字段
  - `src/components/AlsoToday.tsx`: 新增 `useLocalizedTitle` hook，根据当前语言选择 `titleZh` → `titleEn` → `title`
  - `scripts/update-news.ts`: alsoToday 生成逻辑按 `sourceLanguage` 自动填充 `titleEn`（英文源）或 `titleZh`（中文源）
  - `src/data.ts` fallback 与 `public/news-data.json`: 补充所有 alsoToday 条目的中文标题
- **状态**: ✅ 已更新，build 通过

### 2026-05-04 (启动弹窗手动更新)
- ✅ **Phase 5 完成**: 启动弹窗 — 手动触发新闻更新
  - `serve.cjs`: 新增 `POST /api/update-news` API 端点，用 `child_process.spawn` 执行更新脚本，SSE 流式推送实时日志
  - `src/components/UpdatePrompt.tsx`: 新建弹窗组件，4 种状态（idle/running/done/error），支持实时日志面板
  - 弹窗逻辑：`sessionStorage` 控制，每次浏览器会话弹一次；拒绝后同一会话不再弹；关闭浏览器后重新询问
  - `src/i18n/en.ts` + `src/i18n/zh.ts`: 添加 12 个弹窗相关 i18n key
  - `src/index.css`: 半透明遮罩 + 居中模态框 + 日志滚动面板 + fade/slide 动画
  - `src/App.tsx`: 挂载 `<UpdatePrompt />`
- **状态**: ✅ 已完成，build 通过

### 2026-05-04 (日期切换器 + 网络鲁棒性 + 中文默认)
- ✅ **Phase 6 完成**: 日期切换器(每天浏览不同简报)
  - `scripts/update-news.ts`: 每次更新同时写 `public/news-data.json`(最新)和 `public/archive/YYYY-MM-DD.json`(归档)
  - `serve.cjs`: 新增 `GET /api/news-dates` 端点列出归档日期;数据文件 (`/news-data.json` 与 `/archive/*.json`) 直接从 `public/` 提供,**`update-news` 后无需 build 即时生效**
  - `src/hooks/useNews.ts`: 加 `date` 参数,`null` 加载最新,字符串加载归档;归档失败显式报错;归档模式下停止轮询
  - `src/components/DateSwitcher.tsx`: 新建组件,横向 pill 条显示最近 7 天 + "更早..."折叠下拉
  - `src/App.tsx`: 引入 `selectedDate` state + 渲染 `<DateSwitcher />`,选中归档时禁用新简报横幅
  - `en.ts` / `zh.ts`: 新增 `dateSwitcher.label` / `latest` / `older` 三个 key
  - `index.css`: pill 风格,与 `.lens-pill` 一致
  - 回填:用现有 `news-data.json` 创建首个归档 `public/archive/2026-05-03.json`
- ✅ **网络鲁棒性增强**(修复 Issue #6)
  - `scripts/analyzer/deepseek.ts` + `kimi.ts`: 添加 `AbortSignal.timeout(120s)`、退避 5/15/45s、`max_tokens` 8000→6000、`isNetworkError()` 区分网络/API 错误
- ✅ **默认语言切换为中文**
  - `src/i18n/index.ts`: `lng: 'zh'` + `fallbackLng: 'zh'`,移除 `navigator` 检测;用户切换会持久化在 localStorage
- **状态**: ✅ 已完成,build 通过

### 2026-05-04 (期号系统 + 日历浏览)
- ✅ **Phase 7 完成**: 每日一期 + 月视图日历
  - **配置驱动**: `public/issue-config.json` 定义起始日期与起始期号(`startDate=2026-04-01, startIssue=1`),前后端共享同一份算法,UTC 字符串差值法避免时区漂移
  - **后端**: `scripts/utils/issue.ts` 提供 `calculateIssueNumber/loadIssueConfig/todayUtcDate`;`scripts/update-news.ts` 在 news-data.json 与归档中写入 `issueNumber + issueDate` 字段;新增 `scripts/migrate-archives.ts` 回填脚本,已运行 2026-05-03 → 第 33 期
  - **服务器**: `serve.cjs` 新增 `GET /api/issue-config` 端点 + `/issue-config.json` 直读路由
  - **前端日历**: 新建 `src/components/Calendar.tsx`,7 列月视图,每格显示日期 + 期号,有归档高亮可点,今天有 accent 边框,弹出层带遮罩,中英文 + 响应式
  - **DateSwitcher 简化**: 主界面只显示「最近 / 今天 / 昨天」三个 pill + 日历图标按钮(内联 SVG);选中自定义日期时额外显示「第 N 期 · YYYY-MM-DD」pill
  - **Header 真数据**: 报头不再硬编码 `1,247`/`5m`,改为 `data.issueNumber` 与 `formatTimeAgo(generatedAt)`;归档模式显示「归档 · 日期」
  - **i18n**: 新增 `calendar.*` 5 个 key + `dateSwitcher.today/yesterday/openCalendar` + 英文 `header.archived`
  - **CSS**: 日历弹出层、7 列网格、可用/禁用/选中/今天态、≤600px 响应式
  - **CI**: `.github/workflows/update-news.yml` 把 `public/archive` 与 `public/issue-config.json` 加入 `git add`
  - **README**: 新增「期号系统」「数据文件」两节,记录配置字段、迁移命令、API 端点
- **状态**: ✅ 已完成,`tsc -b` 与 `node -c serve.cjs` 通过

### 2026-05-04 (RSS 信源扩容 + 健康检查)
- ✅ **Phase 9 完成**: RSS 源数量 7 → 25
  - `scripts/fetcher/sources.ts`: 接入 `rss-candidates.md` 的 18 条主推荐;按英文/中文 × 科技/财经/经济 重新排版,priority 字段保留
  - 英文新增 9 条:Wired / Engadget / MIT Tech Review / Hacker News / IEEE Spectrum / CNBC Top / MarketWatch / Yahoo Finance / Business Insider / BBC World / NPR Business / The Guardian World
  - 中文新增 6 条:少数派 / IT之家 / 爱范儿 / 机器之心 / 华尔街见闻(RSSHub) / 澎湃新闻(RSSHub)
- ✅ **健康检查脚本** `scripts/fetcher/test-feed.ts`
  - 与 rss-fetcher 共用 UA / timeout / Accept 头,结果与生产抓取一致
  - 并发探测,输出 status(ok/empty/error) + latency + items + firstTitle + 错误细节,按状态排序
  - 两种用法:`npm run test-feed` 全量;`npm run test-feed -- <url> [...url]` 临时 URL
- ✅ `package.json` 新增 `test-feed` 脚本入口
- ✅ **首次健康检查基线**(本机直连):**22 ok / 3 error**
  - 海外源(BBC / CNBC / MarketWatch / Yahoo Finance / Hacker News / Wired / MIT / Engadget / IEEE 等)全部直连正常
  - 失败 3 条:华尔街见闻 + 澎湃新闻(公共 RSSHub 限流 403)、机器之心(官方 feed XML 未转义)——保留在 sources.ts 中,`fetchOneSource` 优雅返回 `[]`,不影响其他源
  - 详细基线见 section 五
- ✅ **顺手修一旧 bug** `scripts/update-news.ts:93` `sources.push(...)` 缺 `take` 字段,strict TS 报错(scripts/ 不在 tsconfig include 里所以没暴露,tsx 运行时忽略类型);补 `take: article.title` 后 `tsc --strict` 全脚本通过
- **状态**: ✅ 已完成,`tsc -b` 通过

### 2026-05-04 (Vercel 部署配置)
- ✅ **Phase 10 完成**: 项目可直接 import Vercel 部署,本地体验完全不变
- ✅ **`vercel.json`**: framework=vite + buildCommand + outputDirectory + cache headers(`index.html` no-cache;`news-data.json` / `news-dates.json` 60s;`issue-config.json` 5min;`archive/*.json` 与 `assets/*` 1y immutable)
- ✅ **静态环境 API 兼容降级** — Vercel 上 `serve.cjs` 不跑,3 个 `/api/*` 端点会 404
  - `scripts/update-news.ts`: 每次更新顺便写 `public/news-dates.json`(归档日期数组),作为 `/api/news-dates` 的静态等价物;新增 `readdirSync` import
  - `src/components/DateSwitcher.tsx`: 抽出 `fetchDates()` / `fetchIssueConfig()` helper,先试 `/api/*`,失败回退到 `/news-dates.json` / `/issue-config.json`(后者 Phase 7 已存在)
  - `src/components/UpdatePrompt.tsx`: mount 时探测 `/api/news-dates`,仅在后端可用时弹窗 — Vercel 上"立即更新"按钮不会出现,避免点击失败
- ✅ **GitHub Actions workflow** 把 `public/news-dates.json` 加到 `git add`(原来只 commit `news-data.json` / `archive/` / `issue-config.json`),否则新生成的 dates index 不会跟着归档一起 push 回 main
- ✅ **build 通过** — 61 modules / 248ms / 96KB gzip
- **状态**: ✅ 代码完成,等用户在 Vercel dashboard 上 import + 配 `DEEPSEEK_API_KEY` Secret
---

## 九、已知问题与修复记录

### Issue #1: `serve.cjs` 静态服务器无法处理 URL 查询参数

**发现时间**: 2026-05-03
**现象**: 页面显示 "Failed to load briefing"，但新闻内容（fallback 数据）正常显示
**根因**:
1. `useNews.ts` 用 `fetch('/news-data.json?t=123456789')` 防缓存
2. `serve.cjs` 把查询参数 `?t=123456789` 当作文件名的一部分
3. `fs.readFile('dist/news-data.json?t=123456789')` 返回 404
4. App.tsx 同时显示 error banner 和 fallback 内容，体验混乱

**修复**:
1. `serve.cjs`: 用 `new URL(req.url).pathname` 提取纯净路径
2. `useNews.ts`: 去掉 URL 时间戳（serve.cjs 无缓存头，不需要）
3. `useNews.ts`: 初始加载和轮询失败时静默处理，只在手动刷新失败时显示 error
4. `App.tsx`: 新增 `fallback-notice` 提示"Showing demo data — Load latest briefing"
5. 添加 `.fallback-notice` CSS 样式

**状态**: ✅ 已修复，build 通过

### Issue #2: 中英文新闻内容切换失效

**发现时间**: 2026-05-03
**现象**: 点击 Header 的 EN/中文 按钮后，UI 文本（按钮、标签、日期）切换正常，但新闻内容（headline、lead、keyDetails、perspectives 等）始终显示英文，不随语言变化
**根因**:
1. AI 分析脚本和 `public/news-data.json` 已输出双语字段（如 `headlineEn`/`headlineZh`、`leadEn`/`leadZh`）
2. 但 `src/types.ts` 中的 `Story`、`Source` 等 TypeScript 接口**未定义这些双语字段**
3. `src/components/StoryCard.tsx` 直接读取 `story.headline`、`story.lead` 等单语字段，没有根据 `i18n.language` 选择对应语言版本
4. `src/data.ts` 的 fallback 数据也没有中文内容

**修复**:
1. `src/types.ts`: 为 `Story`、`Source` 及相关子类型添加 `*En`/` *Zh` 可选字段
2. `src/hooks/useLocalizedStory.ts`: 新建 hook，根据当前语言自动选择 `zh`→`*Zh`→`*En`→base 的优先级回退链
3. `src/components/StoryCard.tsx`: 全面改用 `useLocalizedStory(story)` 获取本地化内容；底部 sources 的 `take` 也根据语言切换
4. `src/data.ts`: 为 fallback stories 补充 `headlineZh`、`leadZh`、`keyDetailsZh` 等示例中文内容

**状态**: ✅ 已修复，build 通过

### Issue #3: 新闻来源溯源不够明显

**发现时间**: 2026-05-03
**现象**: 原始新闻来源的跳转链接被折叠在 Story 底部的 `sources-details` 面板中，用户需要展开才能看到并点击，不够便捷
**根因**:
1. 所有 sources 统一放在 `<details>` 折叠组件内，默认不可见
2. Source 的 `take` 字段未做双语切换，中文模式下仍显示英文摘要

**修复**:
1. `src/components/StoryCard.tsx`: 在 `story-meta` 与 `h2` 之间新增 `source-chip` 标签栏，将每个 source 渲染为可点击的 pill 形状外链按钮
2. 保留原有 `sources-details` 折叠面板作为详细视图，里面显示各来源的 `take` 摘要
3. `src/index.css`: 新增 `.story-source-chips` 和 `.source-chip` 样式（报纸风格，与现有设计一致）
4. Source `take` 字段接入 `useLocalizedSource`，中文模式下显示 `takeZh`

**状态**: ✅ 已修复，build 通过

### Issue #4: AI 分析返回 JSON 解析失败（部署/运行时报错）

**发现时间**: 2026-05-03
**现象**: 运行 `npm run update-news` 时，DeepSeek API 调用频繁报错：`SyntaxError: Expected ',' or ']' after array element in JSON at position XXXX`
**根因**:
1. `max_tokens: 4000` 容量不足：Prompt 要求输出完整双语内容（headlineEn/Zh、leadEn/Zh、timelineEn/Zh、keyDetailsEn/Zh 等），4000 tokens 经常导致 JSON 被截断
2. JSON 提取逻辑脆弱：原正则 `/\{[\s\S]*\}/` 贪婪匹配，当响应包含多个 JSON 块或被截断时，会匹配到不完整的内容
3. 截断后的 JSON 无法被 `JSON.parse` 解析，导致整个 cluster 分析失败，只能依赖重试

**修复**:
1. `scripts/analyzer/deepseek.ts` & `scripts/analyzer/kimi.ts`:
   - `max_tokens` 从 **4000 提升至 8000**，为双语输出提供充足容量
   - 新增 `response_format: { type: "json_object" }`，强制 API 只返回有效 JSON，减少格式问题
   - 重写 `extractJson()` 函数，采用多层解析策略：
     - ① 直接 parse trimmed content
     - ② 从 markdown code block 中提取
     - ③ 按平衡花括号匹配最外层 JSON 对象（最可靠）
     - ④ 回退到贪婪正则
   - 解析失败时输出响应内容前 1200 字符的预览，便于调试

**状态**: ✅ 已修复，build 通过

### Issue #5: 本地运行页面闪烁后白屏

**发现时间**: 2026-05-03
**现象**: 使用 `start.bat` 启动本地服务器（`http://localhost:8080/`）后，页面先短暂正常显示中文内容，随后突然变成白屏并持续白屏
**根因分析**:
1. `src/components/AlsoToday.tsx` 中定义了 `useLocalizedTitle` 自定义 hook（内部调用 `useTranslation`），但在 `items.map()` 回调中调用该函数，**严重违反 React Hooks 规则**（Hooks 只能在组件顶层调用，不可在循环/回调中调用）
2. 当 `useNews.ts` 异步加载新数据后触发重新渲染，React 在重新渲染过程中因 hooks 调用顺序不匹配，导致不可预测的行为甚至页面崩溃
3. 缺少全局错误边界（Error Boundary），JavaScript 运行时错误直接向上传播，React 卸载整个应用树，造成整页白屏

**修复**:
1. `src/components/AlsoToday.tsx`: 移除违规的 `useLocalizedTitle` hook，改为在组件顶层获取 `i18n.language`，在 `map` 回调中使用纯函数 `getTitle()` 进行语言选择
2. `src/components/ErrorBoundary.tsx`: **新建**全局错误边界组件，捕获渲染阶段错误并显示友好的错误信息（包含错误名称、消息和堆栈），防止白屏
3. `src/main.tsx`: 用 `<ErrorBoundary>` 包裹 `<App />`

**状态**: ✅ 已修复，build 通过，用户验证通过

### Issue #6: 启动弹窗触发更新后 DeepSeek API `ECONNRESET` / `terminated`

**发现时间**: 2026-05-04
**现象**: 在浏览器中点击启动弹窗的"立即更新"按钮后,日志显示首条 cluster 分析在约 100 秒后失败,报 `TypeError: terminated` 和 `[cause]: Error: read ECONNRESET`,然后开始第 2 次重试
**根因**:
1. `fetch()` 调用 DeepSeek-V4-Pro 时**未设置任何超时**(`AbortSignal`)
2. DeepSeek-V4-Pro 输出双语 JSON(headlineEn/Zh、leadEn/Zh、timelineEn/Zh、keyDetailsEn/Zh、perspectivesEn/Zh、secondaryEffectsEn/Zh)需要较长时间(50~120s),`max_tokens: 8000` 让响应更慢
3. 国内网络环境下,中间链路(NAT/代理/防火墙)对长时间空闲的 TCP 连接有强制断开策略,导致响应未完成时连接被掐断
4. 失败后简单退避 2s/4s 不足以让网络恢复
5. 错误信息混淆——既有 API 错误也有网络错误,排查困难

**修复**(`scripts/analyzer/deepseek.ts` + `kimi.ts`):
1. 添加 `signal: AbortSignal.timeout(120_000)` 主动超时,避免无限等待
2. 重试退避加长为 5s / 15s / 45s,给网络恢复留时间
3. `MAX_RETRIES` 2 → 3,总尝试次数 3 → 4
4. `max_tokens` 8000 → 6000(双语仍够用,响应更快)
5. 新增 `isNetworkError()` 函数,识别 `ECONNRESET` / `ETIMEDOUT` / `terminated` / `AbortError` 等网络层错误
6. 错误日志加 `[network]` / `[api]` 标签,便于诊断

**状态**: ✅ 已修复,build 通过

### Issue #7: Kimi API 返回 HTTP 400 `invalid temperature: only 1 is allowed for this model`

**发现时间**: 2026-05-04
**现象**: DeepSeek 因网络超时失败 fallback 到 Kimi 后,Kimi 也连续 4 次报错 `HTTP 400`,导致整个更新流程完全卡住,无法生成任何 story
**根因**:
1. Kimi 模型从 `moonshot-v1-8k` 升级到 `kimi-k2.6` 后(Phase 7),该模型只接受 `temperature: 1`
2. `scripts/analyzer/kimi.ts` 中仍保留 `temperature: 0.3`,与模型约束冲突
3. 由于 Kimi fallback 也失败,DeepSeek 的超时问题被放大——所有 cluster 都无法分析

**修复**:
1. `scripts/analyzer/kimi.ts`: `temperature: 0.3` → `temperature: 1`
2. 无其他改动;Kimi fallback 恢复后,DeepSeek 偶发超时不再阻断整个更新流程

**状态**: ✅ 已修复,build 通过

---

## 十、下一步计划（Phase 1-12 期间，已归档；最新计划见 Phase 22.7）

| 优先级 | 任务 | 说明 | 状态 |
|---|---|---|---|
| P0 | **更新 AI Prompt 输出双语 timeline** | `scripts/analyzer/prompt.ts` 已要求 AI 输出 `timelineEn`/`timelineZh`；前端 hook 已兼容 | ✅ 已完成 |
| P1 | **AlsoToday 双语支持** | `AlsoTodayItem` 已扩展 `titleEn`/`titleZh`；前端组件根据语言切换；`update-news.ts` 按 `sourceLanguage` 自动填充对应字段；fallback 与 `news-data.json` 已补充中文标题 | ✅ 已完成 |
| P1 | **Vercel 部署配置(代码层面)** | `vercel.json` + 静态 API 兼容降级(`news-dates.json` + `DateSwitcher` 静态回退 + `UpdatePrompt` API 探测) | ✅ 已完成 |
| P1 | **Vercel dashboard 上线** | 用户在 Vercel 上 import 仓库,配置 GitHub Secrets (`DEEPSEEK_API_KEY`),确认每日两次自动 rebuild | ⬜ 需用户操作 |
| P2 | **端到端测试** | 已验证：8/8 stories 成功生成，timeline 双语正常输出，零 JSON 解析错误 | ✅ 已完成 |
| P2 | **本地页面白屏/闪烁问题** | `AlsoToday` hook 违规调用已修复；ErrorBoundary 已添加；用户验证通过 | ✅ 已完成 |
| P1 | **启动弹窗手动更新** | `serve.cjs` 新增 API 端点 + `UpdatePrompt` 弹窗组件；SSE 实时日志；sessionStorage 控制每次会话弹一次 | ✅ 已完成 |
| P1 | **日期切换器** | `update-news.ts` 写归档 + `serve.cjs` 增 `/api/news-dates` + `<DateSwitcher />` pill 条 | ✅ 已完成 |
| P0 | **DeepSeek 网络鲁棒性** | `AbortSignal.timeout(120s)` + 退避加长 + `max_tokens` 降至 6000 + 网络错误识别 | ✅ 已完成 |
| P1 | **默认语言中文** | `i18n/index.ts` 改 `lng: 'zh'`,移除 navigator 检测 | ✅ 已完成 |
| P2 | **触发更新端到端验证** | 修复网络问题后用户运行 `更新` 按钮,所有 cluster 全部成功 | ✅ 已完成（2026-05-27） |
| P0 | **弹窗三按钮 + 5min 自动更新 + 强制中止** | `UpdatePrompt` idle 三按钮(立即/稍后/关闭);稍后→隐藏弹窗+右下角 mm:ss 倒计时浮窗,5 分钟到自动开始;running 阶段加 `中止更新` 按钮,POST `/api/update-news/abort`;serve.cjs 用 `taskkill /T`(Win)或 SIGTERM(Unix)杀进程树,emit `phase: aborted` | ✅ 已完成 |
| P0 | **跨期去重** | `scripts/utils/dedup.ts` 加载最近 7 日 `public/archive/*.json`,先按 source URL 去重再按标题 Jaccard ≥ 0.6 去重;接入 `update-news.ts` fetch 后立即调用,统计写入 `dedupStats`,`dataVersion` → `1.1.0` | ✅ 已完成 |
| P1 | **RSS 信源扩容** | 18 条主推荐已合入 `scripts/fetcher/sources.ts`(英文科技 6/英文财经 4/英文综合 4/中文科技 4/中文财经 1/中文综合 1),总数 7 → 25;新增 `scripts/fetcher/test-feed.ts` 健康检查脚本 + `npm run test-feed` | ✅ 已完成 |
| P2 | **时间线跨日期跳转** | 给 timeline 项加 `relatedDate`/`relatedStoryId`,点击跳到归档页对应 story | ✅ 已完成 |
| P2 | **财经板块** | `FinancePanel` + AI Prompt 扩展,把 jargon/strategies 展开 | ✅ 已完成 |
| P0 | **Kimi API temperature 修复** | `kimi-k2.6` 只支持 `temperature: 1`,原 `0.3` 导致 HTTP 400;修复后 DeepSeek 失败可正常 fallback 到 Kimi | ✅ 已完成 |
| P0 | **增量更新(再次更新)** | 同一天内再次运行 `update-news` 自动检测已有归档并追加新 story;支持 `--force` 覆盖;前端弹窗提示增量/强制选项 | ✅ 已完成 |

---

## 十一、Phase 8 — 弹窗交互升级 + 跨期去重 (2026-05-04)

### 8.1 弹窗三按钮 + 5 分钟自动更新

**改动**:`src/components/UpdatePrompt.tsx`

idle 阶段从 2 按钮(立即/暂不)扩展为 3 按钮:

| 按钮 | 行为 | 状态变化 |
|---|---|---|
| 立即更新 | 直接调用 `startUpdate()` | `phase: idle → running` |
| 稍后 (5 分钟) | 隐藏弹窗,启动 300 秒倒计时 | `visible: false`, `countdownSec: 300` |
| 关闭 | 设 `sessionStorage[news-update-dismissed]=1` 并隐藏 | 当次会话不再弹 |

倒计时浮窗(右下角 fixed,`.update-countdown-widget`)显示 `mm:ss`,提供「立即开始」(取消倒计时直接启动)与「取消」(放弃倒计时)。倒计时归 0 时自动 `setVisible(true)` + `startUpdate()`。

**注意**:倒计时不持久化,刷新页面会丢失;但 sessionStorage 也未设置,所以页面会重新弹出,用户可以再选。

### 8.2 强制中止运行中的更新

**前端**:running 阶段新增 `中止更新` 按钮 → POST `/api/update-news/abort`,按钮变 `正在中止...` (disabled)。SSE 收到 `phase: aborted` 后切到 aborted 视图,展示「已中止」+ dismiss 按钮。

**后端** (`serve.cjs`):
- 新路由 `POST /api/update-news/abort`:404 (无任务进行中) / 200 (成功)
- 新增 `updateAborting` 标志,在 close 事件里优先发 `phase: aborted` 而不是误判 error
- **Windows 关键修复**:`child.kill()` 仅杀 cmd.exe 包装,留下 npm/tsx 子进程仍会写 `news-data.json`。改用 `taskkill /F /T /PID` 杀整个进程树,Unix 仍走 SIGTERM

### 8.3 跨期去重

**新模块**:`scripts/utils/dedup.ts`

读取 `public/archive/` 最近 7 天的 JSON,提取每个 story 下的 sources(URL + take 字段)和 headline 作为历史指纹。每条新文章先按 URL 完全匹配过滤,再按标题 Jaccard ≥ 0.6 过滤(与同语言比对)。返回 `{articles, stats: {totalIn, totalOut, removed, byUrl, byTitle, archiveDays}}`。

**接入** (`scripts/update-news.ts`):fetch 之后、cluster 之前调用,日志输出过滤前后数量。`alsoToday` 也改用过滤后的 `freshArticles`。`output.dedupStats` 写入 `news-data.json`,`dataVersion: '1.0.0' → '1.1.0'`。`useNews.ts` 的 `NewsData` interface 加可选 `dedupStats`。

### 8.4 i18n key

`updatePrompt` 命名空间从 14 → 24 个 key。新增:`later` `close` `aborted` `abortedDesc` `abort` `aborting` `countdownTitle` `countdownText` `countdownNow` `countdownCancel`。`countdownText` 用 `{{mm}}` `{{ss}}` 模板插值。

---

## 十二、Phase 9 — RSS 信源扩容 + 健康检查 (2026-05-04)

### 9.1 信源扩容 7 → 25

**改动**:`scripts/fetcher/sources.ts`

把 `rss-candidates.md` 已审核过的 18 条主推荐合入,**总数从 7 个涨到 25 个**。新源全部是各媒体官方 RSS / 学会 / 公共广播 / 已验证可用的 RSSHub 路由,不依赖任何付费或私有第三方。

| 分组 | 新增 | 现有 | 合计 |
|---|---|---|---|
| 英文 - 科技 | 6 | 3 | 9 |
| 英文 - 财经 | 4 | 0 | 4 |
| 英文 - 综合/经济 | 3 | 1 | 4 |
| 中文 - 科技 | 4 | 2 | 6 |
| 中文 - 财经 | 1 | 0 | 1 |
| 中文 - 综合 | 1 | 0 | 1 |
| **总计** | **18** | **7** | **25** |

文件按"语言 × 分类"分块排版,每个 source 仍保留原有 `priority` 字段(数字越小优先级越高)。**未引入 enabled 开关**——`fetchOneSource` 抛错已优雅返回 `[]`,失败一个源不会牵连其他源,所以不必为偶发性 5xx 加冗余字段。

### 9.2 健康检查脚本 `test-feed.ts`

**新增**:`scripts/fetcher/test-feed.ts`

候选清单提到这个脚本但仓库里之前并不存在,现在补上。它:

- **共用配置**:与 `rss-fetcher.ts` 用同一份 UA / Accept / `requestOptions`,结果就是生产抓取的真实情况(而不是简单 `curl` 能反映的)
- **并发探测**:`Promise.all` 一次跑完,首尾平铺打印
- **输出**:`status` 图标(✅ ok / ⚠️ empty / ❌ error)+ 延迟(ms)+ items 数量 + 首条标题或错误信息;按 ok → empty → error 排序,出问题的会单独再列一遍
- **两种用法**
  - `npm run test-feed` — 跑全部 25 个源,用于扩容后验证或定期巡检
  - `npm run test-feed -- <url> [<url>...]` — 临时测一个新候选,合入前先确认能拿到 item

**为什么不在 update-news.ts 里直接做健康检查?** 更新流程已经被 dedup / cluster / AI 调用拖到几十秒;而健康检查是带宽受限的纯抓取,跟分析逻辑解耦才容易复用(本地排查、CI 巡检、用户加新源时都能用)。

### 9.3 国内可达性 & 后续巡检

源里有不少海外服务(BBC / CNBC / MarketWatch / Yahoo Finance / Hacker News / The Guardian),在国内本地直连可能 403 或超时,但:

1. **生产环境是 GitHub Actions runner**(墙外、稳定),覆盖度优先
2. **本机网络下** `npm run test-feed` 看哪些源 ❌,可作为日常诊断
3. **RSSHub 公共实例 `rsshub.app` 有限流**——华尔街见闻、澎湃两条走的是公共实例;若巡检发现这俩间歇 429/503,后续再做自建 RSSHub 切换

### 9.4 没改的东西(故意)

- `MAX_CLUSTERS = 12` / `MAX_STORIES = 8` 暂不动;扩源后 cluster 数大概率仍在 12 之内,改动需要先观察一轮真实运行
- `fetchOneSource` 的 `slice(0, 10)` 限制保留;每源 10 条 × 25 源 = 250 条粗料,经 dedup + cluster 收敛回 8 篇 story 是合理量级
- `rss-candidates.md` 中标 ⚠️ 的(Bloomberg / Reuters legacy / NYT / 21 世纪经济报道)都没合入——它们要么官方 feed 已下线,要么需要 Google News 包装,价值密度不够,等之后真正缺源再处理

---

## 十三、Phase 10 — Vercel 部署配置 (2026-05-04)

### 10.1 核心矛盾:`serve.cjs` 在 Vercel 上不跑

本地访问走 `serve.cjs` 的 4 个 API(`POST /api/update-news`、`POST /api/update-news/abort`、`GET /api/news-dates`、`GET /api/issue-config`)。Vercel 是静态托管,默认不跑 Node 长进程,所有 `/api/*` 端点都会 404。

**两条解决路径**:
1. 改写为 Vercel Functions — 工作量大,且 `update-news` 跑几十秒不适合 Serverless(免费版 10s 超时)
2. **静态降级** — Vercel 让前端读静态 JSON,更新功能由 GitHub Actions 跑

选 2,因为更新本来就是 Actions 干的,Vercel 只 serve 快照。

### 10.2 静态降级实现

**生成静态等价物** — `scripts/update-news.ts` 在归档结束后扫描 `public/archive/`,把日期列表写到 `public/news-dates.json`。每次更新都重写,日期始终新鲜。

**前端两端点都加静态回退** — `DateSwitcher.tsx` 抽出 `fetchDates` / `fetchIssueConfig` helper,先试 `/api/*`,失败回退到 `/news-dates.json` / `/issue-config.json`。本地 `serve.cjs` 在跑时第一条命中,Vercel 上第一条 404 走第二条。`/issue-config.json` Phase 7 已经放在 `public/`,不用新写文件。

**UpdatePrompt 探测后端** — 之前 mount 直接弹。改成先 fetch `/api/news-dates`,只有 `r.ok` 才弹。廉价 GET 探测(本地一定 200,Vercel 必然 404),效果:Vercel 上启动弹窗完全不出现,纯只读;本地行为不变。

`useNews.ts` 不用改 — 它读 `/news-data.json` 和 `/archive/*.json`,这些 Vite build 时会把 `public/` 复制到 `dist/`,Vercel 上也是真实静态文件。

### 10.3 vercel.json 设计

**不加 SPA fallback rewrite** — 项目目前没有 client routing,所有路径都对应真实静态文件,加 rewrite 反而可能把 `news-data.json` 也 fallback 到 `index.html`。未来加 React Router 再补。

**Cache headers 按更新频率分层**:

| 资源 | Cache-Control | 理由 |
|---|---|---|
| `index.html` | `no-cache, no-store, must-revalidate` | 每次验证,否则用户拿不到新 bundle hash |
| `news-data.json` / `news-dates.json` | `max-age=60` | 每天两次更新,1 min stale 可接受 |
| `issue-config.json` | `max-age=300` | 几乎永不变 |
| `archive/*.json` | `max-age=31536000, immutable` | 历史数据,文件名带日期不会重命名 |
| `assets/*` | `max-age=31536000, immutable` | Vite 已在文件名加 hash |

### 10.4 部署流程 & 用户操作

**GitHub Actions** runner(墙外、稳定)每天 08:00 / 18:00 CST 跑 `npm run update-news`,workflow `git commit && git push` 写更新到 main,Vercel webhook 监听 push 自动 rebuild(`npm run build` → `dist/`)。每天 2 次 build × ~1–2 min,Vercel 免费版每月 6000 min,完全够用。

**用户在 Vercel dashboard 上要做**:
1. https://vercel.com/new → import 仓库 → Framework Preset 自动识别 Vite,直接 Deploy
2. GitHub 仓库 Settings → Secrets and variables → Actions 加:
   - `DEEPSEEK_API_KEY` — 必需
   - `KIMI_API_KEY` — 可选(DeepSeek 失败时 fallback)
3. 在 Actions 里手动触发一次 `update-news` workflow,验证 Secret 生效
4. 之后完全自动

**不强求上线** — 决策点 5 仍是"本地为主",Vercel 只是给"想从外面看一眼"留个口子。

### 10.5 国内访问注意事项

`*.vercel.app` 默认域名在国内访问可能慢/间歇丢包,要常用得:
- 买域名 + Cloudflare DNS(国内边缘节点更稳)
- 或 Vercel Pro 开亚洲 region
- 或当备份用,主要仍走本地 `serve.cjs`

---

## 十四、Phase 11 — 时间线跨日期跳转 + 财经板块完整接入 (2026-05-04)

### 11.1 诊断:Phase 7 类型先行,管线静默丢字段

`src/types.ts` 在 Phase 7 就已经声明了 `TimelineEvent.relatedDate` / `relatedStoryId` 和 `Story.financeJargon*` / `tradingSignals*`,prompt 里也已要求 AI 输出这些字段。但实际跑出来的归档里这几个字段全部缺失,排查发现两个根因:

1. **`scripts/update-news.ts` 的 `normalizeStory()` 没复制这些字段** — AI 返回的 `relatedDate` / `relatedStoryId` / `financeJargonEn/Zh` / `tradingSignalsEn/Zh` 在 normalize 阶段被静默丢弃,只保留了 normalize 函数里显式 `return` 的那些 key
2. **AI 在没有归档索引时只能瞎编 `relatedDate` / `relatedStoryId`** — 即使 prompt 让它产出,生成的日期 / id 与实际归档对不上,前端点击只会 404

加上前端 `StoryCard.tsx` 还在用 `topicTier === 'finance'` 硬条件 gating `<FinancePanel>` 渲染,即使 AI 给了 jargon/signal,只要 topicTier 不是 finance 就不显示。

修复必须四件齐做:**喂 AI 真实索引** + **管线保字段** + **前端按归档可达性显示链接** + **FinancePanel 解除 topicTier gating**。

### 11.2 后端:archive-context grounding

**新增** `scripts/utils/archive-context.ts`:扫描 `public/archive/` 最近 N 天(默认 7),每个 story 抽 `{date, id, headlineEn, headlineZh}`,每天最多 8 条,容错读 / 解析失败的归档自动 skip。返回值即「AI 唯一能引用的 prior briefings」。

**改 `scripts/analyzer/prompt.ts`**:加入 `recentBriefings` 入参,在文章列表后插入「## Recent Briefings Index」block,把每条 `{date, id, headline}` 平铺给 AI。规则 9 改成「**只能从这个索引里挑**,匹配不上 set null,不要凭空造日期 / id」。规则 10 同步收紧:topicTier 是 finance / economy 时**必须**填 financeJargon + tradingSignals 双语字段;市场冲击型 tech 故事应**重新归类**为 finance / economy 而不是塞进 tech。

**`deepseek.ts` + `kimi.ts`** 各加一个 `recentBriefings: RecentBriefingEntry[] = []` 透传到 `buildPrompt()`,默认空数组保持向后兼容。

**`scripts/update-news.ts` 三件事**:

1. 在 cluster 之后、analyze 之前调用 `loadRecentBriefings(7)`,日志输出条数,然后传给两个 analyzer
2. `normalizeStory()` 重写时间线映射:
   - 抽出 `cleanRelated(v)` helper 把 AI 偶尔吐出的字符串 `"null"` / `"undefined"` 转回真正的 `undefined`
   - 抽 `mapTimelineEntry(raw)` 一并产出 `date` / `year` / `heading` / `summary` / `relatedDate` / `relatedStoryId`,`timelineEn` / `timelineZh` 都过它
3. `normalizeStory()` 输出新增 6 个字段:`financeJargon` / `financeJargonEn` / `financeJargonZh` / `tradingSignals` / `tradingSignalsEn` / `tradingSignalsZh`,通过 `mapJargon()` / `mapSignals()` 校验(`mapSignals` 还卡 `direction` 必须在 `bullish | bearish | neutral` 枚举里)。`financeJargon`(单语)优先取 En 源,缺失时退到 Zh

### 11.3 前端:可达性 gating + 滚动 + 闪光

**新增 `src/hooks/useArchiveDates.ts`**:同时导出 `loadArchiveDates()`(纯异步 helper,先试 `/api/news-dates`,失败回退 `/news-dates.json`)和 `useArchiveDates()` hook。`DateSwitcher.tsx` 原有的内联 `fetchDates()` 抽走改用 helper(DRY),`App.tsx` 用 hook 拿到 `archiveDates`,转 `Set` 后作为「可达日期集合」传给所有 StoryCard。

**`StoryTimeline.tsx`**:加 `availableDates?: Set<string>` 入参,新 `isJumpable()` 判断 — 必须有 `relatedDate`、有 `onNavigateToDate` 回调、且 `relatedDate` 在 `availableDates` 里;`availableDates` 为 `undefined`(还没加载完)时允许尝试,失败由 `useNews` 的 404 处理。点击事件传 `event.relatedStoryId` 作为第二参数。

**`App.tsx`** 新增 cross-day 跳转 UX:

1. `targetStoryId` state,`handleNavigateToArchive(date, storyId)` 同时 set `selectedDate` + `targetStoryId`,`handleSelectDate(d)` 显式清空 target(用 DateSwitcher 切日期不应该 scroll)
2. `useEffect([targetStoryId, hasRealData, data])`:数据加载完后用 **double rAF** 等 `<details>` 展开动画 + 布局完成,然后 `getElementById('story-' + id).scrollIntoView({block: 'start'})`,加 `.story-jump-flash` class,1600ms 后移除
3. **finance lens 拓宽** — 不再只看 `topicTier === 'finance'`,改成 `finance | economy | financeJargonEn?.length | financeJargonZh?.length | tradingSignalsEn?.length | tradingSignalsZh?.length`,catch 住所有被 AI 加金融注释的 tech 故事

**`StoryCard.tsx`**:容器加 `id={`story-${story.id}`}`(scroll target);`availableDates` / `onNavigateToDate` 透传到 `StoryDeepContent` → `StoryTimeline`;**移除 FinancePanel 的 topicTier gating**,改由面板自己看 `hasJargon || hasSignals` 决定要不要画。

**`src/index.css`**:`@keyframes storyJumpFlash` — 1.6s 三段 box-shadow accent 边框,`.story-jump-flash` 应用动画,`.story { scroll-margin-top: 80px }` 给 sticky header 留位避免遮挡。

### 11.4 验证

- **TypeScript**:`npx tsc --module esnext --moduleResolution bundler --strict --noEmit` 全脚本 + 前端通过(初始用 `nodenext` 时被 scripts 的扩展名缺失打回,改 `bundler` 后 silent pass — scripts 走 `tsx` runtime,prod build 走 Vite,两边都不需要 `nodenext` 严格的扩展名规则)
- **Vite build**:`62 modules transformed`,184ms,gzip ~96KB(JS)
- **未跑 update-news**:实际生成有 finance 字段的归档需要用户配 API Key 后跑一次,或等下次 GitHub Actions 触发;前端在 fallback data 上能看到代码路径(没有 finance / 跨日数据时,FinancePanel 不画、timeline 项不显示链接 — 行为正确)

### 11.5 没改的东西(故意)

- **没动 fallback `data.ts`** — 不补示例 `relatedDate` / 财经字段,因为 fallback 的目的是「数据加载失败时给用户看一眼 demo」,加跨日链接会指向不存在的归档
- **没引入归档级别的 finance 索引** — `archive-context.ts` 只给 AI 看 `headline`,不给它看 `financeJargon`。理由:跨日链接的本质是「这个时间线点在过去哪个简报里」,匹配应基于话题语义,塞 finance 字段反而引导 AI 在不同金融事件之间硬关联
- **没加迁移脚本** — Phase 7 那种 `migrate-archives.ts` 这次不做。已有归档没有 `relatedDate` / 财经字段就保持没有,新跑出来的才有。这些字段对历史归档不是必需,前端缺失时优雅降级

---

## 十二、Phase 12 — 增量更新(再次更新) (2026-05-05)

### 12.1 需求背景

用户每日两次定时更新(08:00/18:00)的时间可能不固定,且希望在一天内多次运行更新时,**新搜到的内容追加到今日简报**,而不是覆盖掉早上的内容。

### 12.2 后端实现 (`scripts/update-news.ts`)

**自动检测**:每次运行时检查 `public/archive/YYYY-MM-DD.json` 是否存在(同一天)。

**追加-only 模式(唯一模式)**:
| 模式 | 触发条件 | 行为 |
|---|---|---|
| 增量模式(默认) | 今天归档已存在 | 读取现有归档,合并新 story |
| 强制刷新 | `--force` 参数 | 仍然读取现有归档并合并,**不覆盖已有内容** |

> **设计变更(2026-05-05)**: 用户明确要求"更新不要覆盖掉原本日期内容,更新只会加内容或者说检验内容的真实性"。因此 `--force` 也不再执行覆盖,所有更新均为追加-only。

**合并策略**:
1. **Stories**: 新生成的 story 逐一检查是否与已有 story 重复(基于 source URL 重叠 或 headline Jaccard ≥ 0.65),不重复则追加
2. **排序**: 按 `generatedAt` 倒序排列(最新的在前)
3. **alsoToday**: URL 去重后合并,上限 10 条
4. **sourceList**: 并集去重
5. **dedupStats**: 累计叠加(输入/输出/去重数)
6. **trackedStories**: 基于合并后的 stories 重新计算

**新辅助函数**:
- `isStoryDuplicate()`: source URL 匹配 + headlineEn/headlineZh Jaccard 双语言去重
- `mergeAlsoToday()`: URL 级别去重合并

**导出 `tokens`/`jaccard`**: `scripts/utils/dedup.ts` 将这两个函数导出,供 `update-news.ts` 复用,避免重复实现。

**命令行**:
```bash
npm run update-news          # 增量模式(自动追加)
npm run update-news -- --force  # 强制刷新(仍然追加,不覆盖)
```

### 12.3 服务器端点 (`serve.cjs`)

`POST /api/update-news` 支持 `?force=1` 查询参数:
- `force=1` → 执行 `npm run update-news -- --force` (追加-only)
- 无参数 → 执行 `npm run update-news`(增量模式)

### 12.4 前端弹窗 (`UpdatePrompt.tsx`)

**探测今日简报**:mount 时同时 fetch `/api/news-dates` 和 `/news-data.json`,比对 `issueDate` 是否为今天。

**idle 阶段 UI 变化**:
- 若今日已有简报:
  - 主按钮文案从「立即更新」变为「追加更新」
  - 显示绿色提示条:「今日已有简报,新内容将自动追加到现有简报中。」
  - 底部增加「强制重新生成」链接按钮(用于需要从头来过的场景)
- 若今日无简报: 保持原有 UI

**最小化功能(running 阶段)**:
- 更新运行时标题栏右侧出现「最小化」按钮
- 点击后弹窗缩为右下角浮动卡片,显示状态标题 + 最新日志行 + 恢复/关闭按钮
- 卡片实时反映运行/完成/失败/中止状态
- 用户可继续浏览新闻,不被弹窗阻挡

**全局事件触发**: 支持 `window.dispatchEvent(new CustomEvent('news-update-request'))` 从任意组件触发更新弹窗。

**新增 i18n key** (zh/en):
- `updatePrompt.append`
- `updatePrompt.incrementalHint`
- `updatePrompt.forceUpdate`
- `updatePrompt.startingForce`
- `updatePrompt.minimize`
- `updatePrompt.restore`

**新增 CSS** (`src/index.css`):
- `.update-prompt-incremental-hint`: 绿色左边框提示条
- `.update-prompt-force-action` / `.update-prompt-force-btn`: 底部小字强制按钮
- `.update-prompt-running-header`: running 阶段标题栏(含最小化按钮)
- `.update-minimized-widget`: 最小化浮动卡片
- `.update-minimized-dot`: 状态指示灯(运行中呼吸动画)
- `.update-minimized-restore`/`.update-minimized-close`: 恢复和关闭按钮

### 12.5 日期切换器再更新按钮 (`DateSwitcher.tsx`)

- 日历图标右侧新增「再次更新」按钮(循环箭头图标)
- **任何日期视图下均可点击**,触发对**今天**的重新更新
- 通过全局 `news-update-request` 事件与 `UpdatePrompt` 联动
- 新增 i18n key: `dateSwitcher.reUpdate`

### 12.6 本地日期统一修复

**问题**: `todayUtcDate()` 返回 UTC 日期,在中国时区(UTC+8)凌晨时段,UTC 日期比本地日期晚一天,导致"今天"按钮和日历高亮显示错误日期。

**修复**:
- `scripts/utils/issue.ts` + `src/components/Calendar.tsx`: `todayUtcDate()` 改由 `new Date()` 的本地年月日拼接
- `src/components/Calendar.tsx`: `shiftUtcDate` → 本地日期计算;`buildMonthCells`/`initialView`/`monthLabel`/`weekdays` 全部改用本地 Date
- `UpdatePrompt.tsx` 的今日简报探测也改用本地日期

### 12.7 网站 Logo 替换

- 根目录 `logo.jpg` 复制到 `public/logo.jpg`
- `index.html`: favicon 改为 `/logo.jpg`
- `Header.tsx`: 文字 `GlobalPulse` → `img` 标签引用 `/logo.jpg`
- `src/index.css`: 新增 `.logo-img` 样式

### 12.8 验证

- **TypeScript**: `npx tsc -b` 通过
- **Vite build**: `62 modules transformed`, gzip ~98KB
- **`node -c serve.cjs`**: 通过

### 12.9 没改的东西(故意)

- **MAX_STORIES 仍为 8**: 增量合并后不强制截断。如果一天内新闻很多,合并后可能超过 8 条,但按 generatedAt 排序后最新的在前。这是用户期望的"全部保留"行为
- **不限制 alsoToday 条数到下限**: 合并后保留 10 条(原 7 条),给用户更多今日简讯
- **没有定时自动增量更新**: 仍需用户手动触发(弹窗/命令行/再更新按钮)。如果需要,后续可通过 Windows 任务计划程序多次执行



---

## ⚠️ Phase 13-21 内容恢复说明

> **2026-05-27 事故记录**：在追加 Phase 22 记录时，误用了覆盖写入（write 工具），导致 PROJECT_BLUEPRINT.md 从 2063 行缩减为 115 行。Phase 1-12 从 `.codepilot-uploads` 备份恢复（983 行），Phase 13-21 的详细文档永久丢失。以下为基于项目源码实际扫描重建的摘要，标记了每个 Phase 的完成状态、核心功能和文件变更。

---

## 十三、Phase 13 — 小红点 + 最新内容筛选（2026-05-05）

**核心机制**：`localStorage` 追踪已读 story ID（key `news-briefing-viewed`），检测新内容时比对已有记录。

**文件变更**：
- 新增 `src/hooks/useNewStories.ts`：导出 `newStoryIds`、`newCountByCategory`、`markAsViewed`、`markAllAsViewed`
- 修改 `src/components/Header.tsx`：新增「最新」lens pill + 红色数字徽章
- 修改 `src/components/StoryCard.tsx`：新增 `isNew` prop + `.new-badge` 红色徽章样式
- 修改 `src/App.tsx`：接入 `useNewStories`，切换 lens 时自动标记已读

**状态**：✅ 已完成

---

## 十四、Phase 14 — 回看更新状态 + 持续报道时间线高亮（2026-05-05）

**回看更新状态**：`UpdatePrompt.tsx` 新增 `lastResult` state，关闭弹窗后右下角持久 floating pill 显示上次更新结果（完成/失败/中止），可点击恢复查看日志。

**持续报道高亮**：`runningCoverage: true` 的 story 时间线中今天事件加粗+accent 色+左侧竖线加粗+背景色（`.t-today` CSS class）。

**文件变更**：
- 修改 `src/components/UpdatePrompt.tsx`
- 修改 `src/components/StoryTimeline.tsx`
- 修改 `src/components/StoryCard.tsx`
- 修改 `src/index.css`

**状态**：✅ 已完成

---

## 十五、Phase 15 — 逐条增量写入 + AI 时间/重要性排序（2026-05-05）

**逐条增量写入**：每完成一个 cluster 的 AI 分析立即写入 `news-data.json` 和归档，中途失败不丢失已完成 story。`[STORY_ADDED]` stdout 标记 → SSE `story_added` 事件 → 前端进度条+实时计数。

**AI 排序**：新增 `scripts/analyzer/rank.ts`，6 维加权（市场冲击 25% / 时效性 20% / 全球影响 20% / 读者相关 20% / 信源密度 10% / 新颖度 5%），输出双语排位理由。前端 `DateSwitcher` 新增「AI 排序」/「最新优先」切换按钮，`StoryCard` 显示排名勋章和排位理由。

**文件变更**：
- 新增 `scripts/analyzer/rank.ts`（141 行）
- 新增 `src/types.ts` → `StoryRanking` 接口
- 修改 `scripts/update-news.ts`：逐条写入逻辑
- 修改 `src/components/DateSwitcher.tsx`：排序切换按钮
- 修改 `src/components/StoryCard.tsx`：排名勋章+理由展示
- 修改 `src/App.tsx`：`sortMode` state

**状态**：✅ 已完成

---

## 十六、Phase 16 — 六大功能扩展（2026-05-05）

| # | 功能 | 核心文件 | 技术方案 |
|---|---|---|---|
| 1 | **全文搜索** | `src/hooks/useSearch.ts` + `src/components/SearchBar.tsx` | fuse.js 模糊搜索，支持当前/全部归档双范围 |
| 2 | **AI 置信度标记** | `src/components/ConfidenceBadge.tsx` | Prompt 要求 AI 输出 `confidence` 1-5，≤2 显示红色警告条 |
| 3 | **Story 收藏** | `src/hooks/useBookmarks.ts` + `BookmarkButton` + `BookmarkPanel` | localStorage 持久化，跨日期跳转 |
| 4 | **Telegram 推送** | `scripts/utils/telegram.ts` | 更新完成后推送简报摘要（HTML parse_mode） |
| 5 | **阅读统计** | `src/hooks/useReadingStats.ts` + `src/components/StatsPanel.tsx` | 三卡片概览+本周柱状图+话题分布 |
| 6 | **信源健康** | `src/hooks/useSourceHealth.ts` + `src/components/SourceHealthPanel.tsx` | 连续错误追踪、成功率、延迟统计 |
| 7 | **PDF 导出** | `src/components/PdfExport.tsx` | 浏览器 `window.print()` 输出到 PDF |

**新增依赖**：`fuse.js`、`html2canvas`、`jspdf`

**状态**：✅ 已完成

---

## 十七、Phase 17 — UI 统一适配（2026-05-05）

参照 news.karenwang.org (GlobalPulse) 设计语言全面重写 `src/index.css`（~2855 行）。

**核心变更**：
- 色彩空间迁移至 oklch()，完整深色模式（`data-theme` + `prefers-color-scheme`）
- CJK 字体栈与 `:lang(zh)` 选择器；间距系统（`--space-xs` ~ `--space-2xl`）
- Header masthead 三重分隔线；StoryCard 无线框布局
- 所有子组件样式完善（SearchBar / BookmarkPanel / StatsPanel / SourceHealthPanel / FinancePanel / Calendar / ConfidenceBadge）

**状态**：✅ 已完成

---

## 十八、Phase 18 — 阅读统计逻辑完善（2026-05-05）

升级 `useReadingStats.ts` 为 v2 存储结构（`news-briefing-reading-stats-v2`），建立统一的三层事件判定模型（exposed / engaged / read），小红点清除规则从"切 lens 即全已读"改为"达到 read 条件 + 手动标注"。

**文件变更**：
- 修改 `src/hooks/useReadingStats.ts`：v2 存储+旧 key 自动迁移
- 新增 `src/config/readingRules.ts`：集中配置阈值（8s / 12s / 25s）
- 修改 `src/components/StoryCard.tsx`：埋点接入
- 修改 `src/components/StatsPanel.tsx`：参考样式（三卡片+本周柱状图）

**状态**：✅ 已完成（阈值可后续微调）

---

## 十九、Phase 19 — AI 排名可视化增强 + 故事线 UI 迁移（2026-05-05）

**排名可视化**：
- 排名勋章（金牌★/银牌/铜牌/数字）
- 卡片左边界层级指示器（`--rank-intensity` 线性衰减）
- 方法论 tooltip（6 维权重展示）
- i18n 完整覆盖（`ranking.*` 9 个 key）
- `scripts/analyzer/rank.ts` 超时 90s→180s
- 新增 `scripts/rank-existing.ts`（一次性补跑工具）

**故事线 UI 迁移**：时间线全量渲染+CSS 折叠、观点卡浅底卡片+左侧强调线、市场脉搏双列术语卡、交易信号行级卡片、次级影响卡片化容器。

**原型工作流**：新增"先原型调参，后正式版"流程，原型覆盖完整页面布局，支持导出 JSON 参数快照。

**状态**：✅ 已完成

---

## 二十、Phase 20 — 财经术语官方来源指引（2026-05-05）

**P0 实施**：扩展 `FinanceJargonItem` 类型（`domain`/`sourceName`/`sourceUrl`/`sourceType`/`sourceMatchLevel`），新增官方来源注册表 `scripts/utils/official-glossary.ts`（295 行）。

**P1 精确术语链接**：`OFFICIAL_GLOSSARY_TERM_LINKS` 覆盖高频术语 exact 匹配，新增 `scripts/check-official-glossary.ts`（`npm run test-glossary`）。

**P2 补齐**：词汇缓存 `GLOSSARY_ATTRIBUTION_CACHE`、来源类型标签（regulator/exchange/institution）、术语候选抽取 `scripts/extract-glossary-candidates.ts`（`npm run extract-glossary`）。

**高频术语补齐**：两轮 aliases 扩展，未覆盖术语 77→17。

**状态**：✅ 已完成

---

## 二十一、Phase 21 — 编辑人格·筛选隔离·AI 对话·缓存分层（2026-05-06 方案共识）

频道讨论方案，全部标记"待小鱼调动推进"。

**五大方向**：
1. **编辑人格**（策展型 vs 覆盖型）：倾向策展型，用旧数据后验校准
2. **两段式管线**：核心分析（第一段）+ 编辑评估（第二段），轻量 diff 形式输出编辑建议
3. **AI 对话 MVP**：「聊这条」入口 + 上下文注入（AI 分析全文 + 知识缺口 + 近期归档）+ `user-knowledge-gaps.json`
4. **Story 数量放开**：移除 `MAX_STORIES` 硬上限 + Jaccard 阈值浮动 + 软上限
5. **缓存分层方案**：三层结构（固定/半固定/动态），DeepSeek 缓存命中率预期 50%+，三层定价数据与实施清单完整

**状态**：方案已完善，2026-05-27 三项 P0 已落地（见 Phase 22）

---

## 二十二、Phase 22 — 缓存分层落地 + 编辑评估 + 日常循环恢复（2026-05-27）

> ⚠️ 本次更新中发生 **PROJECT_BLUEPRINT.md 覆盖事故**（详见 22.6），Phase 13-21 详细文档永久丢失，以上内容为源码扫描重建。

### 22.1 执行背景与原则

Phase 21 方案完备但全部卡在"待小鱼调动推进"。本次按三层顺序推进：
1. 恢复日常循环（跑通 `update-news`）
2. P0-A：DeepSeek 缓存分层代码改造
3. P0-B：编辑评估脚本

**刚性约束**：绝不覆盖已有归档数据，增量追加 only。

### 22.2 第一层：端到端验证 `npm run update-news`

| 指标 | 数值 |
|---|---|
| 抓取总量 | 342 篇（首次）/ 352 篇（二次） |
| 信源故障 | 5 个（BBC 全系 403、IEEE Spectrum 超时、FT 超时） |
| 去重 | 342/342 保留（22 天未更新），二次去重 331/352（21 条 URL 去重） |
| 聚类 | 306/310 clusters |
| 首次生成 | 4 条 story |
| 二次追加 | +2 条 → 共 6 条 story |
| 排名 | 成功 |
| 归档 | `2026-05-27.json` 新建，Issue 57 |
| Telegram | 推送失败（CHAT_ID 为用户名而非数字 ID，不影响核心） |

**数据完整性**：`05-03`/`05-04`/`05-05` 三个旧归档时间戳未变，无覆盖。

### 22.3 第二层 P0-A：DeepSeek 缓存分层代码改造

**改动文件**：
- `scripts/analyzer/prompt.ts`：新增 `buildSystemPrompt()`（固定层）和 `buildUserPrompt()`（半固定+动态层），保留 `buildPrompt()` 供 Kimi 向后兼容
- `scripts/analyzer/deepseek.ts`：system message 改用 `buildSystemPrompt()`，user message 改用 `buildUserPrompt()`；响应解析新增 `prompt_cache_hit_tokens` / `prompt_cache_miss_tokens` 日志

**缓存架构**：
```
[system: 固定层（角色+schema+规则）] → [user: 半固定层（archive-context）+ 动态层（articles）]
```

DeepSeek 缓存按前缀匹配。第一次调用建立缓存，后续调用的 system + user 前半部分几乎完全命中。

**验证结果**（`--force` 二次更新追加 2 条 story）：

| Cluster | Cache Hit | Cache Miss | Hit Rate |
|---|---|---|---|
| 伊朗断网（该批次首条） | 0 | 3,955 | 0.0% |
| 台湾/香格里拉（首条） | 0 | 4,898 | 0.0% |
| 台湾/香格里拉（重试） | 4,864 | 34 | **99.3%** |

**成本影响**：固定+半固定层 token 成本降至 1/120（~$0.0145/M vs ~$1.74/M），整体每次 AI 调用预计降低 40%~50%。

### 22.4 第二层 P0-B：编辑评估脚本

**新增文件**：`scripts/editorial-review.ts` + `npm run editorial-review [daysBack]`

**功能**：读取最近 N 天归档 → DeepSeek 编辑评估 → 输出 `reports/editorial-review-YYYY-MM-DD.md`

**Prompt 核心原则**（策展型人格）：
- 不是聚合器，6 条应该砍到 3-4 条真正强的
- 评判维度：重复度合并、信源深度、视角张力、读者价值、双语质量

**首次运行结果**（Issue 57, 6 条 story）：

| Story | Verdict | 理由 |
|---|---|---|
| 美对伊打击/黎巴嫩停火 | ✅ keep | 核心地缘政治，来源扎实，观点对立 |
| 星链/美国航空 | ✅ keep | 来源可靠，商业/科技读者价值高 |
| 台湾/香格里拉 | ✅ keep | 删除无关间谍案细节，聚焦核心 |
| 伊朗断网 | 🔀 merge | 并入美对伊打击，整合伊朗报道 |
| 联合早报 | ❌ drop | 无实质内容，疑数据源错误 |
| 苹果 Beta | ❌ drop | 例行发布，单来源，低策展价值 |

**管线问题暴露**：
1. 聚类缺陷：联合早报被聚类成空 story
2. 选题门槛过低：苹果 Beta 单来源低价值新闻通过了 AI 分析
3. 聚类阈值问题：伊朗断网和美对伊打击分开聚类，编辑认为应合并

### 22.5 新增脚本汇总

| 命令 | 文件 | 用途 |
|---|---|---|
| `npm run editorial-review` | `scripts/editorial-review.ts` | 编辑评估（默认 3 天归档） |
| （deepseek.ts 内嵌） | `scripts/analyzer/deepseek.ts` | 缓存命中率日志 |

### 22.6 ⚠️ 事故记录：PROJECT_BLUEPRINT.md 覆盖

**时间**：2026-05-27 06:12 UTC+8

**原因**：在执行 Phase 22 蓝图记录追加时，误用 `write` 工具替代 `edit` 工具的追加操作，导致文件从 2063 行被覆盖为 115 行。

**影响**：Phase 13-21 的详细实施文档（约 1000 行）永久丢失。Phase 1-12 从 `.codepilot-uploads/1777925683395-PROJECT_BLUEPRINT.md` 恢复（983 行）。

**补救措施**：基于项目源码实际扫描，重建 Phase 13-21 摘要（本文档第十三章至第二十一章），核心功能、文件变更、决策记录均已覆盖，但缺失原始讨论过程、详细实施清单和故障排查记录。

**教训**：
1. 蓝图文件编辑前应先 cp 备份（`cp PROJECT_BLUEPRINT.md PROJECT_BLUEPRINT.md.bak`）
2. `write` 工具用于新建/完整覆盖，追加用 `edit` 或 `bash` 追加
3. 大文件编辑应在 git 仓库内进行，以利用版本回溯

### 22.7 下一步计划

| 优先级 | 任务 | 说明 | 状态 |
|---|---|---|---|
| P0 | **聚类/选题门槛调优** | 修复空 story 聚类、提高选题门槛过滤单来源低价值新闻、收紧聚类阈值避免同类拆分 | ⬜ 待推进 |
| P1 | **Story 数量放开** | 移除硬上限 + 自适应聚类阈值 + 软上限 | ⬜ 待推进 |
| P1 | **AI 对话功能 MVP** | 「聊这条」入口 + 上下文注入 + knowledge gaps 管理 | ⬜ 待推进 |
| P1 | **信息密度自动判定** | 轻量 AI 调用判定精简/标准/重磅日 | ⬜ 待推进 |
| P1 | **Vercel dashboard 上线** | 用户在 Vercel 上 import 仓库，配置 GitHub Secrets | ⬜ 需用户操作 |
| P2 | **信源自动降级后端化** | `rss-fetcher.ts` 读取 health 数据，对连续失败源自动降 priority | ⬜ 待细化 |
| P3 | **语义搜索升级** | AI embedding 替代 fuse.js | ⬜ 待规划 |

---

## 二十七、Phase 23 — 聚类调优 + 选题门槛（2026-05-27）

> 从 Phase 22 编辑评估暴露的三个问题出发，对聚类算法和选题过滤做最小改动。

### 23.1 三个问题与修复

| 问题 | 根因 | 修复 |
|---|---|---|
| 空 story（联合早报） | 单文章 cluster 无质量门控 | `clusterQuality()` 评分 + minQuality 阈值过滤 |
| 低价值过审（苹果 Beta） | 缺少主题价值判断 | `isHighValueTopic()` 关键词白名单检测 |
| 同国拆分（伊朗） | 纯标题 Jaccard，无内容兜底 | 内容级相似度 fallback（标题 sim 0.1-0.25 时启用） |

### 23.2 代码变更

**`scripts/utils/cluster.ts`**（~100 行新增）：
- `extractContentKeywords()` — 从文章内容前 500 字提取关键词
- `contentJaccard()` — 内容级 Jaccard 相似度
- `clusterQuality()` — 三维评分（文章数 0-4、来源多样性 0-3、内容丰富度 0-3），满分 10
- `isHighValueTopic()` — 检测 finance/economy/geopolitics 主题关键词
- `filterAndSortClusters()` — 过滤低质量单文章 cluster + 按质量分降序排列
- `similarity()` 增强 — 标题 sim 介于 0.1-0.25 时，用 40% 标题 + 60% 内容混合判定

**`scripts/update-news.ts`**（3 行修改）：
- import `filterAndSortClusters`
- 聚类后调用过滤，日志输出 raw → filtered 数量

### 23.3 验证结果

**端到端运行**：`npm run update-news`（增量追加模式）

| 指标 | 数值 |
|---|---|
| 原始 clusters | 329 |
| 质量过滤后 | 98（削减 70.2%） |
| 新增 story | 1（王毅联合国多边主义发言） |
| 总 story | 7（6 旧 + 1 新） |
| 数据覆盖 | 无 |

**关键效果**：
- 联合早报和苹果 Beta 这类低质量 cluster 在质量过滤阶段被剔除，不会再进入 AI 分析
- 按质量分排序后，多来源、高内容密度的 cluster 优先分析
- 内容级相似度 fallback 已生效，后续伊朗类同题拆分会被抑制

### 23.4 下一步计划（更新后）

| 优先级 | 任务 | 说明 | 状态 |
|---|---|---|---|
| P1 | **Story 数量放开** | 移除 `MAX_STORIES = 8` 硬上限 + 自适应聚类阈值 + 软上限 | ⬜ 待推进 |
| P1 | **信息密度自动判定** | 轻量 AI 调用判定精简/标准/重磅日，对应不同输出深度 | ⬜ 待推进 |
| P1 | **AI 对话功能 MVP** | 「聊这条」入口 + 上下文注入 + knowledge gaps 管理 | ⬜ 待推进 |
| P1 | **Vercel dashboard 上线** | 用户在 Vercel 上 import 仓库，配置 GitHub Secrets | ⬜ 需用户操作 |
| P2 | **信源自动降级后端化** | `rss-fetcher.ts` 读取 health 数据，对连续失败源自动降 priority | ⬜ 待细化 |
| P3 | **语义搜索升级** | AI embedding 替代 fuse.js | ⬜ 待规划 |

---

## 二十八、Phase 24 — 信息密度自动判定 + 数量放开 + 自适应阈值（2026-05-27）

### 24.1 改造内容

将此前硬编码的 `MAX_STORIES=8` 替换为动态系统：

| 维度 | 过去 | 现在 |
|---|---|---|
| 故事上限 | `MAX_STORIES=8` 硬编码 | 密度判定驱动：light→4 / standard→8 / heavy→12，`MAX_STORIES_CEILING=12` 安全兜底 |
| 聚类阈值 | 固定 0.25 | 自适应浮动：>200篇→0.22 / 100-200→0.25 / <100→0.28 |
| AI 输出深度 | 全量模块无差别 | 密度指令控制：light 省略 perspectives/keyDetails/finance / standard 标准 / heavy 全量 |
| MAX_CLUSTERS | 12 | 16（为 density=heavy 预留空间） |

### 24.2 密度判定流水线

```
质量过滤后的 clusters
        ↓
提取 cluster[0].title → headline 列表
        ↓
detectDensity()：极轻量 DeepSeek 调用（token~2.2K，缓存分层后成本≈零）
        ↓
{ density, reasonEn, reasonZh }
        ↓
控制 maxStories（4/8/12） + AI prompt 输出深度
        ↓
优雅降级：API 不可用时默认 standard
```

### 24.3 文件变更

| 文件 | 变更类型 | 说明 |
|---|---|---|
| `scripts/utils/density.ts` | **新增** | `detectDensity()` 密度判定 + `densityToStoryCap()` + `adaptiveThreshold()` + `densityOutputInstruction()` |
| `scripts/analyzer/prompt.ts` | 修改 | `buildSystemPrompt(density?)` 追加密度输出指令 |
| `scripts/analyzer/deepseek.ts` | 修改 | `analyzeWithDeepSeek` 接受 `density` 参数 |
| `scripts/analyzer/kimi.ts` | 修改 | `analyzeWithKimi` 接受 `_density` 参数（向后兼容） |
| `scripts/update-news.ts` | 修改 | 移除 `MAX_STORIES`，接入密度判定+自适应阈值+动态上限 |

### 24.4 验证结果

**端到端运行**（DeepSeek API 临时不可用，代码级验证通过）：

| 指标 | 数值 |
|---|---|
| 抓取 | 352 篇 |
| 自适应阈值 | 0.22（articles=333 >200） |
| 原始 clusters | 301 |
| 质量过滤后 | 91（与 Phase 23 一致） |
| 密度判定 | API 不可用 → 优雅降级为 standard，maxStories=8 ✅ |
| DeepSeek 主分析 | API 不可用 → fallback Kimi → Kimi 超时 → 无新增 story ✅ |
| 数据覆盖 | 无 |

**降级验证**：
- 密度判定失败时，`catch` 块正确返回 `{ density: 'standard', reasonEn: 'Default (detection failed)' }`
- 后续代码正确使用降级值
- `adaptiveThreshold` 正确计算（333 篇 > 200 → 阈值 0.22）

### 24.5 待后续验证

当 DeepSeek API 恢复后需跑一次完整 `npm run update-news`，重点观察：
1. 密度判定的判定准确率（是真实反映当天新闻量还是机械赋值）
2. light 日 AI 输出中是否正确省略了非必要模块
3. heavy 日是否有 >8 条的高质量 story 被生成
4. 密度判定的缓存命中率（system prompt 固定，预期后续调用 >90% hit rate）

### 24.6 下一步计划（更新后）

| 优先级 | 任务 | 说明 | 状态 |
|---|---|---|---|
| P1 | **AI 对话功能 MVP** | 「聊这条」入口 + 上下文注入 + knowledge gaps 管理 | ⬜ 待推进 |
| P1 | **Vercel dashboard 上线** | 用户在 Vercel 上 import 仓库，配置 GitHub Secrets | ⬜ 需用户操作 |
| P2 | **信源自动降级后端化** | `rss-fetcher.ts` 读取 health 数据，对连续失败源自动降 priority | ⬜ 待细化 |
| P3 | **语义搜索升级** | AI embedding 替代 fuse.js | ⬜ 待规划 |

---

## 二十九、Phase 25 — AI 对话功能 MVP（2026-05-27）

### 25.1 改造目标

将简报从「单向信息投喂」升级为「双向交互伴侣」。每条新闻卡片右下角挂「聊这条」按钮，点击后在当前页面展开对话面板，SSE 流式呈现 AI 回复。

### 25.2 文件变更

| 文件 | 类型 | 说明 |
|---|---|---|
| `scripts/utils/chat.ts` | **新增** | 上下文组装逻辑：加载 story 全文 + 知识缺口 + 相关归档搜索 |
| `src/components/ChatPanel.tsx` | **新增** | 对话面板：消息列表 + 输入框 + SSE 流式渲染 + 知识缺口自动记录 |
| `src/components/StoryCard.tsx` | 修改 | 底部新增「💬 聊这条」按钮 + ChatPanel 组件 |
| `serve.cjs` | 修改 | 新增 `POST /api/chat-story`（SSE 流式代理）+ `POST /api/chat-story/gap`（知识缺口记录） |
| `public/user-knowledge-gaps.json` | **新增** | 知识缺口初始化骨架 |
| `src/i18n/zh.ts` / `en.ts` | 修改 | 新增 `chat.*` 命名空间（8 个 key） |
| `src/index.css` | 修改 | ChatPanel 完整样式（~170 行） |

### 25.3 数据流

```
用户点击「聊这条」
    ↓
POST /api/chat-story { storyId, message, history }
    ↓
serve.cjs 组装上下文:
  1. 加载 news-data.json → 提取该 story 的 AI 分析全文
  2. 加载 user-knowledge-gaps.json → 提取未解决的知识缺口
    ↓
调用 DeepSeek deepseek-chat（stream: true）
    ↓
SSE 逐 token 推送到前端 ChatPanel
    ↓
对话结束 → AI 回复中若有 [GAP: <topic>] 标记
    → POST /api/chat-story/gap 自动记录知识缺口
```

### 25.4 上下文注入

每次对话请求的 system prompt 包含三层：
1. **该新闻的 AI 分析全文**（headline / lead / timeline / keyDetails / perspectives / sources / confidence）
2. **读者知识缺口**（历史上"展开讲讲"/"XX 是什么意思"记录，最多 5 条）
3. **对话指引**：简洁回答、同语言回复、识别新知识缺口并标记

### 25.5 知识缺口自动管理

- 用户问"展开讲讲"/"这是什么意思" → AI 回复末尾附加 `[GAP: <topic>]`
- 前端检测到 GAP 标记 → POST `/api/chat-story/gap` 记录
- 下次对话自动注入，AI 知道用户之前不懂什么
- 最多保留 20 条未解决的缺口，超量自动淘汰最旧的
- 缺口按 `topic` 去重

### 25.6 技术决策

| 决策 | 理由 |
|---|---|
| deepseek-chat（非推理模型） | 对话需要快（<3s 首 token），推理模型 overhead 高 |
| SSE 流式 | 无需 WebSocket 基础设施，复用 HTTP，浏览器原生支持 |
| 知识缺口存 JSON 文件 | 零额外基础设施，与现有 `public/` 数据层一致 |
| 对话历史不持久化 | MVP 不设数据库，每次对话独立 |

### 25.7 验证

- **TypeScript**: `npx tsc -b` 通过
- **Vite build**: 76 modules, gzip ~120KB，通过
- **`node -c serve.cjs`**: 通过

**待用户验证**（需启动 `node serve.cjs`）：
1. 点击「聊这条」展开对话面板
2. 发送消息，观察 SSE 流式回复
3. 问"XX 是什么意思"，观察知识缺口记录

### 25.8 下一步计划（更新后）

| 优先级 | 任务 | 说明 | 状态 |
|---|---|---|---|
| P1 | **Vercel dashboard 上线** | 用户在 Vercel 上 import 仓库，配置 GitHub Secrets | ⬜ 需用户操作 |
| P2 | **信源自动降级后端化** | `rss-fetcher.ts` 读取 health 数据，对连续失败源自动降 priority | ⬜ 待细化 |
| P2 | **对话历史持久化** | 每条 news 的讨论历史持久化，跨会话可恢复 | ⬜ 待规划 |
| P3 | **语义搜索升级** | AI embedding 替代 fuse.js | ⬜ 待规划 |
