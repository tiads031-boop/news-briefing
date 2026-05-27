import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Story, Source } from '../types';
import { useLocalizedStory } from '../hooks/useLocalizedStory';
import StoryTimeline from './StoryTimeline';
import FinancePanel from './FinancePanel';
import BookmarkButton from './BookmarkButton';
import ConfidenceBadge from './ConfidenceBadge';
import ChatPanel from './ChatPanel';
import { READING_RULES } from '../config/readingRules';

interface StoryCardProps {
  story: Story;
  issueDate?: string;
  availableDates?: Set<string>;
  onNavigateToDate?: (date: string, storyId?: string) => void;
  isNew?: boolean;
  rankingReason?: string;
  rankNumber?: number;
  totalStories?: number;
  isBookmarked?: boolean;
  onToggleBookmark?: () => void;
  onTrackExposure?: (storyId: string, issueDate?: string) => void;
  onTrackInteraction?: (storyId: string, issueDate?: string) => void;
  onUpdateScrollDepth?: (storyId: string, issueDate: string | undefined, depth: number) => void;
  onTrackHeartbeat?: (storyId: string, issueDate?: string, seconds?: number) => void;
  onMarkRead?: (storyId: string, issueDate?: string) => void;
}

export default function StoryCard({
  story,
  issueDate,
  availableDates,
  onNavigateToDate,
  isNew = false,
  rankingReason,
  rankNumber,
  totalStories,
  isBookmarked = false,
  onToggleBookmark,
  onTrackExposure,
  onTrackInteraction,
  onUpdateScrollDepth,
  onTrackHeartbeat,
  onMarkRead,
}: StoryCardProps) {
  const { t, i18n } = useTranslation();
  const localized = useLocalizedStory(story);
  const [deepOpen, setDeepOpen] = useState(story.featured || false);
  const [chatOpen, setChatOpen] = useState(false);
  const storyRef = useRef<HTMLElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const el = storyRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        const inView = entry.intersectionRatio >= READING_RULES.exposureMinRatio;
        setIsInView(inView);
        if (inView) onTrackExposure?.(story.id, issueDate);
      },
      { threshold: [READING_RULES.exposureMinRatio] },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [story.id, issueDate, onTrackExposure]);

  useEffect(() => {
    if (!isInView || !onTrackHeartbeat) return;
    const timer = window.setInterval(() => {
      onTrackHeartbeat(story.id, issueDate, READING_RULES.heartbeatStepSeconds);
    }, READING_RULES.heartbeatStepSeconds * 1000);
    return () => window.clearInterval(timer);
  }, [isInView, story.id, issueDate, onTrackHeartbeat]);

  useEffect(() => {
    const onScroll = () => {
      const el = storyRef.current;
      if (!el || !isInView || !onUpdateScrollDepth) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const seen = Math.min(vh, Math.max(0, vh - rect.top));
      const depth = Math.max(0, Math.min(1, seen / Math.max(rect.height, 1)));
      onUpdateScrollDepth(story.id, issueDate, depth);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [isInView, story.id, issueDate, onUpdateScrollDepth]);

  const agreementClass =
    story.agreement === 'aligned' ? 'ok'
    : story.agreement === 'mixed' ? 'note'
    : 'warn';
  const agreementLabel =
    story.agreement === 'aligned'
      ? t('story.agreement.aligned')
      : story.agreement === 'mixed'
        ? t('story.agreement.mixed')
        : t('story.agreement.disputed');

  const translateTopic = (topic: string) => {
    return t(`topics.${topic}`, { defaultValue: topic });
  };

  const formatStoryTime = (time: string) => {
    const raw = String(time || '').trim();
    const isZh = i18n.language.startsWith('zh');
    if (!isZh) return raw.toLowerCase() === 'just now' ? 'Just now' : raw;

    const normalized = raw.toLowerCase().replace(/\s+/g, ' ');
    if (!normalized || normalized === 'just now' || normalized === 'now' || normalized === '0h ago' || normalized === '0 h ago') {
      return '刚刚';
    }

    const hourMatch = normalized.match(/^(\d+)\s*h(?:ours?)?\s*ago$/);
    if (hourMatch) return `${Number(hourMatch[1])}小时前`;

    const minMatch = normalized.match(/^(\d+)\s*m(?:in(?:ute)?s?)?\s*ago$/);
    if (minMatch) return `${Number(minMatch[1])}分钟前`;

    const dayMatch = normalized.match(/^(\d+)\s*d(?:ays?)?\s*ago$/);
    if (dayMatch) return `${Number(dayMatch[1])}天前`;

    return raw;
  };

  const rankTier = rankNumber === 1 ? 'gold' : rankNumber === 2 ? 'silver' : rankNumber === 3 ? 'bronze' : undefined;
  const rankStyle = rankNumber && totalStories && totalStories > 1
    ? { '--rank-intensity': (1 - (rankNumber - 1) / (totalStories - 1)).toFixed(3) } as React.CSSProperties
    : undefined;

  return (
    <article
      ref={storyRef}
      id={`story-${story.id}`}
      className={`story ${story.featured ? 'featured' : ''} ${rankingReason ? 'has-rank' : ''} ${rankTier ? `rank-tier-${rankTier}` : ''}`}
      style={rankStyle}
    >
      {story.featured && story.runningCoverage && (
        <span className="featured-kicker">{t('story.runningCoverage')}</span>
      )}
      {!story.featured && (
        <span className="topic-kicker">{translateTopic(story.topic)}</span>
      )}

      <div className="story-meta">
        <span className="topic">{translateTopic(story.topic)}</span>
        <span className="sep">·</span>
        <span className={`agreement ${agreementClass}`}>
          {agreementLabel}
        </span>
        <span className="sep">·</span>
        <span>{formatStoryTime(story.time)}</span>
        {story.gcc && (
          <>
            <span className="sep">·</span>
            <span className="gcc">{t('story.gcc')}</span>
          </>
        )}
        {isNew && (
          <>
            <span className="sep">·</span>
            <span className="new-badge">{t('story.newBadge')}</span>
          </>
        )}
      </div>

      {/* Source chips for quick traceability */}
      {story.sources.length > 0 && (
        <div className="story-source-chips">
          {story.sources.map((s, i) =>
            s.url ? (
              <a
                key={i}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="source-chip"
                title={`${s.name}${s.language ? ` (${s.language === 'zh' ? '中文' : 'EN'})` : ''}`}
              >
                {s.name}
              </a>
            ) : (
              <span
                key={i}
                className="source-chip"
                title={`${s.name}${s.language ? ` (${s.language === 'zh' ? '中文' : 'EN'})` : ''}`}
              >
                {s.name}
              </span>
            )
          )}
        </div>
      )}

      <h2>{localized.headline}</h2>

      <p className="lead">{localized.lead}</p>

      {rankingReason && (
        <div className="ranking-reason">
          {rankNumber && (
            <span className={`ranking-badge ${rankTier || ''}`} aria-hidden="true">
              {rankTier === 'gold' ? '★' : rankNumber}
            </span>
          )}
          <span className="ranking-reason-text">{rankingReason}</span>
        </div>
      )}

      {story.featured && (
        <div className="featured-now">
          <span className="featured-now-label">{t('story.latest')}</span>
          {localized.lead}
        </div>
      )}

      <ConfidenceBadge confidence={story.confidence} />

      {story.featured ? (
        <div className="story-deep-content">
          <StoryDeepContent
            story={story}
            localized={localized}
            availableDates={availableDates}
            onNavigateToDate={onNavigateToDate}
            chatOpen={chatOpen}
            setChatOpen={setChatOpen}
          />
        </div>
      ) : (
        <details
          className="story-deep"
          open={deepOpen}
          onToggle={(e) => {
            const open = (e.target as HTMLDetailsElement).open;
            setDeepOpen(open);
            if (open) onTrackInteraction?.(story.id, issueDate);
          }}
        >
          <summary>
            {t('story.continueReading')}
          </summary>
          <StoryDeepContent
            story={story}
            localized={localized}
            availableDates={availableDates}
            onNavigateToDate={onNavigateToDate}
            chatOpen={chatOpen}
            setChatOpen={setChatOpen}
          />
        </details>
      )}

      {(onToggleBookmark || onMarkRead) && (
        <div className="story-actions">
          {onToggleBookmark && <BookmarkButton isBookmarked={isBookmarked} onToggle={onToggleBookmark} />}
          {isNew && onMarkRead && (
            <button className="bookmark-btn" onClick={() => onMarkRead(story.id, issueDate)}>
              {t('stats.markRead')}
            </button>
          )}
        </div>
      )}
    </article>
  );
}

interface StoryDeepContentProps {
  story: Story;
  localized: ReturnType<typeof useLocalizedStory>;
  availableDates?: Set<string>;
  onNavigateToDate?: (date: string, storyId?: string) => void;
}

function StoryDeepContent({ story, localized, availableDates, onNavigateToDate, chatOpen, setChatOpen }: StoryDeepContentProps & { chatOpen: boolean; setChatOpen: (v: boolean) => void }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'zh' ? 'zh' : 'en';

  const getSourceLabel = (s: Source): string => {
    if (lang === 'zh' && s.takeZh) return s.takeZh;
    if (lang === 'en' && s.takeEn) return s.takeEn;
    return s.take || s.name;
  };

  return (
    <div>
      {localized.timeline.length > 0 && (
        <section className="story-section">
          <h3 className="section-label">{t('story.storyArc')}</h3>
          <StoryTimeline
            events={localized.timeline}
            availableDates={availableDates}
            onNavigateToDate={onNavigateToDate}
            runningCoverage={story.runningCoverage}
          />
        </section>
      )}

      {story.nextToWatch && localized.nextToWatchEvent && (
        <section className="story-section next-watch-callout">
          <h3 className="section-label">{t('story.nextToWatch')}</h3>
          <p><strong>{story.nextToWatch.date}</strong> — {localized.nextToWatchEvent}</p>
        </section>
      )}

      {localized.forecasts && localized.forecasts.length > 0 && (
        <section className="story-section">
          <h3 className="section-label">{t('story.forecasts')}</h3>
          <div>
            {localized.forecasts.map((f, i) => (
              <div key={i} className="forecast-row">
                <div className="forecast-who">{f.who}{f.source && <span style={{ color: 'var(--color-muted)' }}> · {f.source}</span>}</div>
                <blockquote className="forecast-quote">{f.quote}</blockquote>
              </div>
            ))}
          </div>
        </section>
      )}

      {localized.perspectives && localized.perspectives.length > 0 && (
        <section className="story-section">
          <h3 className="section-label">{t('story.perspectives')}</h3>
          <div className="perspectives-grid">
            {localized.perspectives.map((p, i) => (
              <div key={i} className="perspective">
                <div className="perspective-who">{p.who}</div>
                <div className="perspective-what">{p.what}</div>
                {p.why && <div className="perspective-why">{p.why}</div>}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="story-section">
        <h3 className="section-label">{t('story.keyDetails')}</h3>
        <ul className="key-bullets">
          {localized.keyDetails.map((detail, i) => (
            <li key={i}>{detail}</li>
          ))}
        </ul>
      </section>

      {localized.secondaryEffects && localized.secondaryEffects.length > 0 && (
        <section className="story-section">
          <h3 className="section-label">{t('story.secondaryEffects')}</h3>
          <div className="effects-stack">
            {localized.secondaryEffects.map((effect, i) => (
              <div key={i} className="effect">
                <div className="effect-dimension">{effect.dimension}</div>
                <div className="effect-analysis">{effect.analysis}</div>
                {effect.movements && (
                  <div className="effect-movements">
                    <div className="effect-movements-label">{t('story.keyMovements')}</div>
                    <div className="effect-movements-text">{effect.movements}</div>
                  </div>
                )}
                {effect.evidence && (
                  <div className="effect-evidence">
                    <span className="effect-evidence-label">{t('story.evidence')}</span>
                    {effect.evidence}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <FinancePanel
        jargon={localized.financeJargon}
        signals={localized.tradingSignals}
      />

      <details className="sources-details">
        <summary>{t('story.showSources', { count: story.sources.length })}</summary>
        <div style={{ marginTop: 'var(--space-md)' }}>
          {story.sources.map((s, i) => {
            const label = getSourceLabel(s);
            return (
              <div key={i} className="source-row">
                {s.url ? (
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="source-link">
                    {label}
                  </a>
                ) : (
                  <span>{label}</span>
                )}
                <span className="source-count">{s.name}</span>
                {s.language && (
                  <span className="source-lang">{s.language === 'zh' ? '中文' : 'EN'}</span>
                )}
              </div>
            );
          })}
        </div>
      </details>

      <div className="story-actions">
        <button
          className={`chat-trigger-btn${chatOpen ? ' active' : ''}`}
          onClick={() => setChatOpen(!chatOpen)}
          aria-label={t('chat.discuss')}
        >
          💬 {t('chat.discuss')}
        </button>
      </div>

      <ChatPanel
        storyId={story.id}
        storyHeadline={localized.headline}
        visible={chatOpen}
        onClose={() => setChatOpen(false)}
      />
    </div>
  );
}
