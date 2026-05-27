import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

type Phase = 'idle' | 'running' | 'done' | 'error' | 'aborted';

interface LogLine {
  stream: 'stdout' | 'stderr';
  line: string;
}

interface LastResult {
  phase: 'done' | 'error' | 'aborted';
  statusMsg: string;
  logs: LogLine[];
}

const DISMISS_KEY = 'news-update-dismissed';
const LATER_DELAY_SEC = 5 * 60;

export default function UpdatePrompt() {
  const { t, i18n } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [statusMsg, setStatusMsg] = useState('');
  const [countdownSec, setCountdownSec] = useState<number | null>(null);
  const [aborting, setAborting] = useState(false);
  const [hasTodayBriefing, setHasTodayBriefing] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [lastResult, setLastResult] = useState<LastResult | null>(null);
  const [storyProgress, setStoryProgress] = useState<{ count: number; total: number } | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);

  useEffect(() => {
    if (sessionStorage.getItem(DISMISS_KEY)) return;
    let cancelled = false;
    async function probe() {
      try {
        const [datesRes, dataRes] = await Promise.all([
          fetch('/api/news-dates'),
          fetch('/news-data.json').catch(() => null),
        ]);
        if (cancelled) return;
        const hasBackend = datesRes.ok;
        const data = dataRes?.ok ? await dataRes.json() : null;
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        const hasToday = data?.issueDate === todayStr;
        setHasTodayBriefing(hasToday);
        if (hasBackend) setVisible(true);
      } catch {
        /* no backend — keep prompt hidden */
      }
    }
    probe();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Countdown tick
  useEffect(() => {
    if (countdownSec === null) return;
    if (countdownSec <= 0) {
      setCountdownSec(null);
      setVisible(true);
      const t0 = setTimeout(() => startUpdate(), 0);
      return () => clearTimeout(t0);
    }
    const id = setTimeout(() => setCountdownSec(s => (s === null ? null : s - 1)), 1000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdownSec]);

  // Global event listener for external re-update triggers
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setVisible(true);
      setMinimized(false);
      setCountdownSec(null);
      startUpdate(detail?.force ?? false);
    };
    window.addEventListener('news-update-request', handler);
    return () => window.removeEventListener('news-update-request', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startUpdate = useCallback(async (force = false) => {
    // Cancel any stale reader from a previous (zombie) update
    if (readerRef.current) {
      readerRef.current.cancel();
      readerRef.current = null;
    }
    setPhase('running');
    setLogs([]);
    setAborting(false);
    setMinimized(false);
    setLastResult(null);
    setStoryProgress(null);
    setStatusMsg(t(force ? 'updatePrompt.startingForce' : 'updatePrompt.starting'));

    try {
      const url = force ? '/api/update-news?force=1' : '/api/update-news';
      const res = await fetch(url, { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setPhase('error');
        setStatusMsg(body.error || t('updatePrompt.failed'));
        return;
      }

      const reader = res.body!.getReader();
      readerRef.current = reader;
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop()!;

        for (const evt of events) {
          const typeMatch = evt.match(/^event: (.+)$/m);
          const dataMatch = evt.match(/^data: (.+)$/m);
          if (!typeMatch || !dataMatch) continue;

          const eventType = typeMatch[1];
          const data = JSON.parse(dataMatch[1]);

          if (eventType === 'status') {
            setStatusMsg(data.message);
            if (data.phase === 'done') { setPhase('done'); setStoryProgress(null); }
            if (data.phase === 'error') { setPhase('error'); setStoryProgress(null); }
            if (data.phase === 'aborted') { setPhase('aborted'); setStoryProgress(null); }
          } else if (eventType === 'story_added') {
            setStoryProgress({ count: data.count, total: data.total });
            setStatusMsg(t('updatePrompt.storyProgress', { count: data.count }));
          } else if (eventType === 'update_done') {
            // Final confirmation received
          } else if (eventType === 'log') {
            setLogs(prev => [...prev, { stream: data.stream, line: data.line }]);
          }
        }
      }
    } catch {
      setPhase('error');
      setStatusMsg(t('updatePrompt.connectionError'));
    } finally {
      readerRef.current = null;
      setAborting(false);
    }
  }, [t]);

  const handleAccept = useCallback(() => {
    startUpdate(false);
  }, [startUpdate]);

  const handleForceUpdate = useCallback(() => {
    startUpdate(true);
  }, [startUpdate]);

  const handleLater = useCallback(() => {
    setVisible(false);
    setCountdownSec(LATER_DELAY_SEC);
  }, []);

  const handleClose = useCallback(() => {
    sessionStorage.setItem(DISMISS_KEY, '1');
    setVisible(false);
  }, []);

  const handleStartNow = useCallback(() => {
    setCountdownSec(null);
    setVisible(true);
    startUpdate(false);
  }, [startUpdate]);

  const handleCancelCountdown = useCallback(() => {
    setCountdownSec(null);
  }, []);

  const handleAbort = useCallback(async () => {
    if (aborting) return;
    setAborting(true);
    try {
      await fetch('/api/update-news/abort', { method: 'POST' });
    } catch {
      // SSE close handler will set the final phase regardless
    }
  }, [aborting]);

  const handleMinimize = useCallback(() => {
    setMinimized(true);
    setVisible(false);
  }, []);

  const handleRestore = useCallback(() => {
    setMinimized(false);
    setVisible(true);
  }, []);

  const handleRestoreLastResult = useCallback(() => {
    if (!lastResult) return;
    setPhase(lastResult.phase);
    setStatusMsg(lastResult.statusMsg);
    setLogs(lastResult.logs);
    setMinimized(true);
    setLastResult(null);
  }, [lastResult]);

  const handleDismissLastResult = useCallback(() => {
    setLastResult(null);
  }, []);

  const handleDismissMinimized = useCallback(() => {
    setMinimized(false);
    if (phase === 'running') {
      readerRef.current?.cancel();
      readerRef.current = null;
      fetch('/api/update-news/abort', { method: 'POST' }).catch(() => {});
      setPhase('idle');
      setLogs([]);
    } else if (phase === 'done' || phase === 'error' || phase === 'aborted') {
      // Save the completed result so the user can revisit it later
      setLastResult({ phase, statusMsg, logs: [...logs] });
      setPhase('idle');
      setLogs([]);
    }
  }, [phase, statusMsg, logs]);

  const localizeStatus = (message: string) => {
    if (!i18n.language.startsWith('zh')) return message;
    if (/Starting news update/i.test(message)) return '正在启动新闻更新...';
    if (/Starting forced news update/i.test(message)) return '正在启动追加刷新...';
    if (/Update completed/i.test(message)) return '新闻简报更新完成。';
    if (/Update aborted/i.test(message)) return '新闻更新已中止。';
    if (/Update failed/i.test(message)) return '新闻更新失败。';
    return message;
  };

  const localizeLog = (line: string) => {
    if (!i18n.language.startsWith('zh')) return line;
    if (/DeepSeek analyzing cluster/i.test(line)) return '正在调用 DeepSeek 分析新闻簇...';
    if (/Kimi analyzing cluster/i.test(line)) return '正在调用 Kimi 分析新闻簇...';
    if (/Fetching RSS feeds/i.test(line)) return '正在抓取 RSS 信源...';
    if (/Fetched \d+ articles total/i.test(line)) return line.replace(/Fetched (\d+) articles total/i, '已抓取 $1 篇文章');
    if (/Deduplicating against archive/i.test(line)) return '正在与历史归档去重...';
    if (/Clustering articles/i.test(line)) return '正在聚类新闻...';
    if (/Formed \d+ clusters/i.test(line)) return line.replace(/Formed (\d+) clusters/i, '已形成 $1 个新闻簇');
    if (/analysis succeeded/i.test(line)) return 'AI 分析成功';
    if (/Story \d+\/\d+ generated/i.test(line)) return '已生成一条简报故事';
    if (/Wrote \d+ stories/i.test(line)) return line.replace(/Wrote (\d+) stories.*/i, '已写入 $1 条简报故事');
    return line;
  };

  // Format mm:ss
  const fmt = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return { mm: m, ss: s };
  };

  // Latest log line for minimized widget
  const latestLog = logs.length > 0 ? logs[logs.length - 1] : null;

  // Countdown widget (visible when countdownSec is set and modal hidden)
  const countdownWidget = countdownSec !== null && !visible && (
    <div className="update-countdown-widget" role="status" aria-live="polite">
      <div className="update-countdown-title">{t('updatePrompt.countdownTitle')}</div>
      <div className="update-countdown-time">
        {t('updatePrompt.countdownText', fmt(countdownSec))}
      </div>
      <div className="update-countdown-actions">
        <button className="update-countdown-btn primary" onClick={handleStartNow}>
          {t('updatePrompt.countdownNow')}
        </button>
        <button className="update-countdown-btn ghost" onClick={handleCancelCountdown}>
          {t('updatePrompt.countdownCancel')}
        </button>
      </div>
    </div>
  );

  // Minimized floating widget (visible when minimized=true)
  const minimizedWidget = minimized && (
    <div className="update-minimized-widget" role="status" aria-live="polite">
      <div className="update-minimized-header">
        <span className={`update-minimized-dot ${phase}`} />
        <span className="update-minimized-title">
          {phase === 'running' && t('updatePrompt.running')}
          {phase === 'done' && t('updatePrompt.done')}
          {phase === 'error' && t('updatePrompt.errorTitle')}
          {phase === 'aborted' && t('updatePrompt.aborted')}
        </span>
        <button className="update-minimized-restore" onClick={handleRestore} title={t('updatePrompt.restore')}>
          {t('updatePrompt.restore')}
        </button>
        <button className="update-minimized-close" onClick={handleDismissMinimized} title={t('updatePrompt.dismiss')}>
          ×
        </button>
      </div>
      <div className="update-minimized-body">
        <p className="update-minimized-status">{localizeStatus(statusMsg)}</p>
        {latestLog && (
          <p className={`update-minimized-log ${latestLog.stream}`}>{localizeLog(latestLog.line)}</p>
        )}
      </div>
    </div>
  );

  // Persistent floating pill to revisit a dismissed update result
  const lastResultWidget = lastResult && !visible && !minimized && (
    <div className="update-last-result-pill" role="status">
      <button className="update-last-result-btn" onClick={handleRestoreLastResult}>
        <span className={`update-last-result-dot ${lastResult.phase}`} />
        <span className="update-last-result-label">
          {lastResult.phase === 'done' && t('updatePrompt.lastDone')}
          {lastResult.phase === 'error' && t('updatePrompt.lastError')}
          {lastResult.phase === 'aborted' && t('updatePrompt.lastAborted')}
        </span>
        <span className="update-last-result-action">{t('updatePrompt.viewLog')}</span>
      </button>
      <button className="update-last-result-close" onClick={handleDismissLastResult} title={t('updatePrompt.dismiss')}>
        ×
      </button>
    </div>
  );

  if (!visible) return (
    <>
      {countdownWidget}
      {minimizedWidget}
      {lastResultWidget}
    </>
  );

  return (
    <>
      <div className="update-prompt-overlay" onClick={phase === 'idle' ? handleClose : undefined}>
        <div className="update-prompt-modal" onClick={e => e.stopPropagation()}>
          {phase === 'idle' && (
            <>
              <h3>{t('updatePrompt.title')}</h3>
              <p>{t('updatePrompt.description')}</p>
              {hasTodayBriefing && (
                <p className="update-prompt-incremental-hint">
                  {t('updatePrompt.incrementalHint')}
                </p>
              )}
              <div className="update-prompt-actions">
                <button className="update-prompt-btn accept" onClick={handleAccept}>
                  {hasTodayBriefing ? t('updatePrompt.append') : t('updatePrompt.accept')}
                </button>
                <button className="update-prompt-btn later" onClick={handleLater}>
                  {t('updatePrompt.later')}
                </button>
                <button className="update-prompt-btn reject" onClick={handleClose}>
                  {t('updatePrompt.close')}
                </button>
                {hasTodayBriefing && (
                  <button className="update-prompt-force-btn inline" onClick={handleForceUpdate}>
                    {t('updatePrompt.forceUpdate')}
                  </button>
                )}
              </div>
            </>
          )}

          {phase === 'running' && (
            <>
              <div className="update-prompt-running-header">
                <h3>{t('updatePrompt.running')}</h3>
                <button className="update-prompt-minimize-btn" onClick={handleMinimize} title={t('updatePrompt.minimize')}>
                  {t('updatePrompt.minimize')}
                </button>
              </div>
              <p className="update-prompt-status">{localizeStatus(statusMsg)}</p>
              {storyProgress && (
                <div className="update-prompt-progress">
                  <div className="update-progress-bar">
                    <div
                      className="update-progress-fill"
                      style={{ width: `${Math.round((storyProgress.count / Math.max(storyProgress.total, 1)) * 100)}%` }}
                    />
                  </div>
                  <span className="update-progress-text">
                    {storyProgress.count}/{storyProgress.total}
                  </span>
                </div>
              )}
              <div className="update-prompt-logs">
                {logs.map((log, i) => (
                  <div key={i} className={`log-line ${log.stream}`}>
                    {localizeLog(log.line)}
                  </div>
                ))}
                <div ref={logEndRef} />
              </div>
              <div className="update-prompt-actions">
                <button
                  className="update-prompt-btn abort"
                  onClick={handleAbort}
                  disabled={aborting}
                >
                  {aborting ? t('updatePrompt.aborting') : t('updatePrompt.abort')}
                </button>
              </div>
            </>
          )}

          {phase === 'done' && (
            <>
              <h3>{t('updatePrompt.done')}</h3>
              <p className="update-prompt-status success">{localizeStatus(statusMsg)}</p>
              <div className="update-prompt-actions">
                <button className="update-prompt-btn accept" onClick={() => window.location.reload()}>
                  {t('updatePrompt.reload')}
                </button>
                <button className="update-prompt-btn reject" onClick={() => setVisible(false)}>
                  {t('updatePrompt.stay')}
                </button>
              </div>
            </>
          )}

          {phase === 'aborted' && (
            <>
              <h3>{t('updatePrompt.aborted')}</h3>
              <p className="update-prompt-status">{t('updatePrompt.abortedDesc')}</p>
              {logs.length > 0 && (
                <div className="update-prompt-logs">
                  {logs.slice(-10).map((log, i) => (
                    <div key={i} className={`log-line ${log.stream}`}>
                      {localizeLog(log.line)}
                    </div>
                  ))}
                </div>
              )}
              <div className="update-prompt-actions">
                <button className="update-prompt-btn reject" onClick={() => setVisible(false)}>
                  {t('updatePrompt.dismiss')}
                </button>
              </div>
            </>
          )}

          {phase === 'error' && (
            <>
              <h3>{t('updatePrompt.errorTitle')}</h3>
              <p className="update-prompt-status error">{localizeStatus(statusMsg)}</p>
              {logs.length > 0 && (
                <div className="update-prompt-logs">
                  {logs.slice(-10).map((log, i) => (
                    <div key={i} className={`log-line ${log.stream}`}>
                      {localizeLog(log.line)}
                    </div>
                  ))}
                </div>
              )}
              <div className="update-prompt-actions">
                <button className="update-prompt-btn accept" onClick={handleAccept}>
                  {t('updatePrompt.retry')}
                </button>
                <button className="update-prompt-btn reject" onClick={() => setVisible(false)}>
                  {t('updatePrompt.dismiss')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      {minimizedWidget}
      {lastResultWidget}
    </>
  );
}
