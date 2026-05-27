import { useTranslation } from 'react-i18next';
import type { FinanceJargonItem, TradingSignal } from '../types';

interface FinancePanelProps {
  jargon?: FinanceJargonItem[];
  signals?: TradingSignal[];
}

const directionIcon: Record<string, string> = {
  bullish: '▲',
  bearish: '▼',
  neutral: '◆',
};

const directionClass: Record<string, string> = {
  bullish: 'signal-bullish',
  bearish: 'signal-bearish',
  neutral: 'signal-neutral',
};

function getSourceTypeLabel(type: FinanceJargonItem['sourceType'], t: (key: string) => string): string | null {
  if (!type) return null;
  if (type === 'regulator') return t('finance.sourceType.regulator');
  if (type === 'exchange') return t('finance.sourceType.exchange');
  if (type === 'institution') return t('finance.sourceType.institution');
  return t('finance.sourceType.official');
}

export default function FinancePanel({ jargon, signals }: FinancePanelProps) {
  const { t } = useTranslation();

  const hasJargon = jargon && jargon.length > 0;
  const hasSignals = signals && signals.length > 0;

  if (!hasJargon && !hasSignals) return null;

  return (
    <section className="story-section finance-panel">
      <h3 className="section-label">{t('finance.title')}</h3>

      {hasJargon && (
        <div className="finance-jargon">
          <h4 className="finance-sublabel">{t('finance.jargon')}</h4>
          <dl className="jargon-list">
            {jargon.map((item, i) => (
              <div key={i} className="jargon-item">
                <dt>{item.term}</dt>
                <dd>{item.explanation}</dd>
                {item.sourceUrl && (
                  <div className="jargon-source-wrap">
                    <a
                      className="jargon-source-link"
                      href={item.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={item.sourceMatchLevel === 'homepage' ? t('finance.officialSourceGuide') : t('finance.officialSource')}
                    >
                      {t('finance.sourcePrefix')}{item.sourceName || t('finance.officialSource')} ↗
                    </a>
                    {getSourceTypeLabel(item.sourceType, t) && (
                      <span className={`jargon-source-type type-${item.sourceType || 'official'}`}>
                        {getSourceTypeLabel(item.sourceType, t)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </dl>
        </div>
      )}

      {hasSignals && (
        <div className="finance-signals">
          <h4 className="finance-sublabel">{t('finance.signals')}</h4>
          <div className="signals-grid">
            {signals.map((sig, i) => (
              <div key={i} className={`signal-card ${directionClass[sig.direction] || ''}`}>
                <div className="signal-header">
                  <span className="signal-asset">{sig.asset}</span>
                  <span className={`signal-direction ${sig.direction || ''}`}>
                    {directionIcon[sig.direction] || '◆'} {t(`finance.${sig.direction}`)}
                  </span>
                </div>
                <div className="signal-rationale">{sig.rationale}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
