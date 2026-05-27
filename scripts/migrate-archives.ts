import { existsSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { calculateIssueNumber, loadIssueConfig } from './utils/issue';

const PUBLIC_DIR = 'public';
const ARCHIVE_DIR = join(PUBLIC_DIR, 'archive');
const LATEST_FILE = join(PUBLIC_DIR, 'news-data.json');
const ARCHIVE_FILE_RE = /^(\d{4}-\d{2}-\d{2})\.json$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}/;

function backfill(filePath: string, dateStr: string, config: ReturnType<typeof loadIssueConfig>, label: string) {
  const raw = readFileSync(filePath, 'utf-8');
  const data = JSON.parse(raw) as Record<string, unknown>;
  const issueNumber = calculateIssueNumber(dateStr, config);
  const before = JSON.stringify({ n: data.issueNumber, d: data.issueDate });

  data.issueNumber = issueNumber;
  data.issueDate = dateStr;

  const after = JSON.stringify({ n: data.issueNumber, d: data.issueDate });
  if (before === after) {
    console.log(`  ${label}: 第 ${issueNumber} 期 (unchanged)`);
    return false;
  }

  writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`  ${label}: 第 ${issueNumber} 期 (updated)`);
  return true;
}

function main() {
  const config = loadIssueConfig();
  console.log(`Loaded issue config: startDate=${config.startDate}, startIssue=${config.startIssue}`);

  let files: string[] = [];
  try {
    files = readdirSync(ARCHIVE_DIR);
  } catch (e) {
    console.error(`Failed to read ${ARCHIVE_DIR}: ${(e as Error).message}`);
    process.exit(1);
  }

  const archives = files.filter((f) => ARCHIVE_FILE_RE.test(f)).sort();
  let updated = 0;
  let unchanged = 0;

  for (const file of archives) {
    const match = file.match(ARCHIVE_FILE_RE);
    if (!match) continue;
    const dateStr = match[1];
    const filePath = join(ARCHIVE_DIR, file);
    if (backfill(filePath, dateStr, config, file)) updated += 1;
    else unchanged += 1;
  }

  if (existsSync(LATEST_FILE)) {
    const raw = readFileSync(LATEST_FILE, 'utf-8');
    const data = JSON.parse(raw) as Record<string, unknown>;
    const generatedAt = typeof data.generatedAt === 'string' ? data.generatedAt : '';
    const dateMatch = generatedAt.match(ISO_DATE_RE);
    if (dateMatch) {
      const dateStr = dateMatch[0];
      if (backfill(LATEST_FILE, dateStr, config, 'news-data.json')) updated += 1;
      else unchanged += 1;
    } else {
      console.log('  news-data.json: skipped (no parseable generatedAt)');
    }
  }

  console.log(`Migration complete: ${updated} updated, ${unchanged} unchanged.`);
}

main();
