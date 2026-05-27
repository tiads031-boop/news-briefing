/**
 * One-shot script: rank existing stories in public/news-data.json
 * Usage: npx tsx scripts/rank-existing.ts
 */
import 'dotenv/config';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { rankStories } from './analyzer/rank';
import { info, success, error } from './utils/logger';

const DATA_PATH = join(process.cwd(), 'public', 'news-data.json');
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY || '';

async function main() {
  const raw = readFileSync(DATA_PATH, 'utf-8');
  const data = JSON.parse(raw);

  const stories = data.stories || [];
  if (stories.length < 2) {
    info(`Only ${stories.length} stories — skipping ranking`);
    return;
  }

  // Rank only top stories by source density to stay within API limits
  const toRank = [...stories]
    .sort((a: any, b: any) => (b.sources || []).length - (a.sources || []).length)
    .slice(0, 12);
  info(`Ranking top ${toRank.length}/${stories.length} stories...`);

  const ranking = await rankStories(
    toRank.map((s: any) => ({
      id: s.id,
      topicTier: s.topicTier || '',
      headlineEn: s.headlineEn || s.headline,
      headlineZh: s.headlineZh || s.headline,
      leadEn: s.leadEn || s.lead || '',
      leadZh: s.leadZh || s.lead || '',
      time: s.time || '',
      sourceCount: (s.sources || []).length,
      runningCoverage: !!s.runningCoverage,
    })),
    DEEPSEEK_KEY
  );

  if (ranking && ranking.length > 0) {
    data.ranking = ranking;
    writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
    success(`Ranked ${ranking.length} stories and wrote to news-data.json`);
  } else {
    error('Ranking returned empty — data not modified');
  }
}

main().catch((e) => {
  error('Ranking failed', e);
  process.exit(1);
});
