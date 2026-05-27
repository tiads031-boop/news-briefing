import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Story } from '../types';

interface SidebarProps {
  stories: Story[];
  sourceList: string[];
}

export default function Sidebar({ stories, sourceList }: SidebarProps) {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language.startsWith('zh');

  const trackedStories = useMemo(() => {
    return stories.map((s, i) => {
      const title = isZh
        ? (s.headlineZh || s.headline)
        : (s.headlineEn || s.headline);
      return {
        id: s.id || String(i),
        title: title.length > 30 ? title.slice(0, 30) + '...' : title,
        count: s.sources.length,
      };
    });
  }, [stories, isZh]);

  return (
    <aside className="sidebar">
      <div className="standing">
        {t('sidebar.description')}
      </div>

      <div className="index">
        <div className="index-label">{t('sidebar.trackedToday')}</div>
        <div className="story-stats">
          {trackedStories.map((s) => (
            <a key={s.id} href={`#story-${s.id}`} className="story-stat">
              <span className="story-stat-title">{s.title}</span>
              <span className="story-stat-count">{s.count}</span>
            </a>
          ))}
        </div>
      </div>

      <div className="index">
        <div className="index-label">{t('sidebar.sources')}</div>
        <div className="source-list">
          {sourceList.join(' · ')}
        </div>
      </div>
    </aside>
  );
}
