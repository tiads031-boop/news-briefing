import { useTranslation } from 'react-i18next';

interface BookmarkButtonProps {
  isBookmarked: boolean;
  onToggle: () => void;
  size?: number;
}

export default function BookmarkButton({ isBookmarked, onToggle, size = 18 }: BookmarkButtonProps) {
  const { t } = useTranslation();

  return (
    <button
      className={`bookmark-btn ${isBookmarked ? 'bookmarked' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      title={isBookmarked ? t('bookmark.remove') : t('bookmark.add')}
      aria-label={isBookmarked ? t('bookmark.remove') : t('bookmark.add')}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={isBookmarked ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
      </svg>
    </button>
  );
}
