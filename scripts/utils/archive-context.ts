import { readdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface RecentBriefingEntry {
  date: string;
  id: string;
  headlineEn: string;
  headlineZh: string;
}

const ARCHIVE_DIR = join('public', 'archive');
const DEFAULT_DAYS = 7;
const MAX_PER_DAY = 8;

export function loadRecentBriefings(days: number = DEFAULT_DAYS): RecentBriefingEntry[] {
  if (!existsSync(ARCHIVE_DIR)) return [];

  const files = readdirSync(ARCHIVE_DIR)
    .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .sort()
    .reverse()
    .slice(0, days);

  const entries: RecentBriefingEntry[] = [];

  for (const file of files) {
    const date = file.replace('.json', '');
    try {
      const raw = JSON.parse(readFileSync(join(ARCHIVE_DIR, file), 'utf8'));
      const stories = Array.isArray(raw?.stories) ? raw.stories : [];
      for (const s of stories.slice(0, MAX_PER_DAY)) {
        if (!s || typeof s !== 'object') continue;
        const id = typeof s.id === 'string' ? s.id : '';
        const headlineEn = typeof s.headlineEn === 'string' ? s.headlineEn : (typeof s.headline === 'string' ? s.headline : '');
        const headlineZh = typeof s.headlineZh === 'string' ? s.headlineZh : '';
        if (!id || !headlineEn) continue;
        entries.push({ date, id, headlineEn, headlineZh });
      }
    } catch {
      // skip malformed archive
    }
  }

  return entries;
}
