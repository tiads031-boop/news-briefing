import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import Fuse, { type IFuseOptions } from 'fuse.js';
import type { Story, NewsData } from '../types';

export interface SearchResult {
  story: Story;
  score: number;
  matches: readonly { key?: string; value?: string; indices: [number, number][] }[];
}

interface UseSearchOptions {
  data: NewsData | null;
  archiveDates: string[];
}

const FUSE_OPTIONS: IFuseOptions<Story> = {
  keys: [
    { name: 'headline', weight: 0.25 },
    { name: 'headlineEn', weight: 0.25 },
    { name: 'headlineZh', weight: 0.25 },
    { name: 'lead', weight: 0.15 },
    { name: 'leadEn', weight: 0.15 },
    { name: 'leadZh', weight: 0.15 },
    { name: 'topic', weight: 0.1 },
    { name: 'keyDetails', weight: 0.1 },
    { name: 'keyDetailsEn', weight: 0.1 },
    { name: 'keyDetailsZh', weight: 0.1 },
    { name: 'sources.name', weight: 0.05 },
  ],
  threshold: 0.35,
  includeScore: true,
  includeMatches: true,
  minMatchCharLength: 2,
};

export function useSearch({ data, archiveDates }: UseSearchOptions) {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchScope, setSearchScope] = useState<'current' | 'all'>('current');
  const [allStories, setAllStories] = useState<Story[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Build fuse index from current data + optionally all archives
  const fuse = useMemo(() => {
    const storiesToIndex = searchScope === 'all' ? allStories : (data?.stories || []);
    if (storiesToIndex.length === 0) return null;
    return new Fuse(storiesToIndex, FUSE_OPTIONS);
  }, [allStories, data?.stories, searchScope]);

  // Load all archive stories when scope is 'all'
  useEffect(() => {
    if (searchScope !== 'all') {
      setAllStories([]);
      return;
    }

    let cancelled = false;
    setIsSearching(true);
    setSearchError(null);

    async function loadAll() {
      try {
        const stories: Story[] = [];
        // Include current
        if (data?.stories) stories.push(...data.stories);

        // Load archives
        for (const date of archiveDates) {
          if (cancelled) return;
          try {
            const res = await fetch(`/archive/${date}.json`, { signal: abortRef.current?.signal });
            if (!res.ok) continue;
            const archive: NewsData = await res.json();
            if (archive.stories) stories.push(...archive.stories);
          } catch {
            // skip failed archive
          }
        }

        if (!cancelled) {
          setAllStories(stories);
        }
      } catch (e) {
        if (!cancelled) setSearchError('加载归档数据失败');
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    }

    abortRef.current = new AbortController();
    loadAll();

    return () => {
      cancelled = true;
      abortRef.current?.abort();
    };
  }, [searchScope, archiveDates, data?.stories]);

  const results = useMemo(() => {
    if (!query.trim() || !fuse) return [];
    const raw = fuse.search(query.trim());
    return raw.slice(0, 20).map(r => ({
      story: r.item,
      score: r.score ?? 1,
      matches: (r.matches || []) as readonly { key?: string; value?: string; indices: [number, number][] }[],
    }));
  }, [query, fuse]);

  const clearSearch = useCallback(() => {
    setQuery('');
    setSearchScope('current');
  }, []);

  return {
    query,
    setQuery,
    results,
    isSearching,
    searchScope,
    setSearchScope,
    searchError,
    clearSearch,
    hasResults: results.length > 0,
  };
}
