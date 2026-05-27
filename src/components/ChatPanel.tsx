import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatPanelProps {
  storyId: string;
  storyHeadline: string;
  visible: boolean;
  onClose: () => void;
}

function streamChat(
  storyId: string,
  message: string,
  history: ChatMessage[],
  onToken: (token: string) => void,
  onDone: (fullText: string) => void,
  onError: (err: string) => void
): AbortController {
  const controller = new AbortController();

  fetch('/api/chat-story', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ storyId, message, history }),
    signal: controller.signal,
  })
    .then(async (res) => {
      if (!res.ok) {
        const text = await res.text();
        onError(`HTTP ${res.status}: ${text}`);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) { onError('No response body'); return; }

      const decoder = new TextDecoder();
      let fullText = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              onDone(fullText);
              return;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.token) {
                fullText += parsed.token;
                onToken(parsed.token);
              }
              if (parsed.error) {
                onError(parsed.error);
                return;
              }
            } catch { /* skip malformed SSE */ }
          }
        }
      }
      onDone(fullText);
    })
    .catch((err) => {
      if (err.name !== 'AbortError') {
        onError(err.message || 'Network error');
      }
    });

  return controller;
}

export default function ChatPanel({ storyId, storyHeadline, visible, onClose }: ChatPanelProps) {
  const { t, i18n } = useTranslation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Auto-scroll when messages change or streaming
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (visible) {
      setTimeout(() => inputRef.current?.focus(), 100);
      if (messages.length === 0) {
        const lang = i18n.language.startsWith('zh') ? 'zh' : 'en';
        setMessages([{
          role: 'assistant',
          content: lang === 'zh'
            ? `👋 你对「${storyHeadline}」有什么想聊的？`
            : `👋 What would you like to discuss about "${storyHeadline}"?`,
        }]);
      }
    }
  }, [visible]);

  const sendMessage = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: trimmed };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setError(null);

    // Streaming placeholder
    const assistantMsg: ChatMessage = { role: 'assistant', content: '' };
    setMessages(prev => [...prev, assistantMsg]);

    abortRef.current = streamChat(
      storyId,
      trimmed,
      messages, // pass existing history (before this message)
      (token) => {
        setMessages(prev => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.role === 'assistant') {
            updated[updated.length - 1] = { ...last, content: last.content + token };
          }
          return updated;
        });
      },
      (fullText) => {
        setLoading(false);
        abortRef.current = null;

        // Auto-detect knowledge gaps
        const gapMatch = fullText.match(/\[GAP:\s*(.+?)\s*\]/);
        if (gapMatch) {
          const topic = gapMatch[1].trim();
          fetch('/api/chat-story/gap', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic, context: trimmed }),
          }).catch(() => {});
          // Clean the GAP marker from the displayed content
          setMessages(prev => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last?.role === 'assistant') {
              updated[updated.length - 1] = {
                ...last,
                content: last.content.replace(/\[GAP:\s*.+?\s*\]/g, '').trim(),
              };
            }
            return updated;
          });
        }
      },
      (err) => {
        setError(err);
        setLoading(false);
        abortRef.current = null;
      }
    );
  }, [input, loading, storyId, messages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
    setLoading(false);
    abortRef.current = null;
  };

  if (!visible) return null;

  return (
    <div className="chat-panel">
      <div className="chat-panel-header">
        <span className="chat-panel-title">{t('chat.title')}</span>
        <button className="chat-panel-close" onClick={onClose} aria-label={t('chat.close')}>
          ✕
        </button>
      </div>

      <div className="chat-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`chat-msg chat-msg-${msg.role}`}>
            <div className="chat-msg-content">{msg.content || (loading && i === messages.length - 1 ? '...' : '')}</div>
          </div>
        ))}
        {error && <div className="chat-msg chat-msg-error">{error}</div>}
        <div ref={bottomRef} />
      </div>

      <div className="chat-input-row">
        <input
          ref={inputRef}
          type="text"
          className="chat-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('chat.placeholder')}
          disabled={loading}
        />
        {loading ? (
          <button className="chat-btn chat-btn-stop" onClick={handleStop}>
            {t('chat.stop')}
          </button>
        ) : (
          <button className="chat-btn chat-btn-send" onClick={sendMessage} disabled={!input.trim()}>
            {t('chat.send')}
          </button>
        )}
      </div>
    </div>
  );
}
