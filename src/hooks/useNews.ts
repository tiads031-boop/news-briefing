import { useState, useEffect, useCallback, useRef } from 'react';
import type { NewsData } from '../types';

interface UseNewsResult {
  data: NewsData | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => void;
  hasNewData: boolean;
  dismissNewData: () => void;
}

const LATEST_URL = '/news-data.json';
const POLL_INTERVAL = 5 * 60 * 1000; // 5 minutes

function buildDataUrl(date: string | null): string {
  if (!date) return LATEST_URL;
  return `/archive/${date}.json`;
}

async function fetchNewsData(url: string): Promise<NewsData> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export function useNews(date: string | null = null): UseNewsResult {
  const [data, setData] = useState<NewsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [hasNewData, setHasNewData] = useState(false);
  const lastGeneratedAt = useRef<string | null>(null);
  const isManualRefresh = useRef(false);

  const load = useCallback(async (isPolling = false) => {
    try {
      const result = await fetchNewsData(buildDataUrl(date));
      if (!isPolling) {
        setData(result);
        setLastUpdated(new Date());
        lastGeneratedAt.current = result.generatedAt;
        setError(null);
      } else {
        // Polling: only check for newer "latest" data, not historical archives
        if (date === null && lastGeneratedAt.current && result.generatedAt !== lastGeneratedAt.current) {
          setHasNewData(true);
        }
      }
    } catch (err) {
      // Manual refresh / archive load: surface error
      // Initial load and polling of "latest" fail silently (fallback data is available)
      if (isManualRefresh.current || date !== null) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    } finally {
      if (!isPolling) {
        setLoading(false);
        isManualRefresh.current = false;
      }
    }
  }, [date]);

  const refresh = useCallback(() => {
    setLoading(true);
    setHasNewData(false);
    isManualRefresh.current = true;
    load(false).then(() => {
      setLastUpdated(new Date());
    });
  }, [load]);

  const dismissNewData = useCallback(() => {
    setHasNewData(false);
    if (data) {
      lastGeneratedAt.current = data.generatedAt;
    }
  }, [data]);

  // Initial load + reload when date changes
  useEffect(() => {
    setLoading(true);
    setError(null);
    setHasNewData(false);
    load(false);
  }, [load]);

  // Polling for updates (only when viewing latest)
  useEffect(() => {
    if (date !== null) return;
    const interval = setInterval(() => {
      load(true);
    }, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [load, date]);

  return {
    data,
    loading,
    error,
    lastUpdated,
    refresh,
    hasNewData,
    dismissNewData,
  };
}
