import { useTranslation } from 'react-i18next';

interface ConfidenceBadgeProps {
  confidence?: number;
}

export default function ConfidenceBadge({ confidence }: ConfidenceBadgeProps) {
  const { t } = useTranslation();

  if (!confidence || confidence >= 4) return null;

  const isLow = confidence <= 2;

  return (
    <div className={`confidence-badge ${isLow ? 'low' : 'medium'}`}>
      <span className="confidence-icon">⚠</span>
      <span className="confidence-text">{t('confidence.low')}</span>
      {isLow && (
        <span className="confidence-desc">{t('confidence.lowDesc')}</span>
      )}
    </div>
  );
}
