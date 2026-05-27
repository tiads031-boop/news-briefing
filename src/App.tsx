import { useState, useMemo, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Header from './components/Header';
import StoryCard from './components/StoryCard';
import Sidebar from './components/Sidebar';
import AlsoToday from './components/AlsoToday';
import Footer from './components/Footer';
import UpdatePrompt from './components/UpdatePrompt';
import DateSwitcher from './components/DateSwitcher';
import SearchBar from './components/SearchBar';
import BookmarkPanel from './components/BookmarkPanel';
import StatsPanel from './components/StatsPanel';
import SourceHealthPanel from './components/SourceHealthPanel';
import PdfExport from './components/PdfExport';
import { useNews } from './hooks/useNews';
import { useArchiveDates } from './hooks/useArchiveDates';
import { useSearch } from './hooks/useSearch';
import { useBookmarks } from './hooks/useBookmarks';
import { useReadingStats } from './hooks/useReadingStats';
import { useSourceHealth } from './hooks/useSourceHealth';
import { stories as fallbackStories, alsoToday as fallbackAlsoToday, sourceList as fallbackSourceList } from './data';

function App() {
  const { t, i18n } = useTranslation();
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [lens, setLens] = useState('all');
  const [sortMode, setSortMode] = useState<'ai' | 'newest'>('ai');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [targetStoryId, setTargetStoryId] = useState<string | null>(null);
  const { data, loading, error, hasNewData, refresh, dismissNewData } = useNews(selectedDate);
  const { dates: archiveDates } = useArchiveDates();

  // Search
  const {
    query: searchQuery,
    setQuery: setSearchQuery,
    results: searchResults,
    isSearching: isSearchLoading,
    searchScope,
    setSearchScope,
    clearSearch,
  } = useSearch({ data, archiveDates });

  // Bookmarks
  const { bookmarks, isBookmarked, toggleBookmark } = useBookmarks();

  // Reading stats
  const {
    summary: readingSummary,
    trackExposure,
    trackInteraction,
    updateScrollDepth,
    trackHeartbeat,
    markStoryRead,
    markAllRead,
    isStoryRead,
    getWeeklyReadSeries,
  } = useReadingStats();

  // Source health
  const { health: sourceHealth } = useSourceHealth();

  const stories = data?.stories ?? fallbackStories;
  const alsoToday = data?.alsoToday ?? fallbackAlsoToday;
  const sourceList = data?.sourceList ?? fallbackSourceList;
  const hasRealData = !!data;
  const isArchive = selectedDate !== null;
  const availableDatesSet = useMemo(() => new Set(archiveDates), [archiveDates]);

  // Unread/new stories are now based on read-state per issueDate
  const storyIds = useMemo(() => stories.map(s => s.id), [stories]);
  const unreadStoryIds = useMemo(
    () => storyIds.filter(id => !isStoryRead(id, data?.issueDate)),
    [storyIds, isStoryRead, data?.issueDate],
  );
  const unreadSet = useMemo(() => new Set(unreadStoryIds), [unreadStoryIds]);
  const hasNew = unreadStoryIds.length > 0;
  const newCount = unreadStoryIds.length;
  const isNew = useCallback((storyId: string) => unreadSet.has(storyId), [unreadSet]);

  // Per-category new counts for red dots on category pills
  const newByCategory = useMemo(() => {
    if (!hasNew) return {};
    const counts: Record<string, number> = {};
    for (const s of stories) {
      if (!unreadSet.has(s.id)) continue;
      const tier = s.topicTier;
      if (tier === 'geopolitics') counts['geo'] = (counts['geo'] || 0) + 1;
      if (tier === 'technology') counts['tech'] = (counts['tech'] || 0) + 1;
      if (tier === 'finance' || tier === 'economy') counts['finance'] = (counts['finance'] || 0) + 1;
      // finance-enriched tech stories also count for finance
      if (
        tier === 'technology' &&
        ((s.financeJargonEn && s.financeJargonEn.length > 0) ||
         (s.financeJargonZh && s.financeJargonZh.length > 0) ||
         (s.tradingSignalsEn && s.tradingSignalsEn.length > 0) ||
         (s.tradingSignalsZh && s.tradingSignalsZh.length > 0))
      ) {
        counts['finance'] = (counts['finance'] || 0) + 1;
      }
    }
    return counts;
  }, [hasNew, stories, unreadSet]);

  // Build ranking lookup map for AI sort
  const rankingMap = useMemo(() => {
    if (!data?.ranking) return null;
    const map = new Map<string, number>();
    for (const r of data.ranking) {
      map.set(r.storyId, r.rank);
    }
    return map;
  }, [data?.ranking]);

  const filteredStories = useMemo(() => {
    let result: typeof stories;
    if (lens === 'new') result = stories.filter(s => unreadSet.has(s.id));
    else if (lens === 'all') result = stories;
    else if (lens === 'geo') result = stories.filter(s => s.topicTier === 'geopolitics');
    else if (lens === 'tech') result = stories.filter(s => s.topicTier === 'technology');
    else if (lens === 'finance') {
      result = stories.filter(s =>
        s.topicTier === 'finance' ||
        s.topicTier === 'economy' ||
        (s.financeJargonEn && s.financeJargonEn.length > 0) ||
        (s.financeJargonZh && s.financeJargonZh.length > 0) ||
        (s.tradingSignalsEn && s.tradingSignalsEn.length > 0) ||
        (s.tradingSignalsZh && s.tradingSignalsZh.length > 0)
      );
    } else {
      result = stories;
    }

    // Apply sort
    if (sortMode === 'ai' && rankingMap) {
      result = [...result].sort((a, b) => {
        const ra = rankingMap.get(a.id) ?? 999;
        const rb = rankingMap.get(b.id) ?? 999;
        return ra - rb;
      });
    } else if (sortMode === 'newest') {
      result = [...result].sort(
        (a, b) => new Date(b.generatedAt || 0).getTime() - new Date(a.generatedAt || 0).getTime()
      );
    }

    return result;
  }, [lens, stories, unreadSet, sortMode, rankingMap]);

  // Date pickers (DateSwitcher) clear any pending scroll target.
  const handleSelectDate = useCallback((d: string | null) => {
    setSelectedDate(d);
    setTargetStoryId(null);
  }, []);

  // Timeline cross-day jump: switch archive AND record where to scroll once data lands.
  const handleNavigateToArchive = useCallback((date: string, storyId?: string) => {
    setSelectedDate(date);
    setTargetStoryId(storyId ?? null);
  }, []);

  // After the new archive's stories render, scroll the matched card into view.
  // Effect re-runs whenever data changes (selectedDate triggers reload).
  useEffect(() => {
    if (!targetStoryId || !hasRealData) return;
    const id = targetStoryId;
    // double rAF: wait for layout after data swap + StoryCard's <details> open animation
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = document.getElementById(`story-${id}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          el.classList.add('story-jump-flash');
          window.setTimeout(() => el.classList.remove('story-jump-flash'), 1600);
        }
        setTargetStoryId(null);
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [targetStoryId, hasRealData, data]);

  return (
    <div>
      <Header
        onToggleSidebar={() => setSidebarVisible(v => !v)}
        sidebarVisible={sidebarVisible}
        lens={lens}
        onLensChange={setLens}
        issueNumber={data?.issueNumber}
        issueDate={data?.issueDate}
        generatedAt={data?.generatedAt}
        isArchive={isArchive}
        newCount={isArchive ? 0 : newCount}
        newByCategory={isArchive ? {} : newByCategory}
      />

      <DateSwitcher
        selectedDate={selectedDate}
        onChange={handleSelectDate}
        sortMode={sortMode}
        onSortChange={setSortMode}
        hasRanking={!!data?.ranking && data.ranking.length > 0}
        rightControls={(
          <div className="toolbar-wrapper">
            <SearchBar
              query={searchQuery}
              onQueryChange={setSearchQuery}
              results={searchResults}
              isSearching={isSearchLoading}
              searchScope={searchScope}
              onScopeChange={setSearchScope}
              onResultClick={(storyId) => {
                const el = document.getElementById(`story-${storyId}`);
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  el.classList.add('story-jump-flash');
                  window.setTimeout(() => el.classList.remove('story-jump-flash'), 1600);
                }
              }}
              onClear={clearSearch}
            />
            <BookmarkPanel
              bookmarks={bookmarks}
              onRemove={(storyId) => {
                const story = stories.find(s => s.id === storyId);
                if (story) toggleBookmark(story, data?.issueDate || new Date().toISOString().slice(0, 10));
              }}
              onNavigate={(issueDate, storyId) => {
                handleNavigateToArchive(issueDate, storyId);
              }}
              onClearAll={() => {
                bookmarks.forEach(b => {
                  const story = stories.find(s => s.id === b.storyId);
                  if (story) toggleBookmark(story, b.issueDate);
                });
              }}
            />
            <StatsPanel
              totalRead={stories.filter(s => isStoryRead(s.id, data?.issueDate)).length}
              totalMinutes={Math.floor(readingSummary.totalTimeSeconds / 60)}
              weeklyReadCount={getWeeklyReadSeries().reduce((acc, d) => acc + d.readCount, 0)}
              weeklySeries={getWeeklyReadSeries()}
              bookmarkCount={bookmarks.length}
              onMarkAllRead={() => {
                if (!window.confirm(t('stats.markAllReadConfirm'))) return;
                markAllRead(storyIds, data?.issueDate);
              }}
            />
            <SourceHealthPanel sources={sourceHealth.sources} />
            <PdfExport
              stories={stories}
              issueDate={data?.issueDate}
              issueNumber={data?.issueNumber}
            />
          </div>
        )}
      />

      {hasNewData && !isArchive && (
        <div className="new-data-banner" onClick={() => { refresh(); dismissNewData(); }}>
          <span>{t('common.newBriefing')}</span>
          <button className="refresh-btn">{t('common.refresh')}</button>
        </div>
      )}

      <div className="main">
        <main>
          {loading && !hasRealData && (
            <div className="loading-state">
              <p>{t('common.loading')}</p>
            </div>
          )}

          {error && (
            <div className="error-state">
              <p>{t('common.error')}</p>
              <button onClick={refresh}>{t('common.refresh')}</button>
            </div>
          )}

          {!hasRealData && !loading && !error && (
            <div className="fallback-notice">
              <span>{t('common.demoData')} — </span>
              <button onClick={refresh}>{t('common.loadLatest')}</button>
            </div>
          )}

          {lens === 'new' && filteredStories.length === 0 && hasRealData && (
            <div className="no-new-stories">
              <p>{t('common.noNewStories')}</p>
            </div>
          )}

          {filteredStories.map((story) => {
            const rankEntry = data?.ranking?.find(r => r.storyId === story.id);
            const reason = rankEntry
              ? (i18n.language === 'zh' ? rankEntry.reasonZh : rankEntry.reasonEn)
              : undefined;
            const rankNumber = sortMode === 'ai' && rankEntry ? rankEntry.rank : undefined;
            return (
              <StoryCard
                key={story.id}
                story={story}
                availableDates={availableDatesSet}
                onNavigateToDate={handleNavigateToArchive}
                issueDate={data?.issueDate}
                isNew={!isArchive && isNew(story.id)}
                rankingReason={sortMode === 'ai' ? reason : undefined}
                rankNumber={rankNumber}
                totalStories={sortMode === 'ai' && data?.ranking ? data.ranking.length : undefined}
                isBookmarked={isBookmarked(story.id)}
                onToggleBookmark={() => toggleBookmark(story, data?.issueDate || new Date().toISOString().slice(0, 10))}
                onTrackExposure={trackExposure}
                onTrackInteraction={trackInteraction}
                onUpdateScrollDepth={updateScrollDepth}
                onTrackHeartbeat={trackHeartbeat}
                onMarkRead={markStoryRead}
              />
            );
          })}

          <AlsoToday items={alsoToday} />

          <div className="briefing-end">
            {t('common.endOfBriefing')}
          </div>
        </main>

        {sidebarVisible && <Sidebar stories={stories} sourceList={sourceList} />}
      </div>

      <Footer />
      <UpdatePrompt />
    </div>
  );
}

export default App;
