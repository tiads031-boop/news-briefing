import { useCallback, useMemo, useState } from 'react';
import { READING_RULES } from '../config/readingRules';

const STORAGE_KEY_V2 = 'news-briefing-reading-stats-v2';
const LEGACY_KEY = 'news-briefing-reading-stats';

interface StoryStats {
  issueDate: string;
  storyId: string;
  exposed: boolean;
  engaged: boolean;
  read: boolean;
  readAt?: string;
  activeSeconds: number;
  interactions: number;
  maxScrollDepth: number;
}

interface DailyItem {
  readCount: number;
  activeSeconds: number;
}

export interface ReadingStats {
  version: 2;
  stories: Record<string, StoryStats>;
  daily: Record<string, DailyItem>;
}

function todayLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function storyKey(storyId: string, issueDate?: string): string {
  return `${issueDate || 'unknown'}::${storyId}`;
}

function ensureDaily(stats: ReadingStats, date: string) {
  if (!stats.daily[date]) stats.daily[date] = { readCount: 0, activeSeconds: 0 };
}

function ensureStory(stats: ReadingStats, storyId: string, issueDate?: string): StoryStats {
  const key = storyKey(storyId, issueDate);
  if (!stats.stories[key]) {
    stats.stories[key] = {
      storyId,
      issueDate: issueDate || 'unknown',
      exposed: false,
      engaged: false,
      read: false,
      activeSeconds: 0,
      interactions: 0,
      maxScrollDepth: 0,
    };
  }
  return stats.stories[key];
}

function cloneStats(stats: ReadingStats): ReadingStats {
  return { version: 2, stories: { ...stats.stories }, daily: { ...stats.daily } };
}

function saveStats(stats: ReadingStats) {
  localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(stats));
}

function createEmpty(): ReadingStats {
  return { version: 2, stories: {}, daily: {} };
}

function migrateLegacy(raw: string): ReadingStats {
  try {
    const parsed = JSON.parse(raw);
    const next = createEmpty();
    if (Array.isArray(parsed?.daily)) {
      for (const d of parsed.daily) {
        if (!d?.date) continue;
        next.daily[d.date] = {
          readCount: Number(d.storiesRead || 0),
          activeSeconds: Number(d.timeSpentSeconds || 0),
        };
      }
    }
    return next;
  } catch {
    return createEmpty();
  }
}

function loadStats(): ReadingStats {
  try {
    const v2Raw = localStorage.getItem(STORAGE_KEY_V2);
    if (v2Raw) {
      const parsed = JSON.parse(v2Raw);
      if (parsed?.version === 2 && parsed?.stories && parsed?.daily) return parsed;
    }

    const legacyRaw = localStorage.getItem(LEGACY_KEY);
    if (legacyRaw) {
      const migrated = migrateLegacy(legacyRaw);
      saveStats(migrated);
      return migrated;
    }
  } catch {
    // ignore
  }
  return createEmpty();
}

function canCountTime(): boolean {
  return document.visibilityState === 'visible' && document.hasFocus();
}

