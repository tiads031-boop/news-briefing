export default {
  // Header
  header: {
    hideIndex: 'Hide index',
    showIndex: 'Show index',
    lens: {
      all: 'All',
      new: 'New',
      geo: 'Geo',
      tech: 'Tech',
      finance: 'Finance',
    },
    dark: 'Dark',
    light: 'Light',
    issue: 'No. {{number}}',
    archived: 'Archived · {{date}}',
    updated: 'Updated {{time}} ago',
  },

  // StoryCard
  story: {
    runningCoverage: 'Running Coverage',
    agreement: {
      aligned: 'Aligned',
      mixed: 'Mixed',
      disputed: 'Disputed',
    },
    gcc: 'GCC',
    continueReading: 'Continue reading — timeline, perspectives & sources',
    storyArc: 'Story arc',
    nextToWatch: 'Next to watch',
    forecasts: 'Forecasts',
    perspectives: 'Perspectives',
    keyDetails: 'Key details',
    secondaryEffects: 'Secondary effects — analysis',
    keyMovements: 'Key movements',
    evidence: 'Evidence',
    showSources: 'Show {{count}} sources covering this story',
    hideSources: 'Hide sources',
    sourceLink: 'Original source',
    newBadge: 'NEW',
    latest: 'Latest',
  },

  // StoryTimeline
  timeline: {
    showFewer: 'Show fewer events',
    showEarlier: 'Show {{count}} earlier events',
    jumpToArchive: 'View briefing from {{date}}',
  },

  // Sidebar
  sidebar: {
    description:
      'Every day we pull sources from global financial, economic and tech media, let AI track events across days, and surface deeply-sourced stories — not a pile of old threads.',
    trackedToday: 'Tracked today',
    sources: 'Sources',
  },

  // AlsoToday
  alsoToday: 'Also today',

  // Finance Panel
  finance: {
    title: 'Market Pulse',
    jargon: 'Key Terms',
    signals: 'Trading Signals',
    bullish: 'Bullish',
    bearish: 'Bearish',
    neutral: 'Neutral',
    sourcePrefix: 'Source: ',
    officialSource: 'Official material',
    officialSourceGuide: 'Official source guide',
    sourceType: {
      official: 'Official',
      regulator: 'Regulator',
      exchange: 'Exchange',
      institution: 'Institution',
    },
  },

  // Footer
  footer: {
    disclaimer1:
      'GlobalPulse is an AI-powered news briefing service. Stories are synthesized from multiple sources and may contain errors or omissions.',
    disclaimer2:
      'Always verify critical information with primary sources. Updated continuously.',
  },

  // Common
  common: {
    endOfBriefing: '— end of briefing —',
    loading: 'Loading briefing...',
    error: 'Failed to load briefing. Please try again later.',
    newBriefing: 'New briefing available — click to refresh',
    refresh: 'Refresh',
    demoData: 'Showing demo data',
    loadLatest: 'Load latest briefing',
    noNewStories: 'No new stories — you\'ve seen all the latest coverage.',
  },

  // Update Prompt
  updatePrompt: {
    title: 'Update news briefing?',
    description: 'Would you like to fetch and analyze the latest news now? This will call the AI to generate a fresh briefing.',
    accept: 'Yes, update now',
    append: 'Append update',
    incrementalHint: 'A briefing already exists for today. New content will be appended automatically.',
    forceUpdate: 'Force regenerate',
    later: 'Later (5 min)',
    reject: 'No, thanks',
    close: 'Close',
    starting: 'Initializing...',
    startingForce: 'Force regenerating briefing...',
    running: 'Updating briefing...',
    done: 'Update complete!',
    aborted: 'Aborted',
    abortedDesc: 'You aborted this update; no data was changed.',
    abort: 'Abort update',
    aborting: 'Aborting...',
    errorTitle: 'Update failed',
    failed: 'Update request failed.',
    connectionError: 'Could not connect to update service.',
    reload: 'Load new briefing',
    stay: 'Stay on current',
    retry: 'Try again',
    dismiss: 'Dismiss',
    countdownTitle: 'Auto-update queued',
    countdownText: 'Starts in {{mm}}:{{ss}}',
    countdownNow: 'Start now',
    countdownCancel: 'Cancel',
    minimize: 'Minimize',
    restore: 'Restore',
    lastDone: 'Last update: Done',
    lastError: 'Last update: Failed',
    lastAborted: 'Last update: Aborted',
    viewLog: 'View log',
    storyProgress: '{{count}} stories generated...',
  },

  // Date Switcher
  dateSwitcher: {
    label: 'Browse date',
    latest: 'Latest',
    today: 'Today',
    yesterday: 'Yesterday',
    older: 'Older...',
    openCalendar: 'Open calendar',
    reUpdate: 'Re-update',
    sortAi: 'AI Rank',
    sortNewest: 'Newest',
    sortLabel: 'Sort',
  },

  // Ranking
  ranking: {
    label: 'AI Rank',
    methodology: 'AI ranks stories by 6 weighted dimensions',
    dimMarket: 'Market Impact — does it move asset prices or change investment theses',
    dimRecency: 'Recency — the more recent the break, the higher the weight',
    dimGlobal: 'Global Significance — scale of affected people, regions, sectors',
    dimRelevance: 'Reader Relevance — direct relevance to finance/tech/economy professionals',
    dimSource: 'Source Density — more independent sources = higher signal',
    dimNovelty: 'Novelty — new development, not continuation of known news',
    noRanking: 'No AI ranking data for this issue',
  },

  // Calendar
  calendar: {
    title: 'Briefing calendar',
    prevMonth: 'Previous month',
    nextMonth: 'Next month',
    close: 'Close',
    issue: 'Issue {{n}}',
  },

  // Language
  language: {
    en: 'English',
    zh: '中文',
    switch: 'Language',
  },

  // Search
  search: {
    title: 'Search',
    placeholder: 'Search headlines, leads, key details...',
    scopeCurrent: 'Current briefing',
    scopeAll: 'All archives',
    loading: 'Searching...',
    noResults: 'No matches found',
    match: 'match',
  },

  // Bookmark
  bookmark: {
    title: 'Bookmarks',
    add: 'Bookmark',
    remove: 'Remove bookmark',
    clearAll: 'Clear all',
    empty: 'No bookmarks yet',
  },

  // Confidence
  confidence: {
    low: 'Low AI confidence',
    lowDesc: 'This story was AI-generated. Key claims should be verified against primary sources.',
    label: 'AI Confidence',
  },

  // Stats
  stats: {
    title: 'Reading Stats',
    totalStories: 'Read',
    totalTime: 'Reading Time',
    thisWeek: 'Week',
    weeklyTrend: 'Weekly Reading',
    topicDist: 'Topic Distribution',
    bookmarks: 'Bookmarks',
    markRead: 'Mark Read',
    markAllRead: 'Mark all as read',
    markAllReadConfirm: 'Mark all stories in this issue as read?',
  },

  // Source Health
  sourceHealth: {
    title: 'Source Health',
    all: 'All',
    unhealthy: 'Unhealthy',
    noData: 'No data yet',
    successRate: 'Success Rate',
    latency: 'Latency',
    items: 'Items',
  },

  // PDF Export
  pdfExport: {
    title: 'Export PDF',
    label: 'Export PDF',
    exporting: 'Preparing...',
    popupBlocked: 'Popup blocked. Please allow popups and try again.',
  },

  // Topics
  topics: {
    geopolitics: 'geopolitics',
    technology: 'technology',
    'crime-justice': 'crime & justice',
    europe: 'europe',
    'us-politics': 'U.S. politics',
    'economy-markets': 'economy & markets',
    'culture-sports': 'culture & sports',
    finance: 'finance',
    economy: 'economy',
    'technology-science': 'technology & science',
    crime: 'crime',
    culture: 'culture',
    climate: 'climate',
    'china-asia': 'China & Asia',
  },
  chat: {
    title: 'Discuss',
    placeholder: 'Ask a question...',
    send: 'Send',
    stop: 'Stop',
    close: 'Close',
    discuss: 'Discuss',
    error: 'Chat error, please retry',
    empty: 'No messages yet',
  },
};
