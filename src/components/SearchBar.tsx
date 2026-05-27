import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { SearchResult } from '../hooks/useSearch';

interface SearchBarProps {
  query: string;
  onQueryChange: (q: string) => void;
  results: SearchResult[];
  isSearching: boolean;
  searchScope: 'current' | 'all';
  onScopeChange: (scope: 'current' | 'all') => void;
  onResultClick: (storyId: string) => void;
  onClear: () => void;
}

export default function SearchBar({
  query,
  onQueryChange,
  results,
  isSearching,
  searchScope,
  onScopeChange,
  onResultClick,
  onClear,
}: SearchBarProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      onClear();
    }
  };

  const handleResultClick = (storyId: string) => {
    onResultClick(storyId);
    setIsOpen(false);
    onClear();
  };

  return (
    <div ref={containerRef} className="search-bar-container">
      <button
        className="search-toggle-btn"
        onClick={() => setIsOpen(!isOpen)}
        title={t('search.title')}
        aria-label={t('search.title')}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </button>

      {isOpen && (
        <div className="search-dropdown">
          <div className="search-input-row">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="search-icon">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              className="search-input"
              placeholder={t('search.placeholder')}
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            {query && (
              <button className="search-clear-btn" onClick={onClear}>
                ×
              </button>
            )}
          </div>

          <div className="search-scope-row">
            <label className={`search-scope-label ${searchScope === 'current' ? 'active' : ''}`}>
              <input
                type="radio"
                name="searchScope"
                value="current"
                checked={searchScope === 'current'}
                onChange={() => onScopeChange('current')}
              />
              {t('search.scopeCurrent')}
            </label>
            <label className={`search-scope-label ${searchScope === 'all' ? 'active' : ''}`}>
              <input
                type="radio"
                name="searchScope"
                value="all"
                checked={searchScope === 'all'}
                onChange={() => onScopeChange('all')}
              />
              {t('search.scopeAll')}
            </label>
          </div>

          {isSearching && (
            <div className="search-loading">{t('search.loading')}</div>
          )}

          {!isSearching && query.trim() && results.length === 0 && (
            <div className="search-no-results">{t('search.noResults')}</div>
          )}

          {results.length > 0 && (
            <div className="search-results">
              {results.map((r) => {
                const headline = r.story.headlineZh || r.story.headlineEn || r.story.headline;
                const lead = r.story.leadZh || r.story.leadEn || r.story.lead;
                return (
                  <button
                    key={r.story.id}
                    className="search-result-item"
                    onClick={() => handleResultClick(r.story.id)}
                  >
                    <div className="search-result-title">{headline}</div>
                    <div className="search-result-snippet">{lead.slice(0, 80)}...</div>
                    <div className="search-result-meta">
                      <span className="search-result-topic">{r.story.topic}</span>
                      <span className="search-result-score">
                        {Math.round((1 - r.score) * 100)}% {t('search.match')}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
