import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { loadArchiveDates } from '../hooks/useArchiveDates';
import Calendar, {
  calculateIssueNumber,
  shiftUtcDate,
  todayUtcDate,
  type IssueConfig,
} from './Calendar';

interface DateSwitcherProps {
  selectedDate: string | null;
  onChange: (date: string | null) => void;
  sortMode?: 'ai' | 'newest';
  onSortChange?: (mode: 'ai' | 'newest') => void;
  hasRanking?: boolean;
  rightControls?: ReactNode;
}

async function fetchIssueConfig(): Promise<IssueConfig | null> {
  const parse = (j: unknown): IssueConfig | null => {
    if (j && typeof j === 'object') {
      const o = j as Record<string, unknown>;
      if (typeof o.startDate === 'string' && typeof o.startIssue === 'number') {
        return { startDate: o.startDate, startIssue: o.startIssue };
      }
    }
    return null;
  };
  try {
    const r = await fetch('/api/issue-config');
    if (r.ok) {
      const cfg = parse(await r.json());
      if (cfg) return cfg;
    }
  } catch { /* fall through to static */ }
  try {
    const r = await fetch('/issue-config.json');
    if (r.ok) {
      const cfg = parse(await r.json());
      if (cfg) return cfg;
    }
  } catch { /* ignore */ }
  return null;
}

export default function DateSwitcher({ selectedDate, onChange, sortMode = 'ai', onSortChange, hasRanking = false, rightControls }: DateSwitcherProps) {
  const { t } = useTranslation();
  const [dates, setDates] = useState<string[]>([]);
  const [config, setConfig] = useState<IssueConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [methodologyOpen, setMethodologyOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadArchiveDates(), fetchIssueConfig()]).then(([datesRes, cfg]) => {
      if (cancelled) return;
      setDates(datesRes);
      setConfig(cfg);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const today = todayUtcDate();
  const yesterday = useMemo(() => shiftUtcDate(today, -1), [today]);
  const availableSet = useMemo(() => new Set(dates), [dates]);
  const todayAvailable = availableSet.has(today);
  const yesterdayAvailable = availableSet.has(yesterday);

  if (loading) return null;
  if (dates.length === 0 && !config) return null;

  const isCustomDate = selectedDate !== null && selectedDate !== today && selectedDate !== yesterday;
  const customIssue = isCustomDate ? calculateIssueNumber(selectedDate, config) : null;

  return (
    <nav className="date-switcher" aria-label={t('dateSwitcher.label')}>
      <div className="date-switcher-main">
      <span className="date-switcher-label">{t('dateSwitcher.label')}</span>
      <div className="date-switcher-pills">
        <button
          type="button"
          className={`date-pill ${selectedDate === null ? 'active' : ''}`}
          onClick={() => onChange(null)}
        >
          {t('dateSwitcher.latest')}
        </button>
        <button
          type="button"
          className={`date-pill ${selectedDate === today ? 'active' : ''}`}
          disabled={!todayAvailable}
          onClick={() => todayAvailable && onChange(today)}
          title={today}
        >
          {t('dateSwitcher.today')}
        </button>
        <button
          type="button"
          className={`date-pill ${selectedDate === yesterday ? 'active' : ''}`}
          disabled={!yesterdayAvailable}
          onClick={() => yesterdayAvailable && onChange(yesterday)}
          title={yesterday}
        >
          {t('dateSwitcher.yesterday')}
        </button>
        {isCustomDate && (
          <span className="date-pill date-pill-custom active" title={selectedDate ?? undefined}>
            {customIssue !== null
              ? `${t('calendar.issue', { n: customIssue })} · ${selectedDate}`
              : selectedDate}
          </span>
        )}
        <button
          type="button"
          className="date-pill date-pill-icon"
          aria-label={t('dateSwitcher.openCalendar')}
          onClick={() => setCalendarOpen(true)}
        >
          <svg className="cal-icon" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
            <rect x="3" y="5" width="18" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <path d="M3 10h18" stroke="currentColor" strokeWidth="1.6" />
            <path d="M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
        {onSortChange && (
          <>
            <span className="date-switcher-sep" aria-hidden="true" />
            <span className="date-switcher-label">{t('dateSwitcher.sortLabel')}</span>
            {hasRanking && (
              <button
                type="button"
                className={`date-pill ${sortMode === 'ai' ? 'active' : ''}`}
                onClick={() => onSortChange('ai')}
              >
                {t('dateSwitcher.sortAi')}
              </button>
            )}
            {hasRanking && (
              <span className="ranking-methodology-wrap">
                <button
                  type="button"
                  className="ranking-methodology-trigger"
                  aria-label={t('ranking.methodology')}
                  onMouseEnter={() => setMethodologyOpen(true)}
                  onMouseLeave={() => setMethodologyOpen(false)}
                  onClick={() => setMethodologyOpen(v => !v)}
                >
                  ?
                </button>
                {methodologyOpen && (
                  <div className="ranking-methodology-tooltip">
                    <h4>{t('ranking.methodology')}</h4>
                    <ol>
                      <li><span className="dim-weight">25%</span> {t('ranking.dimMarket')}</li>
                      <li><span className="dim-weight">20%</span> {t('ranking.dimRecency')}</li>
                      <li><span className="dim-weight">20%</span> {t('ranking.dimGlobal')}</li>
                      <li><span className="dim-weight">20%</span> {t('ranking.dimRelevance')}</li>
                      <li><span className="dim-weight">10%</span> {t('ranking.dimSource')}</li>
                      <li><span className="dim-weight">5%</span> {t('ranking.dimNovelty')}</li>
                    </ol>
                  </div>
                )}
              </span>
            )}
            <button
              type="button"
              className={`date-pill ${sortMode === 'newest' ? 'active' : ''}`}
              onClick={() => onSortChange('newest')}
            >
              {t('dateSwitcher.sortNewest')}
            </button>
          </>
        )}
        <button
          type="button"
          className="date-pill date-pill-reupdate"
          onClick={() => window.dispatchEvent(new CustomEvent('news-update-request', { detail: { force: false } }))}
          title={t('dateSwitcher.reUpdate')}
        >
          <svg className="reupdate-icon" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
            <path d="M23 4v6h-6M1 20v-6h6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>{t('dateSwitcher.reUpdate')}</span>
        </button>
      </div>
      </div>
      {rightControls && <div className="date-switcher-tools">{rightControls}</div>}
      {calendarOpen && (
        <Calendar
          availableDates={dates}
          selectedDate={selectedDate}
          issueConfig={config}
          onSelectDate={(d) => {
            onChange(d);
            setCalendarOpen(false);
          }}
          onClose={() => setCalendarOpen(false)}
        />
      )}
    </nav>
  );
}
