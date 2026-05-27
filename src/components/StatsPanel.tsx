import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface WeeklyItem {
  date: string;
  labelZh: string;
  labelEn: string;
  readCount: number;
}

interface StatsPanelProps {
  totalRead: number;
  totalMinutes: number;
  weeklyReadCount: number;
  weeklySeries: WeeklyItem[];
  bookmarkCount: number;
  onMarkAllRead?: () => void;
}

export default function StatsPanel({
  totalRead,
  totalMinutes,
  weeklyReadCount,
  weeklySeries,
  bookmarkCount,
  onMarkAllRead,
}: StatsPanelProps) {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false);
    }
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('click', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('click', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const maxWeekly = Math.max(...weeklySeries.map(d => d.readCount), 1);

  return (
    <div ref={containerRef} className="stats-panel-container">
      <button className="stats-panel-toggle" onClick={() => setIsOpen(!isOpen)} title={t('stats.title')}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3v18h18" />
          <path d="m19 9-5 5-4-4-3 3" />
        </svg>
      </button>

      {isOpen && (
        <div className="stats-panel-dropdown">
          <div className="stats-panel-header">
            <span className="stats-panel-title">{t('stats.title')}</span>
            {onMarkAllRead && (
              <button className="bookmark-btn" onClick={onMarkAllRead}>{t('stats.markAllRead')}</button>
            )}
          </div>

          <div className="stats-grid">
            <div className="stats-card">
              <div className="stats-card-value">{totalRead}</div>
              <div className="stats-card-label">{t('stats.totalStories')}</div>
            </div>
            <div className="stats-card">
              <div className="stats-card-value">{weeklyReadCount}</div>
              <div className="stats-card-label">{t('stats.thisWeek')}</div>
            </div>
            <div className="stats-card">
              <div className="stats-card-value">{bookmarkCount}</div>
              <div className="stats-card-label">{t('stats.bookmarks')}</div>
            </div>
          </div>

          <div className="stats-section">
            <div className="stats-section-title">{t('stats.weeklyTrend')}</div>
            <div className="stats-bar-chart">
              {weeklySeries.map((day) => (
                <div key={day.date} className="stats-bar-item">
                  <div className="stats-bar-track">
                    <div
                      className="stats-bar-fill"
                      style={{ height: `${Math.max(3, (day.readCount / maxWeekly) * 100)}%` }}
                    />
                  </div>
                  <div className="stats-bar-label">{i18n.language === 'zh' ? day.labelZh : day.labelEn}</div>
                  <div className="stats-bar-value">{day.readCount}</div>
                </div>
              ))}
            </div>
            <div className="stats-minutes">{t('stats.totalTime')}: {totalMinutes}{i18n.language === 'zh' ? ' 分钟' : ' min'}</div>
          </div>
        </div>
      )}
    </div>
  );
}
