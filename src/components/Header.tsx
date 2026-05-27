import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface HeaderProps {
  onToggleSidebar: () => void;
  sidebarVisible: boolean;
  lens: string;
  onLensChange: (lens: string) => void;
  issueNumber?: number;
  issueDate?: string;
  generatedAt?: string;
  isArchive?: boolean;
  newCount?: number;
  newByCategory?: Record<string, number>;
}

function formatTimeAgo(iso: string | undefined, lang: string): string | null {
  if (!iso) return null;
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return null;
  const ms = Date.now() - ts;
  if (ms < 0) return null;
  const min = Math.round(ms / 60_000);
  const isZh = lang === 'zh';
  if (min < 1) return isZh ? '刚刚' : 'just now';
  if (min < 60) return isZh ? `${min} 分钟` : `${min}m`;
  const hr = Math.round(min / 60);
  if (hr < 24) return isZh ? `${hr} 小时` : `${hr}h`;
  const day = Math.round(hr / 24);
  return isZh ? `${day} 天` : `${day}d`;
}

export default function Header({
  onToggleSidebar,
  sidebarVisible,
  lens,
  onLensChange,
  issueNumber,
  issueDate,
  generatedAt,
  isArchive,
  newCount = 0,
  newByCategory = {},
}: HeaderProps) {
  const { t, i18n } = useTranslation();
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof document !== 'undefined') {
      const saved = document.documentElement.getAttribute('data-theme');
      if (saved === 'dark' || saved === 'light') return saved;
    }
    return 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('lang', i18n.language);
  }, [i18n.language]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const toggleLanguage = () => {
    const next = i18n.language === 'zh' ? 'en' : 'zh';
    i18n.changeLanguage(next);
  };

  const dateFormat: Intl.DateTimeFormatOptions =
    i18n.language === 'zh'
      ? { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }
      : { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };

  const lensItems = [
    { key: 'new', label: t('header.lens.new'), dot: newCount },
    { key: 'all', label: t('header.lens.all') },
    { key: 'geo', label: t('header.lens.geo'), dot: newByCategory['geo'] },
    { key: 'tech', label: t('header.lens.tech'), dot: newByCategory['tech'] },
    { key: 'finance', label: t('header.lens.finance'), dot: newByCategory['finance'] },
  ];

  const issueText = issueNumber !== undefined ? t('header.issue', { number: issueNumber }) : null;
  const timeAgo = formatTimeAgo(generatedAt, i18n.language);
  const updateText = isArchive && issueDate
    ? t('header.archived', { date: issueDate })
    : timeAgo
      ? t('header.updated', { time: timeAgo })
      : null;

  return (
    <>
      <header className="header">
        <div className="nameplate">
          <img src="/logo.jpg" alt="GlobalPulse" className="logo-img" />
        </div>
        <div className="header-right">
          <button className="toggle-btn" onClick={onToggleSidebar}>
            {sidebarVisible ? t('header.hideIndex') : t('header.showIndex')}
          </button>
          <div className="lens-switch" role="group" aria-label="Lens">
            {lensItems.map((item, i, arr) => (
              <span key={item.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 0 }}>
                <button
                  className={`lens-pill ${lens === item.key ? 'active' : ''} ${item.dot ? 'has-dot' : ''}`}
                  onClick={() => onLensChange(item.key)}
                >
                  {item.label}
                  {item.dot ? (
                    <span className="lens-dot">{item.dot}</span>
                  ) : null}
                </button>
                {i < arr.length - 1 && (
                  <span className="lens-divider" aria-hidden="true">·</span>
                )}
              </span>
            ))}
          </div>
          <button className="lang-btn" onClick={toggleLanguage}>
            {i18n.language === 'zh' ? 'EN' : '中文'}
          </button>
          <button className="theme-btn" onClick={toggleTheme}>
            {theme === 'light' ? t('header.dark') : t('header.light')}
          </button>
        </div>
      </header>
      <div className="masthead">
        <div className="masthead-inner">
          <span className="masthead-date">{new Date().toLocaleDateString(i18n.language === 'zh' ? 'zh-CN' : 'en-US', dateFormat)}</span>
          {issueText && <span className="masthead-issue">{issueText}</span>}
          {updateText && <span className="masthead-update">{updateText}</span>}
        </div>
      </div>
    </>
  );
}
