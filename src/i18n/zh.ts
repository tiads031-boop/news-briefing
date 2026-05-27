export default {
  // Header
  header: {
    hideIndex: '隐藏索引',
    showIndex: '显示索引',
    lens: {
      all: '全部',
      new: '最新',
      geo: '地缘',
      tech: '科技',
      finance: '财经',
    },
    dark: '深色',
    light: '浅色',
    issue: '第 {{number}} 期',
    archived: '归档 · {{date}}',
    updated: '{{time}}前更新',
  },

  // StoryCard
  story: {
    runningCoverage: '持续报道',
    agreement: {
      aligned: '一致',
      mixed: '混合',
      disputed: '存疑',
    },
    gcc: '海湾',
    continueReading: '继续阅读 — 时间线、多方观点与来源',
    storyArc: '事件脉络',
    nextToWatch: '重点关注',
    forecasts: '前瞻预测',
    perspectives: '多方观点',
    keyDetails: '核心要点',
    secondaryEffects: '次级影响 — 分析',
    keyMovements: '关键变动',
    evidence: '证据',
    showSources: '查看 {{count}} 条相关来源',
    hideSources: '隐藏来源',
    sourceLink: '原文链接',
    newBadge: '新',
    latest: '最新',
  },

  // StoryTimeline
  timeline: {
    showFewer: '收起早期事件',
    showEarlier: '展开 {{count}} 个早期事件',
    jumpToArchive: '查看 {{date}} 的简报',
  },

  // Sidebar
  sidebar: {
    description:
      '我们每天从全球金融、经济和科技媒体抓取信源，由AI追踪事件演变，产出深度溯源的简报 — 不是一堆旧闻的堆砌。',
    trackedToday: '今日追踪',
    sources: '信源',
  },

  // AlsoToday
  alsoToday: '今日简讯',

  // Finance Panel
  finance: {
    title: '市场脉搏',
    jargon: '关键术语',
    signals: '交易信号',
    bullish: '看涨',
    bearish: '看跌',
    neutral: '中性',
    sourcePrefix: '来源：',
    officialSource: '官方资料',
    officialSourceGuide: '官方来源指引',
    sourceType: {
      official: '官方',
      regulator: '监管机构',
      exchange: '交易所',
      institution: '国际机构',
    },
  },

  // Footer
  footer: {
    disclaimer1:
      'GlobalPulse 是一项由AI驱动的新闻简报服务。报道内容由多篇信源聚合生成，可能存在错误或遗漏。',
    disclaimer2:
      '请务必通过原始信源核实关键信息。内容持续更新。',
  },

  // Common
  common: {
    endOfBriefing: '— 简报结束 —',
    loading: '正在加载简报...',
    error: '加载简报失败，请稍后重试。',
    newBriefing: '有新简报 — 点击刷新',
    refresh: '刷新',
    demoData: '正在显示演示数据',
    loadLatest: '加载最新简报',
    noNewStories: '没有新内容 — 你已经看过了所有最新报道。',
  },

  // Update Prompt
  updatePrompt: {
    title: '更新新闻简报？',
    description: '是否立即抓取并分析最新新闻？将调用 AI 生成全新的简报内容。',
    accept: '立即更新',
    append: '追加更新',
    incrementalHint: '今日已有简报，新内容将自动追加到现有简报中。',
    forceUpdate: '强制重新生成',
    later: '稍后 (5 分钟)',
    reject: '暂不需要',
    close: '关闭',
    starting: '正在初始化...',
    startingForce: '正在强制重新生成简报...',
    running: '正在更新简报...',
    done: '更新完成！',
    aborted: '已中止',
    abortedDesc: '更新已被你中止,数据未变更。',
    abort: '中止更新',
    aborting: '正在中止...',
    errorTitle: '更新失败',
    failed: '更新请求失败。',
    connectionError: '无法连接到更新服务。',
    reload: '加载新简报',
    stay: '留在当前页',
    retry: '重试',
    dismiss: '关闭',
    countdownTitle: '稍后自动更新',
    countdownText: '{{mm}}:{{ss}} 后自动开始',
    countdownNow: '立即开始',
    countdownCancel: '取消',
    minimize: '最小化',
    restore: '恢复',
    lastDone: '上次更新: 完成',
    lastError: '上次更新: 失败',
    lastAborted: '上次更新: 已中止',
    viewLog: '查看日志',
    storyProgress: '已生成 {{count}} 条简报...',
  },

  // Date Switcher
  dateSwitcher: {
    label: '查看日期',
    latest: '最新',
    today: '今天',
    yesterday: '昨天',
    older: '更早...',
    openCalendar: '打开日历',
    reUpdate: '再次更新',
    sortAi: 'AI 排序',
    sortNewest: '最新优先',
    sortLabel: '排序',
  },

  // Ranking
  ranking: {
    label: 'AI 排名',
    methodology: 'AI 排序依据 6 个维度加权评分',
    dimMarket: '市场冲击 — 是否影响资产价格或投资逻辑',
    dimRecency: '时效性 — 距离事发时间越近权重越高',
    dimGlobal: '全球影响 — 受影响的人群、区域与行业规模',
    dimRelevance: '读者相关 — 对财经/科技/经济从业者的直接关联度',
    dimSource: '信源密度 — 更多独立信源交叉印证 = 更高信号强度',
    dimNovelty: '新颖度 — 是新进展而非已知事件的延续',
    noRanking: '本期暂无 AI 排名数据',
  },

  // Calendar
  calendar: {
    title: '简报日历',
    prevMonth: '上一月',
    nextMonth: '下一月',
    close: '关闭',
    issue: '第 {{n}} 期',
  },

  // Language
  language: {
    en: 'English',
    zh: '中文',
    switch: '语言',
  },

  // Search
  search: {
    title: '搜索',
    placeholder: '搜索标题、导语、要点...',
    scopeCurrent: '当前简报',
    scopeAll: '全部归档',
    loading: '正在搜索...',
    noResults: '未找到匹配结果',
    match: '匹配度',
  },

  // Bookmark
  bookmark: {
    title: '收藏',
    add: '收藏',
    remove: '取消收藏',
    clearAll: '清空全部',
    empty: '暂无收藏内容',
  },

  // Confidence
  confidence: {
    low: 'AI 分析置信度较低',
    lowDesc: '本报道由 AI 聚合生成，关键信息建议通过原始信源核实。',
    label: 'AI 置信度',
  },

  // Stats
  stats: {
    title: '阅读统计',
    totalStories: '已读',
    totalTime: '阅读时长',
    thisWeek: '本周',
    weeklyTrend: '本周阅读',
    topicDist: '话题分布',
    bookmarks: '收藏',
    markRead: '标记已读',
    markAllRead: '全部标为已读',
    markAllReadConfirm: '确认将当前期全部标记为已读？',
  },

  // Source Health
  sourceHealth: {
    title: '信源健康度',
    all: '全部',
    unhealthy: '异常',
    noData: '暂无数据',
    successRate: '成功率',
    latency: '延迟',
    items: '条目数',
  },

  // PDF Export
  pdfExport: {
    title: '导出 PDF',
    label: '导出 PDF',
    exporting: '准备中...',
    popupBlocked: '弹窗被拦截，请允许弹窗后重试',
  },

  // Topics
  topics: {
    geopolitics: '地缘政治',
    technology: '科技',
    'crime-justice': '犯罪与司法',
    europe: '欧洲',
    'us-politics': '美国政治',
    'economy-markets': '经济与市场',
    'culture-sports': '文化与体育',
    finance: '金融',
    economy: '经济',
    'technology-science': '科技与科学',
    crime: '犯罪',
    culture: '文化',
    climate: '气候',
    'china-asia': '中国与亚洲',
  },
  chat: {
    title: '聊这条',
    placeholder: '输入你的问题...',
    send: '发送',
    stop: '停止',
    close: '关闭',
    discuss: '聊这条',
    error: '对话出错，请重试',
    empty: '还没有消息',
  },
};
