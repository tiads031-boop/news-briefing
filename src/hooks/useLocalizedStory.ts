import { useTranslation } from 'react-i18next';
import type { Story, Source, TimelineEvent, Perspective, Forecast, SecondaryEffect, FinanceJargonItem, TradingSignal } from '../types';

export interface LocalizedStory {
  headline: string;
  lead: string;
  timeline: TimelineEvent[];
  keyDetails: string[];
  perspectives?: Perspective[];
  forecasts?: Forecast[];
  nextToWatchEvent?: string;
  secondaryEffects?: SecondaryEffect[];
  financeJargon?: FinanceJargonItem[];
  tradingSignals?: TradingSignal[];
}

export function useLocalizedStory(story: Story): LocalizedStory {
  const { i18n } = useTranslation();
  const lang = i18n.language === 'zh' ? 'zh' : 'en';

  const pick = <T,>(base: T, en?: T, zh?: T): T => {
    if (lang === 'zh' && zh !== undefined) return zh;
    if (lang === 'en' && en !== undefined) return en;
    return base;
  };

  return {
    headline: pick(story.headline, story.headlineEn, story.headlineZh),
    lead: pick(story.lead, story.leadEn, story.leadZh),
    timeline: pick(story.timeline, story.timelineEn, story.timelineZh),
    keyDetails: pick(story.keyDetails, story.keyDetailsEn, story.keyDetailsZh),
    perspectives: pick(story.perspectives, story.perspectivesEn, story.perspectivesZh),
    forecasts: pick(story.forecasts, story.forecastsEn, story.forecastsZh),
    nextToWatchEvent: story.nextToWatch
      ? pick(story.nextToWatch.event, story.nextToWatch.eventEn, story.nextToWatch.eventZh)
      : undefined,
    secondaryEffects: pick(story.secondaryEffects, story.secondaryEffectsEn, story.secondaryEffectsZh),
    financeJargon: pick(story.financeJargon, story.financeJargonEn, story.financeJargonZh),
    tradingSignals: pick(story.tradingSignals, story.tradingSignalsEn, story.tradingSignalsZh),
  };
}

export function useLocalizedSource(source: Source): string {
  const { i18n } = useTranslation();
  const lang = i18n.language === 'zh' ? 'zh' : 'en';
  if (lang === 'zh' && source.takeZh) return source.takeZh;
  if (lang === 'en' && source.takeEn) return source.takeEn;
  return source.take || source.name;
}
