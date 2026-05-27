import { useState, useEffect, useCallback, useMemo } from 'react';

const STORAGE_KEY = 'news-briefing-viewed';

interface ViewedState {
  generatedAt: string;
  storyIds: string[];
}

function loadViewed(): ViewedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.generatedAt !== 'string' || !Array.isArray(parsed.storyIds)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveViewed(state: ViewedState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function useNewStories(
  storyIds: string[],
  generatedAt: string | undefined,
  issueDate: string | undefined,
) {
  const [viewed, setViewed] = useState<ViewedState | null>(loadViewed);

  // Re-read from localStorage on mount (handles cross-tab changes)
  useEffect(() => {
    setViewed(loadViewed());
  }, [generatedAt, issueDate]);

  const newStoryIds = useMemo(() => {
    if (!generatedAt || storyIds.length === 0) return new Set<string>();
    // First visit: nothing is "new" — auto-save baseline silently
    if (!viewed) return new Set<string>();
    // Same generation: nothing new
    if (viewed.generatedAt === generatedAt) return new Set<string>();

    const oldSet = new Set(viewed.storyIds);
    return new Set(storyIds.filter(id => !oldSet.has(id)));
  }, [storyIds, generatedAt, viewed]);

  const hasNew = newStoryIds.size > 0;
  const newCount = newStoryIds.size;

  const isNew = useCallback(
    (storyId: string) => newStoryIds.has(storyId),
    [newStoryIds],
  );

  const markAsViewed = useCallback(() => {
    if (!generatedAt) return;
    const next: ViewedState = { generatedAt, storyIds: [...storyIds] };
    saveViewed(next);
    setViewed(next);
  }, [generatedAt, storyIds]);

  // Auto-save baseline on first visit so future updates can detect deltas
  useEffect(() => {
    if (!viewed && generatedAt && storyIds.length > 0) {
      markAsViewed();
    }
  }, [viewed, generatedAt, storyIds, markAsViewed]);

  return { hasNew, newCount, newStoryIds, isNew, markAsViewed };
}
