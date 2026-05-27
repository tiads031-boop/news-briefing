export interface TimelineEvent {
  date: string;
  year?: string;
  heading: string;
  summary: string;
  relatedDate?: string;    // YYYY-MM-DD of a past archive to jump to
  relatedStoryId?: string;  // story id within that archive
}

export interface Perspective {
  who: string;
  what: string;
  why?: string;
  diverges?: boolean;
}

export interface Forecast {
  who: string;
  quote: string;
  source?: string;
}

export interface Source {
  name: string;
  url?: string;
  language?: 'en' | 'zh';
  stance?: string;
  take?: string;
  takeEn?: string;
  takeZh?: string;
  diff?: string;
  diverges?: boolean;
}

export interface SecondaryEffect {
  dimension: string;
  analysis: string;
  movements?: string;
  evidence?: string;
}

export interface Story {
  id: string;
  topic: string;
  topicTier?: 'geopolitics' | 'technology' | 'economy' | 'finance' | 'crime' | 'culture' | 'climate';
  agreement: 'aligned' | 'mixed' | 'disputed';
  time: string;
  featured?: boolean;
  runningCoverage?: boolean;
  gcc?: boolean;
  generatedAt?: string;
  confidence?: number; // 1-5, AI self-assessment
  headline: string;
  headlineEn?: string;
  headlineZh?: string;
  lead: string;
  leadEn?: string;
  leadZh?: string;
  timeline: TimelineEvent[];
  timelineEn?: TimelineEvent[];
  timelineZh?: TimelineEvent[];
  keyDetails: string[];
  keyDetailsEn?: string[];
  keyDetailsZh?: string[];
  perspectives?: Perspective[];
  perspectivesEn?: Perspective[];
  perspectivesZh?: Perspective[];
  forecasts?: Forecast[];
  forecastsEn?: Forecast[];
  forecastsZh?: Forecast[];
  nextToWatch?: {
    date: string;
    event: string;
    eventEn?: string;
    eventZh?: string;
  };
  sources: Source[];
  secondaryEffects?: SecondaryEffect[];
  secondaryEffectsEn?: SecondaryEffect[];
  secondaryEffectsZh?: SecondaryEffect[];
  financeJargon?: FinanceJargonItem[];
  financeJargonEn?: FinanceJargonItem[];
  financeJargonZh?: FinanceJargonItem[];
  tradingSignals?: TradingSignal[];
  tradingSignalsEn?: TradingSignal[];
  tradingSignalsZh?: TradingSignal[];
}

export interface FinanceJargonItem {
  term: string;
  explanation: string;
  domain?: string;
  sourceName?: string;
  sourceUrl?: string;
  sourceType?: 'official' | 'exchange' | 'regulator' | 'institution';
  sourceMatchLevel?: 'exact' | 'domain' | 'homepage';
  verifiedAt?: string;
}

export interface TradingSignal {
  asset: string;
  direction: 'bullish' | 'bearish' | 'neutral';
  rationale: string;
}

export interface StoryRanking {
  storyId: string;
  rank: number;
  reasonEn: string;
  reasonZh: string;
}

export interface AlsoTodayItem {
  source: string;
  title: string;
  titleEn?: string;
  titleZh?: string;
  topic: string;
  url?: string;
}

// Extended NewsData for search indexing
export interface NewsData {
  stories: Story[];
  alsoToday: AlsoTodayItem[];
  trackedStories: { title: string; count: number }[];
  sourceList: string[];
  generatedAt: string;
  dataVersion: string;
  issueNumber?: number;
  issueDate?: string;
  ranking?: StoryRanking[];
  dedupStats?: {
    totalIn: number;
    totalOut: number;
    removed: number;
    byUrl: number;
    byTitle: number;
    archiveDays: number;
  };
}
