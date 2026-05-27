import { useState, useCallback } from 'react';

const STORAGE_KEY = 'news-briefing-source-health';

export interface SourceHealthRecord {
  name: string;
  url: string;
  lastCheck: string;
  status: 'ok' | 'empty' | 'error';
  latencyMs: number;
  itemCount: number;
  consecutiveErrors: number;
  totalChecks: number;
  successRate: number;
}

export interface SourceHealthState {
  sources: SourceHealthRecord[];
  lastUpdated: string;
}

function loadHealth(): SourceHealthState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return { sources: [], lastUpdated: '' };
}

function saveHealth(state: SourceHealthState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function useSourceHealth() {
  const [health, setHealth] = useState<SourceHealthState>(loadHealth);

  const updateHealth = useCallback((records: SourceHealthRecord[]) => {
    setHealth(prev => {
      const merged = new Map<string, SourceHealthRecord>();
      
      // Load existing
      for (const s of prev.sources) {
        merged.set(s.name, s);
      }
      
      // Merge new records
      for (const r of records) {
        const existing = merged.get(r.name);
        if (existing) {
          const totalChecks = existing.totalChecks + 1;
          const successCount = existing.totalChecks * existing.successRate + (r.status === 'ok' ? 1 : 0);
          merged.set(r.name, {
            ...r,
            consecutiveErrors: r.status === 'ok' ? 0 : existing.consecutiveErrors + 1,
            totalChecks,
            successRate: successCount / totalChecks,
          });
        } else {
          merged.set(r.name, {
            ...r,
            consecutiveErrors: r.status === 'ok' ? 0 : 1,
            totalChecks: 1,
            successRate: r.status === 'ok' ? 1 : 0,
          });
        }
      }

      const next: SourceHealthState = {
        sources: Array.from(merged.values()),
        lastUpdated: new Date().toISOString(),
      };
      saveHealth(next);
      return next;
    });
  }, []);

  const getUnhealthySources = useCallback(() => {
    return health.sources.filter(s => s.consecutiveErrors >= 3 || s.successRate < 0.5);
  }, [health.sources]);

  const getSourceScore = useCallback((name: string) => {
    const s = health.sources.find(x => x.name === name);
    if (!s) return null;
    return {
      successRate: Math.round(s.successRate * 100),
      consecutiveErrors: s.consecutiveErrors,
      lastCheck: s.lastCheck,
    };
  }, [health.sources]);

  return {
    health,
    updateHealth,
    getUnhealthySources,
    getSourceScore,
  };
}
