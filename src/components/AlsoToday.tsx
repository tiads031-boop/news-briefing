import { useTranslation } from 'react-i18next';
import type { AlsoTodayItem } from '../types';

interface AlsoTodayProps {
  items: AlsoTodayItem[];
}

export default function AlsoToday({ items }: AlsoTodayProps) {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language.startsWith('zh');

  const getTitle = (item: AlsoTodayItem): string | null => {
    if (isZh) return item.titleZh || null;
    return item.titleEn || item.title;
  };

  const visibleItems = items
    .map(item => ({ item, title: getTitle(item) }))
    .filter((x): x is { item: AlsoTodayItem; title: string } => Boolean(x.title));

  if (visibleItems.length === 0) return null;

  return (
    <section className="also-today">
      <h3>{t('alsoToday')}</h3>
      {visibleItems.map(({ item, title }, i) => (
        <div key={i} className="single-item">
          <span className="si-source">{item.source}</span>
          <span className="si-title">
            {item.url ? (
              <a href={item.url} target="_blank" rel="noopener noreferrer">{title}</a>
            ) : (
              <a href="#">{title}</a>
            )}
          </span>
          <span className="si-topic">{t(`topics.${item.topic}`, item.topic)}</span>
        </div>
      ))}
    </section>
  );
}
