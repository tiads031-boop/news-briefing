import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { SourceHealthRecord } from '../hooks/useSourceHealth';

interface SourceHealthPanelProps {
  sources: SourceHealthRecord[];
}

export default function SourceHealthPanel({ sources }: SourceHealthPanelProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unhealthy'>('all');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
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

  const filtered = filter === 'unhealthy'
    ? sources.filter(s => s.consecutiveErrors >= 3 || s.successRate < 0.5)
    : sources;

  const getStatusIcon = (s: SourceHealthRecord) => {
    if (s.consecutiveErrors >= 3) return '🔴';
    if (s.consecutiveErrors >= 1) return '🟡';
    return '🟢';
  };

  const getStatusClass = (s: SourceHealthRecord) => {
    if (s.consecutiveErrors >= 3) return 'critical';
    if (s.consecutiveErrors >= 1) return 'warning';
    return 'healthy';
  };

  return (
    <div ref={containerRef} className="source-health-container">
      <button
        className="source-health-toggle"
        onClick={() => setIsOpen(!isOpen)}
        title={t('sourceHealth.title')}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
          <path d="m9 12 2 2 4-4" />
        </svg>
        {sources.some(s => s.consecutiveErrors >= 3) && (
          <span className="source-health-alert">!</span>
        )}
      </button>

      {isOpen && (
        <div className="source-health-dropdown">
          <div className="source-health-header">
            <span className="source-health-title">{t('sourceHealth.title')}</span>
            <div className="source-health-filters">
              <button
                className={filter === 'all' ? 'active' : ''}
                onClick={() => setFilter('all')}
              >
                {t('sourceHealth.all')}
              </button>
              <button
                className={filter === 'unhealthy' ? 'active' : ''}
                onClick={() => setFilter('unhealthy')}
              >
                {t('sourceHealth.unhealthy')}
              </button>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="source-health-empty">{t('sourceHealth.noData')}</div>
          ) : (
            <div className="source-health-list">
              {filtered.map(s => (
                <div key={s.name} className={`source-health-item ${getStatusClass(s)}`}>
                  <span className="source-health-icon">{getStatusIcon(s)}</span>
                  <div className="source-health-info">
                    <div className="source-health-name">{s.name}</div>
                    <div className="source-health-meta">
                      {t('sourceHealth.successRate')}: {Math.round(s.successRate * 100)}%
                      {' · '}
                      {t('sourceHealth.latency')}: {s.latencyMs}ms
                      {' · '}
                      {t('sourceHealth.items')}: {s.itemCount}
                    </div>
                  </div>
                  {s.consecutiveErrors > 0 && (
                    <span className="source-health-errors">
                      {s.consecutiveErrors}x
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
