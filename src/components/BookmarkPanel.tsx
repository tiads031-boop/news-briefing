import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { BookmarkItem } from '../hooks/useBookmarks';

interface BookmarkPanelProps {
  bookmarks: BookmarkItem[];
  onRemove: (storyId: string) => void;
  onNavigate: (issueDate: string, storyId: string) => void;
  onClearAll: () => void;
}

export default function BookmarkPanel({ bookmarks, onRemove, onNavigate, onClearAll }: BookmarkPanelProps) {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
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

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(i18n.language === 'zh' ? 'zh-CN' : 'en-US', {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div ref={containerRef} className="bookmark-panel-container">
      <button
        className="bookmark-panel-toggle"
        onClick={() => setIsOpen(!isOpen)}
        title={t('bookmark.title')}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
        </svg>
        {bookmarks.length > 0 && (
          <span className="bookmark-panel-badge">{bookmarks.length}</span>
        )}
      </button>

      {isOpen && (
        <div className="bookmark-panel-dropdown">
          <div className="bookmark-panel-header">
            <span className="bookmark-panel-title">{t('bookmark.title')}</span>
            {bookmarks.length > 0 && (
              <button className="bookmark-panel-clear" onClick={onClearAll}>
                {t('bookmark.clearAll')}
              </button>
            )}
          </div>

          {bookmarks.length === 0 ? (
            <div className="bookmark-panel-empty">{t('bookmark.empty')}</div>
          ) : (
            <div className="bookmark-panel-list">
              {bookmarks.map((b) => {
                const headline = i18n.language === 'zh'
                  ? (b.headlineZh || b.headline)
                  : (b.headlineEn || b.headline);
                return (
                  <div key={b.storyId} className="bookmark-panel-item">
                    <button
                      className="bookmark-panel-item-nav"
                      onClick={() => {
                        onNavigate(b.issueDate, b.storyId);
                        setIsOpen(false);
                      }}
                    >
                      <div className="bookmark-panel-item-title">{headline}</div>
                      <div className="bookmark-panel-item-meta">
                        <span className="bookmark-panel-item-topic">{b.topic}</span>
                        <span className="bookmark-panel-item-date">{formatDate(b.issueDate)}</span>
                      </div>
                    </button>
                    <button
                      className="bookmark-panel-item-remove"
                      onClick={() => onRemove(b.storyId)}
                      title={t('bookmark.remove')}
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
