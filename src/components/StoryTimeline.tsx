import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { TimelineEvent } from '../types';

interface StoryTimelineProps {
  events: TimelineEvent[];
  availableDates?: Set<string>;
  onNavigateToDate?: (date: string, storyId?: string) => void;
  runningCoverage?: boolean;
}

function isTodayEvent(event: TimelineEvent): boolean {
  const now = new Date();
  const candidates = [
    // EN formats
    now.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }),        // "May 5"
    now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),       // "May 5"
    now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }),        // "5 May"
    now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),       // "5 May"
    // ZH format
    `${now.getMonth() + 1}月${now.getDate()}日`,                                // "5月5日"
    // ISO-ish
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`, // "2026-05-05"
    `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`, // "05-05"
  ];
  const datePart = event.date.replace(/[,\s]+/g, ' ').trim();
  return candidates.some(c => datePart.includes(c) || c.includes(datePart));
}

function formatTimelineDate(date: string, lang: 'zh' | 'en'): string {
  const clean = String(date || '').replace(/\s*(周[一二三四五六日天]|星期[一二三四五六日天])\s*$/u, '').trim();
  if (lang !== 'zh') {
    return clean.replace(/\s*,?\s*\d{4}$/, '').trim();
  }

  const zhMatch = clean.match(/(\d{1,2})\s*月\s*(\d{1,2})\s*日?/);
  if (zhMatch) return `${Number(zhMatch[1])}月${Number(zhMatch[2])}日`;

  const isoMatch = clean.match(/(?:\d{4}[-/])?(\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) return `${Number(isoMatch[1])}月${Number(isoMatch[2])}日`;

  const monthMap: Record<string, number> = {
    jan: 1, january: 1,
    feb: 2, february: 2,
    mar: 3, march: 3,
    apr: 4, april: 4,
    may: 5,
    jun: 6, june: 6,
    jul: 7, july: 7,
    aug: 8, august: 8,
    sep: 9, sept: 9, september: 9,
    oct: 10, october: 10,
    nov: 11, november: 11,
    dec: 12, december: 12,
  };
  const enMonthFirst = clean.match(/^([A-Za-z]+)\.?\s+(\d{1,2})/);
  if (enMonthFirst) {
    const month = monthMap[enMonthFirst[1].toLowerCase()];
    if (month) return `${month}月${Number(enMonthFirst[2])}日`;
  }
  const enDayFirst = clean.match(/^(\d{1,2})\s+([A-Za-z]+)\.?/);
  if (enDayFirst) {
    const month = monthMap[enDayFirst[2].toLowerCase()];
    if (month) return `${month}月${Number(enDayFirst[1])}日`;
  }

  return clean;
}

export default function StoryTimeline({ events, availableDates, onNavigateToDate, runningCoverage = false }: StoryTimelineProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language.startsWith('zh') ? 'zh' : 'en';
  const [expanded, setExpanded] = useState(false);
  const hasMore = events.length > 3;

  // For running coverage, identify which event is "today"
  const todayIndex = useMemo(() => {
    if (!runningCoverage) return -1;
    for (let i = events.length - 1; i >= 0; i--) {
      if (isTodayEvent(events[i])) return i;
    }
    return events.length > 0 ? events.length - 1 : -1;
  }, [runningCoverage, events]);

  const isJumpable = (event: TimelineEvent): boolean => {
    if (!event.relatedDate || !onNavigateToDate) return false;
    if (!availableDates) return true; // unknown — allow attempt; useNews surfaces 404
    return availableDates.has(event.relatedDate);
  };

  return (
    <div className={`v1-timeline-wrap ${expanded ? 'expanded' : ''}`}>
      <ul className="v1-timeline">
        {events.map((event, idx) => {
          const linkable = isJumpable(event);
          const isToday = idx === todayIndex;
          const isExtra = hasMore && idx < events.length - 3;
          return (
            <li key={idx} className={`${linkable ? 't-linked' : ''} ${isToday ? 't-today' : ''} ${isExtra ? 't-extra' : ''}`}>
              <div className="t-date">
                <span className="t-date-main">{formatTimelineDate(event.date, lang)}</span>
                <span className="t-date-year">{event.year}</span>
              </div>
              <div className="t-body">
                <div className="t-heading">
                  {linkable ? (
                    <button
                      className="t-link-btn"
                      onClick={() => onNavigateToDate?.(event.relatedDate!, event.relatedStoryId)}
                      title={t('timeline.jumpToArchive', { date: event.relatedDate })}
                    >
                      {event.heading}
                      <span className="t-link-icon" aria-hidden="true">↗</span>
                    </button>
                  ) : (
                    event.heading
                  )}
                </div>
                <div className="t-summary">{event.summary}</div>
              </div>
            </li>
          );
        })}
      </ul>
      {hasMore && (
        <button
          className="timeline-toggle"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? t('timeline.showFewer') : t('timeline.showEarlier', { count: events.length - 3 })}
        </button>
      )}
    </div>
  );
}
