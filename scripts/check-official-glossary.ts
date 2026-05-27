#!/usr/bin/env tsx
import { getOfficialGlossaryHealthTargets } from './utils/official-glossary';

const TIMEOUT_MS = 15_000;

type Status = 'ok' | 'blocked' | 'error';

interface Result {
  id: string;
  label: string;
  url: string;
  kind: 'source' | 'term';
  status: Status;
  httpStatus?: number;
  latencyMs: number;
  error?: string;
}

async function probe(target: ReturnType<typeof getOfficialGlossaryHealthTargets>[number]): Promise<Result> {
  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    let response = await fetch(target.url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'GlobalPulse official glossary health check/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (response.status === 405) {
      response = await fetch(target.url, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          'User-Agent': 'GlobalPulse official glossary health check/1.0',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });
    }

    const latencyMs = Date.now() - start;
    const status: Status = response.ok || (response.status >= 300 && response.status < 400)
      ? 'ok'
      : (response.status === 401 || response.status === 403 ? 'blocked' : 'error');

    return {
      ...target,
      status,
      httpStatus: response.status,
      latencyMs,
    };
  } catch (err) {
    return {
      ...target,
      status: 'error',
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    };
  } finally {
    clearTimeout(timer);
  }
}

function icon(status: Status): string {
  if (status === 'ok') return '✅';
  if (status === 'blocked') return '🟨';
  return '❌';
}

async function main() {
  const targets = getOfficialGlossaryHealthTargets();
  console.log(`Probing ${targets.length} official glossary targets...\n`);

  const results = await Promise.all(targets.map(probe));
  const sorted = [...results].sort((a, b) => {
    const order = { ok: 0, blocked: 1, error: 2 } as const;
    return order[a.status] - order[b.status] || a.kind.localeCompare(b.kind) || a.label.localeCompare(b.label);
  });

  for (const result of sorted) {
    const code = result.httpStatus ? `HTTP ${result.httpStatus}` : result.error || 'unknown error';
    console.log(`${icon(result.status)} ${result.kind.padEnd(6)} ${String(result.latencyMs).padStart(5)}ms  ${result.label}`);
    console.log(`   ${code} · ${result.url}`);
  }

  const ok = results.filter(r => r.status === 'ok').length;
  const blocked = results.filter(r => r.status === 'blocked').length;
  const error = results.filter(r => r.status === 'error').length;
  console.log(`\nSummary: ${ok} ok / ${blocked} blocked / ${error} error`);

  if (error > 0) {
    process.exitCode = 1;
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
