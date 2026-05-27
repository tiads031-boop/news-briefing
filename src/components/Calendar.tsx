import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

export interface IssueConfig {
  startDate: string;
  startIssue: number;
}

interface CalendarProps {
  availableDates: string[];
  selectedDate: string | null;
  issueConfig: IssueConfig | null;
  onSelectDate: (date: string) => void;
  onClose: () => void;
}

const MS_PER_DAY = 86_400_000;

function parseUtcDate(s: string): number {
  return Date.parse(s + 'T00:00:00Z');
}

export function calculateIssueNumber(dateStr: string, config: IssueConfig | null): number | null {
  if (!config) return null;
  const start = parseUtcDate(config.startDate);
  const target = parseUtcDate(dateStr);
  if (Number.isNaN(start) || Number.isNaN(target)) return null;
  const days = Math.round((target - start) / MS_PER_DAY);
  if (days < 0) return null;
  return config.startIssue + days;
}

export function todayUtcDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function shiftUtcDate(yyyyMmDd: string, deltaDays: number): string {
  const [y, m, d] = yyyyMmDd.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + deltaDays);
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

interface CalendarCell {
  dateStr: string;
  day: number;
}

function buildMonthCells(year: number, month: number): Array<CalendarCell | null> {
  const first = new Date(year, month, 1);
  const dow = first.getDay();
  const leading = (dow + 6) % 7;
  const last = new Date(year, month + 1, 0).getDate();

  const cells: Array<CalendarCell | null> = [];
  for (let i = 0; i < leading; i++) cells.push(null);
  for (let d = 1; d <= last; d++) {
    const dt = new Date(year, month, d);
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    cells.push({ dateStr: `${y}-${m}-${day}`, day: d });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export default function Calendar({
  availableDates,
  selectedDate,
  issueConfig,
  onSelectDate,
  onClose,
}: CalendarProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'zh' ? 'zh-CN' : 'en-US';

  const today = todayUtcDate();
  const initialView = useMemo(() => {
    const ref = selectedDate || today;
    const [y, m, d] = ref.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    return { year: dt.getFullYear(), month: dt.getMonth() };
  }, [selectedDate, today]);

  const [view, setView] = useState(initialView);

  const availableSet = useMemo(() => new Set(availableDates), [availableDates]);
  const cells = useMemo(() => buildMonthCells(view.year, view.month), [view]);

  const monthLabel = useMemo(() => {
    const d = new Date(view.year, view.month, 1);
    return d.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
    });
  }, [view, locale]);

  const weekdays = useMemo(() => {
    return [0, 1, 2, 3, 4, 5, 6].map((i) => {
      const d = new Date(2024, 0, 1 + i);
      return d.toLocaleDateString(locale, { weekday: 'short' });
    });
  }, [locale]);

  const goPrev = () =>
    setView((v) => (v.month === 0 ? { year: v.year - 1, month: 11 } : { year: v.year, month: v.month - 1 }));
  const goNext = () =>
    setView((v) => (v.month === 11 ? { year: v.year + 1, month: 0 } : { year: v.year, month: v.month + 1 }));

  return (
    <div className="calendar-overlay" role="dialog" aria-label={t('calendar.title')}>
      <div className="calendar-backdrop" onClick={onClose} />
      <div className="calendar-panel" role="document">
        <div className="calendar-head">
          <button type="button" className="calendar-nav" onClick={goPrev} aria-label={t('calendar.prevMonth')}>
            ‹
          </button>
          <span className="calendar-title">{monthLabel}</span>
          <button type="button" className="calendar-nav" onClick={goNext} aria-label={t('calendar.nextMonth')}>
            ›
          </button>
          <button type="button" className="calendar-close" onClick={onClose} aria-label={t('calendar.close')}>
            ×
          </button>
        </div>
        <div className="calendar-weekdays">
          {weekdays.map((w, i) => (
            <span key={i} className="calendar-weekday">
              {w}
            </span>
          ))}
        </div>
        <div className="calendar-grid">
          {cells.map((cell, i) => {
            if (!cell) return <span key={i} className="calendar-cell calendar-cell-empty" aria-hidden="true" />;
            const isAvailable = availableSet.has(cell.dateStr);
            const isSelected = cell.dateStr === selectedDate;
            const isToday = cell.dateStr === today;
            const issue = calculateIssueNumber(cell.dateStr, issueConfig);
            const cls = [
              'calendar-cell',
              isAvailable ? 'is-available' : 'is-unavailable',
              isSelected ? 'is-selected' : '',
              isToday ? 'is-today' : '',
            ]
              .filter(Boolean)
              .join(' ');
            return (
              <button
                key={i}
                type="button"
                className={cls}
                disabled={!isAvailable}
                onClick={() => isAvailable && onSelectDate(cell.dateStr)}
                title={isAvailable ? cell.dateStr : undefined}
              >
                <span className="calendar-day">{cell.day}</span>
                {issue !== null && <span className="calendar-issue">{t('calendar.issue', { n: issue })}</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
