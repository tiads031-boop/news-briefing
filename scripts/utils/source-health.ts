/**
 * Server-side Source Health Tracker — Phase 26
 *
 * Maintains a persistent JSON record of RSS source fetch success/failure
 * stats across runs. Used by rss-fetcher to auto-skip consistently failing
 * sources (3+ consecutive errors), reducing timeout waste.
 *
 * File: public/source-health.json
 *
 * NOTE: This is separate from the frontend's useSourceHealth hook
 * (which reads localStorage). The server-side tracker is authoritative
 * for fetch-time skip decisions.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const HEALTH_FILE = join(process.cwd(), 'public', 'source-health.json');

export interface SourceHealthEntry {
  name: string;
  url: string;
  lastCheck: string;        // ISO timestamp
  lastStatus: 'ok' | 'error';
  lastError?: string;
  latencyMs: number;
  itemCount: number;
  consecutiveErrors: number;
  totalChecks: number;
  successCount: number;
}

interface HealthStore {
  updated: string;
  sources: Record<string, SourceHealthEntry>;  // key = source name
}

function loadStore(): HealthStore {
  if (!existsSync(HEALTH_FILE)) {
    return { updated: '', sources: {} };
  }
  try {
    return JSON.parse(readFileSync(HEALTH_FILE, 'utf-8'));
  } catch {
    return { updated: '', sources: {} };
  }
}

function saveStore(store: HealthStore): void {
  store.updated = new Date().toISOString();
  writeFileSync(HEALTH_FILE, JSON.stringify(store, null, 2));
}

/**
 * Check if a source should be skipped due to persistent failures.
 * Threshold: 3+ consecutive errors.
 */
export function shouldSkipSource(name: string): boolean {
  const store = loadStore();
  const entry = store.sources[name];
  if (!entry) return false;
  return entry.consecutiveErrors >= 3;
}

/**
 * Record a successful fetch for a source.
 * Resets consecutiveError counter to 0.
 */
export function recordSourceSuccess(
  name: string,
  url: string,
  latencyMs: number,
  itemCount: number
): void {
  const store = loadStore();
  const existing = store.sources[name];

  store.sources[name] = {
    name,
    url,
    lastCheck: new Date().toISOString(),
    lastStatus: 'ok',
    latencyMs,
    itemCount,
    consecutiveErrors: 0,
    totalChecks: (existing?.totalChecks ?? 0) + 1,
    successCount: (existing?.successCount ?? 0) + 1,
  };

  saveStore(store);
}

/**
 * Record a failed fetch for a source.
 * Increments consecutiveError counter.
 */
export function recordSourceError(
  name: string,
  url: string,
  errorMessage: string,
  latencyMs: number
): void {
  const store = loadStore();
  const existing = store.sources[name];

  store.sources[name] = {
    name,
    url,
    lastCheck: new Date().toISOString(),
    lastStatus: 'error',
    lastError: errorMessage.slice(0, 200),
    latencyMs,
    itemCount: existing?.itemCount ?? 0,
    consecutiveErrors: (existing?.consecutiveErrors ?? 0) + 1,
    totalChecks: (existing?.totalChecks ?? 0) + 1,
    successCount: existing?.successCount ?? 0,
  };

  saveStore(store);
}

/**
 * Get all unhealthy sources (3+ consecutive errors).
 */
export function getUnhealthySources(): SourceHealthEntry[] {
  const store = loadStore();
  return Object.values(store.sources).filter(e => e.consecutiveErrors >= 3);
}

/**
 * List sources that will be auto-skipped on the next run.
 */
export function listSkipCandidates(): string[] {
  const store = loadStore();
  return Object.values(store.sources)
    .filter(e => e.consecutiveErrors >= 3)
    .map(e => e.name);
}