export function useReadingStats() {
  const [stats, setStats] = useState<ReadingStats>(loadStats);

  const evaluateRead = useCallback((s: StoryStats) => {
    const byOpenRule =
      s.maxScrollDepth >= READING_RULES.readScrollDepth &&
      s.activeSeconds >= READING_RULES.readMinSecondsWithScroll;
    const byCardRule =
      s.activeSeconds >= READING_RULES.readCardSeconds &&
      s.interactions >= READING_RULES.readMinInteractions;
    return byOpenRule || byCardRule;
  }, []);

  const maybeSetEngaged = (s: StoryStats) => {
    if (
      !s.engaged &&
      (s.activeSeconds >= READING_RULES.engagedExpandedSeconds ||
        s.activeSeconds >= READING_RULES.engagedCardSeconds)
    ) {
      s.engaged = true;
    }
  };

  const updateStory = useCallback((storyId: string, issueDate: string | undefined, mutator: (s: StoryStats) => void) => {
    setStats(prev => {
      const next = cloneStats(prev);
      const date = todayLocal();
      ensureDaily(next, date);

      const s = ensureStory(next, storyId, issueDate);
      const beforeRead = s.read;
      mutator(s);
      maybeSetEngaged(s);

      if (!s.read && evaluateRead(s)) {
        s.read = true;
        s.readAt = new Date().toISOString();
      }

      if (!beforeRead && s.read) next.daily[date].readCount += 1;

      saveStats(next);
      return next;
    });
  }, [evaluateRead]);

  const trackExposure = useCallback((storyId: string, issueDate?: string) => {
    updateStory(storyId, issueDate, s => {
      s.exposed = true;
    });
  }, [updateStory]);

  const trackInteraction = useCallback((storyId: string, issueDate?: string) => {
    updateStory(storyId, issueDate, s => {
      s.interactions += 1;
    });
  }, [updateStory]);

  const updateScrollDepth = useCallback((storyId: string, issueDate: string | undefined, depth: number) => {
    updateStory(storyId, issueDate, s => {
      s.maxScrollDepth = Math.max(s.maxScrollDepth, Math.max(0, Math.min(1, depth)));
    });
  }, [updateStory]);

  const trackHeartbeat = useCallback((storyId: string, issueDate?: string, seconds: number = READING_RULES.heartbeatStepSeconds) => {
    if (!canCountTime()) return;

    setStats(prev => {
      const next = cloneStats(prev);
      const date = todayLocal();
      ensureDaily(next, date);

      const s = ensureStory(next, storyId, issueDate);
      const beforeRead = s.read;

      if (s.activeSeconds < READING_RULES.maxSessionSeconds) {
        const delta = Math.min(seconds, READING_RULES.maxSessionSeconds - s.activeSeconds);
        s.activeSeconds += delta;
        next.daily[date].activeSeconds += delta;
      }

      maybeSetEngaged(s);

      if (!s.read && evaluateRead(s)) {
        s.read = true;
        s.readAt = new Date().toISOString();
      }
      if (!beforeRead && s.read) next.daily[date].readCount += 1;

      saveStats(next);
      return next;
    });
  }, [evaluateRead]);

  const markStoryRead = useCallback((storyId: string, issueDate?: string) => {
    updateStory(storyId, issueDate, s => {
      s.read = true;
      s.readAt = s.readAt || new Date().toISOString();
      s.engaged = true;
    });
  }, [updateStory]);

  const markAllRead = useCallback((storyIds: string[], issueDate?: string) => {
    for (const id of storyIds) markStoryRead(id, issueDate);
  }, [markStoryRead]);

  const getWeeklyReadSeries = useCallback(() => {
    const now = new Date();
    const day = now.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);

    const labelsZh = ['一', '二', '三', '四', '五', '六', '日'];
    const labelsEn = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    return Array.from({ length: 7 }).map((_, idx) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + idx);
      const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return {
        date,
        labelZh: labelsZh[idx],
        labelEn: labelsEn[idx],
        readCount: stats.daily[date]?.readCount || 0,
      };
    });
  }, [stats.daily]);

  const summary = useMemo(() => {
    const storyItems = Object.values(stats.stories);
    const totalRead = storyItems.filter(s => s.read).length;
    const totalTimeSeconds = storyItems.reduce((acc, s) => acc + s.activeSeconds, 0);
    return { totalRead, totalTimeSeconds };
  }, [stats.stories]);

  const isStoryRead = useCallback((storyId: string, issueDate?: string) => {
    return !!stats.stories[storyKey(storyId, issueDate)]?.read;
  }, [stats.stories]);

  return {
    stats,
    summary,
    trackExposure,
    trackInteraction,
    updateScrollDepth,
    trackHeartbeat,
    markStoryRead,
    markAllRead,
    isStoryRead,
    getWeeklyReadSeries,
  };
}
