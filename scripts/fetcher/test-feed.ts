/**
 * RSS feed health-check.
 *
 *   npm run test-feed                 # 检查 sources.ts 全部源
 *   npm run test-feed -- <url>        # 检查单个临时 URL
 *   npm run test-feed -- <url1> <url2>
 *
 * 输出每个源的状态(ok / empty / error)、延迟、item 数、首条标题。
 * 用于在合入新源前做 health check,或排查为什么某个源没产生文章。
 */
import Parser from 'rss-parser';
import { RSS_SOURCES, type RssSource } from './sources';

const TIMEOUT_MS = 15_000;

const parser = new Parser({
  timeout: TIMEOUT_MS,
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/rss+xml, application/xml, text/xml, */*',
    'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
  },
  requestOptions: {
    rejectUnauthorized: false,
  },
});

type Status = 'ok' | 'empty' | 'error';

interface Result {
  name: string;
  url: string;
  status: Status;
  latencyMs: number;
  items: number;
  firstTitle?: string;
  errorMessage?: string;
}

async function probe(source: { name: string; url: string }): Promise<Result> {
  const start = Date.now();
  try {
    const feed = await parser.parseURL(source.url);
    const latencyMs = Date.now() - start;
    const items = feed.items?.length ?? 0;
    if (items === 0) {
      return { name: source.name, url: source.url, status: 'empty', latencyMs, items };
    }
    return {
      name: source.name,
      url: source.url,
      status: 'ok',
      latencyMs,
      items,
      firstTitle: (feed.items![0].title || '').trim().slice(0, 80),
    };
  } catch (err) {
    return {
      name: source.name,
      url: source.url,
      status: 'error',
      latencyMs: Date.now() - start,
      items: 0,
      errorMessage: err instanceof Error ? err.message : String(err),
    };
  }
}

function statusIcon(s: Status): string {
  return s === 'ok' ? '✅' : s === 'empty' ? '⚠️ ' : '❌';
}

async function main() {
  const args = process.argv.slice(2);

  let targets: { name: string; url: string }[];
  if (args.length > 0) {
    targets = args.map((url, i) => ({ name: `arg#${i + 1}`, url }));
    console.log(`Probing ${targets.length} URL(s) from CLI args...`);
  } else {
    targets = (RSS_SOURCES as RssSource[]).map(s => ({ name: s.name, url: s.url }));
    console.log(`Probing ${targets.length} sources from sources.ts...`);
  }
  console.log('');

  const results = await Promise.all(targets.map(probe));

  // Print: ok first, then empty, then error
  const statusRank: Record<Status, number> = { ok: 0, empty: 1, error: 2 };
  results.sort((a, b) => statusRank[a.status] - statusRank[b.status] || a.name.localeCompare(b.name));

  const nameWidth = Math.max(...results.map(r => r.name.length), 4);
  const statusW = 4;
  const latW = 8;
  const itemsW = 6;

  console.log(
    `${'NAME'.padEnd(nameWidth)}  ${'ST'.padEnd(statusW)}  ${'LATENCY'.padStart(latW)}  ${'ITEMS'.padStart(itemsW)}  TITLE / ERROR`
  );
  console.log('-'.repeat(nameWidth + statusW + latW + itemsW + 30));

  for (const r of results) {
    const icon = statusIcon(r.status);
    const lat = `${r.latencyMs}ms`;
    const detail = r.status === 'error'
      ? `[${(r.errorMessage || '').slice(0, 80)}]`
      : (r.firstTitle || '(no title)');
    console.log(
      `${r.name.padEnd(nameWidth)}  ${icon.padEnd(statusW)}  ${lat.padStart(latW)}  ${String(r.items).padStart(itemsW)}  ${detail}`
    );
  }

  const ok = results.filter(r => r.status === 'ok').length;
  const empty = results.filter(r => r.status === 'empty').length;
  const err = results.filter(r => r.status === 'error').length;
  console.log('');
  console.log(`Summary: ${ok} ok / ${empty} empty / ${err} error  (total ${results.length})`);

  if (err > 0) {
    console.log('');
    console.log('Failing sources:');
    for (const r of results.filter(x => x.status === 'error')) {
      console.log(`  - ${r.name}: ${r.url}`);
      console.log(`      ${r.errorMessage}`);
    }
  }
}

main().catch(e => {
  console.error('Health check pipeline crashed:', e);
  process.exit(1);
});
