# GlobalPulse — News Briefing

仿照 [news.karenwang.org](https://news.karenwang.org/) 风格的新闻聚合简报网站。

## 特性

- 📰 **报纸风格设计** — Georgia 衬线字体、暖色调配色、三栏报头
- 🌓 **暗色/亮色模式** — 一键切换，支持系统偏好自动适配
- 🔍 **视角过滤** — All / Geo（地缘政治）/ Tech（科技）
- 📌 **Featured 故事** — 重要报道突出展示
- 📜 **故事时间线** — 可展开/折叠的事件发展轴
- 💡 **关键细节** — 结构化要点列表
- 👁️ **多角度观点** — 不同利益相关方立场
- 🔮 **预测引用** — 媒体/分析师前瞻评论
- 📊 **次级影响分析** — 对金融市场等领域的影响
- 🗓️ **期号系统 + 日历浏览** — 每天对应一期，可通过日历回看任意历史归档

## 快速开始

### 方式一：直接启动（推荐）

双击运行 `start.bat`，然后浏览器访问 http://localhost:8080

或命令行：
```bash
node serve.cjs
```

### 方式二：开发模式

```bash
npm install
npm run dev
```

### 方式三：Vite 预览

```bash
npm install
npm run build
npm run preview
```

## 项目结构

```
news-briefing/
├── src/
│   ├── components/    # React 组件
│   ├── data.ts        # 演示数据
│   ├── types.ts       # TypeScript 类型
│   ├── index.css      # 全局样式
│   └── App.tsx        # 主应用
├── dist/              # 构建产物
├── serve.cjs          # 本地服务器脚本
├── start.bat          # Windows 一键启动
└── index.html
```

## 注意

**不要直接双击打开 `dist/index.html`** — 浏览器会阻止脚本加载导致空白页。必须通过上述三种方式之一启动 HTTP 服务器访问。

## 期号系统

每天的简报对应一期。期号由 `public/issue-config.json` 配置：

```json
{
  "startDate": "2026-04-01",
  "startIssue": 1,
  "description": "GlobalPulse 期号配置"
}
```

- `startDate` — 第一期对应的日期（UTC，YYYY-MM-DD）
- `startIssue` — 起始期号
- 当天期号 = `startIssue + (今天 - startDate)` 天数差

`scripts/update-news.ts` 在生成 `public/news-data.json` 与 `public/archive/YYYY-MM-DD.json` 时会自动写入 `issueNumber` 与 `issueDate` 字段。

如需为已有归档补齐期号字段：

```bash
npx tsx scripts/migrate-archives.ts
```

服务器额外提供一个端点：

- `GET /api/issue-config` — 返回 `public/issue-config.json` 的内容（前端 DateSwitcher / Calendar 调用）

## 数据文件

| 路径 | 说明 |
| --- | --- |
| `public/news-data.json` | 最新简报，每次更新覆盖 |
| `public/archive/YYYY-MM-DD.json` | 当日快照归档，永久保留 |
| `public/issue-config.json` | 期号起始配置 |
