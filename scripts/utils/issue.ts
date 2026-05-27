import { readFileSync } from 'fs';
import { join } from 'path';

export interface IssueConfig {
  startDate: string;
  startIssue: number;
  description?: string;
}

const MS_PER_DAY = 86_400_000;

function parseUtcDate(yyyyMmDd: string): number {
  const ts = Date.parse(yyyyMmDd + 'T00:00:00Z');
  if (Number.isNaN(ts)) {
    throw new Error(`Invalid date string: ${yyyyMmDd}`);
  }
  return ts;
}

export function loadIssueConfig(publicDir = 'public'): IssueConfig {
  const configPath = join(publicDir, 'issue-config.json');
  const raw = readFileSync(configPath, 'utf-8');
  const parsed = JSON.parse(raw) as Partial<IssueConfig>;
  if (!parsed.startDate || typeof parsed.startIssue !== 'number') {
    throw new Error(`Invalid issue-config.json at ${configPath}`);
  }
  return {
    startDate: parsed.startDate,
    startIssue: parsed.startIssue,
    description: parsed.description,
  };
}

export function calculateIssueNumber(targetDate: string, config: IssueConfig): number {
  const start = parseUtcDate(config.startDate);
  const target = parseUtcDate(targetDate);
  const days = Math.round((target - start) / MS_PER_DAY);
  return config.startIssue + days;
}

export function todayUtcDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
