#!/usr/bin/env tsx
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { OFFICIAL_GLOSSARY_TERM_LINKS } from './utils/official-glossary';

type Lang = 'en' | 'zh';

interface JargonItem {
  term?: string;
  explanation?: string;
  domain?: string;
  sourceName?: string;
  sourceUrl?: string;
  sourceType?: string;
  sourceMatchLevel?: 'exact' | 'domain' | 'homepage';
}

interface StoryLike {
  financeJargonEn?: JargonItem[];
  financeJargonZh?: JargonItem[];
}

interface NewsLike {
  stories?: StoryLike[];
}

interface CandidateRecord {
  term: string;
  language: Lang;
  domain?: string;
  count: number;
  matched: boolean;
  firstSeenIn: string;
  sampleExplanation?: string;
  currentMatchLevel?: 'exact' | 'domain' | 'homepage';
}

function normalize(input: string): string {
  return input.toLowerCase().replace(/[\s_\-]+/g, ' ').trim();
}

function readJson(path: string): NewsLike | null {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as NewsLike;
  } catch {
    return null;
  }
}

function collectFromStories(
  stories: StoryLike[] | undefined,
  label: string,
  map: Map<string, CandidateRecord>,
  knownAliases: Set<string>
) {
  if (!Array.isArray(stories)) return;

  const collect = (items: JargonItem[] | undefined, language: Lang) => {
    if (!Array.isArray(items)) return;
    for (const item of items) {
      const term = (item?.term || '').trim();
      if (!term) continue;
      const key = `${language}|${normalize(term)}`;
      const current = map.get(key);
      const matched = knownAliases.has(normalize(term));
      const record: CandidateRecord = current || {
        term,
        language,
        domain: item?.domain,
        count: 0,
        matched,
        firstSeenIn: label,
        sampleExplanation: item?.explanation,
        currentMatchLevel: item?.sourceMatchLevel,
      };

      record.count += 1;
      if (!record.domain && item?.domain) record.domain = item.domain;
      if (!record.sampleExplanation && item?.explanation) record.sampleExplanation = item.explanation;
      if (!record.currentMatchLevel && item?.sourceMatchLevel) record.currentMatchLevel = item.sourceMatchLevel;
      record.matched = record.matched || matched;

      map.set(key, record);
    }
  };

  for (const story of stories) {
    collect(story.financeJargonEn, 'en');
    collect(story.financeJargonZh, 'zh');
  }
}

function main() {
  const root = process.cwd();
  const publicDir = join(root, 'public');
  const archiveDir = join(publicDir, 'archive');

  const knownAliases = new Set(
    OFFICIAL_GLOSSARY_TERM_LINKS.flatMap(link => link.aliases.map(alias => normalize(alias)))
  );

  const map = new Map<string, CandidateRecord>();

  const latest = readJson(join(publicDir, 'news-data.json'));
  if (latest) collectFromStories(latest.stories, 'latest:news-data.json', map, knownAliases);

  if (existsSync(archiveDir)) {
    const files = readdirSync(archiveDir)
      .filter(file => file.endsWith('.json'))
      .sort();

    for (const file of files) {
      const data = readJson(join(archiveDir, file));
      if (!data) continue;
      collectFromStories(data.stories, `archive:${file}`, map, knownAliases);
    }
  }

  const all = [...map.values()].sort((a, b) => b.count - a.count || a.language.localeCompare(b.language));
  const unresolved = all.filter(x => !x.matched);

  const output = {
    generatedAt: new Date().toISOString(),
    totalTerms: all.length,
    unresolvedTerms: unresolved.length,
    unresolvedRatio: all.length ? Number((unresolved.length / all.length).toFixed(4)) : 0,
    topUnresolved: unresolved.slice(0, 80),
    allTerms: all,
  };

  const reportDir = join(root, 'reports');
  mkdirSync(reportDir, { recursive: true });
  const outputPath = join(reportDir, 'glossary-term-candidates.json');
  writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');

  console.log(`Scanned terms: ${all.length}`);
  console.log(`Unresolved terms: ${unresolved.length}`);
  console.log(`Report: ${outputPath}`);

  if (unresolved.length > 0) {
    console.log('\nTop unresolved terms:');
    unresolved.slice(0, 20).forEach((row, idx) => {
      console.log(`${String(idx + 1).padStart(2, '0')}. [${row.language}] ${row.term} x${row.count}${row.domain ? ` | ${row.domain}` : ''}`);
    });
  }
}

main();
