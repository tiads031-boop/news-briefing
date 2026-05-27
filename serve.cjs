const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PORT = 8080;
const DIST_DIR = path.join(__dirname, 'dist');
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

// Data file routes that should always serve from public/ (live, no rebuild needed)
function isDataFilePath(urlPath) {
  return urlPath === '/news-data.json'
    || urlPath === '/issue-config.json'
    || /^\/archive\/\d{4}-\d{2}-\d{2}\.json$/.test(urlPath);
}

function handleIssueConfig(req, res) {
  const configPath = path.join(PUBLIC_DIR, 'issue-config.json');
  fs.readFile(configPath, (err, data) => {
    if (err) {
      const status = err.code === 'ENOENT' ? 404 : 500;
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: err.code === 'ENOENT' ? 'issue-config.json not found' : 'Failed to read issue-config.json' }));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(data);
  });
}

function handleNewsDates(req, res) {
  const archiveDir = path.join(PUBLIC_DIR, 'archive');
  fs.readdir(archiveDir, (err, files) => {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    if (err) {
      res.end(JSON.stringify({ dates: [] }));
      return;
    }
    const dates = files
      .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
      .map((f) => f.replace('.json', ''))
      .sort()
      .reverse();
    res.end(JSON.stringify({ dates }));
  });
}

let updateProcess = null;
let updateAborting = false;

function handleAbortUpdate(req, res) {
  if (!updateProcess) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'No update in progress' }));
    return;
  }
  updateAborting = true;
  try {
    if (process.platform === 'win32') {
      // child.kill() on Windows only kills the cmd.exe wrapper; orphaned npm/tsx children
      // would keep writing to public/news-data.json. taskkill /T walks the tree.
      spawn('taskkill', ['/PID', String(updateProcess.pid), '/F', '/T'], { shell: false });
    } else {
      updateProcess.kill('SIGTERM');
    }
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: `Failed to kill: ${e.message}` }));
    return;
  }
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ ok: true }));
}

function handleUpdateNews(req, res) {
  if (updateProcess) {
    res.writeHead(409, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Update already in progress' }));
    return;
  }

  updateAborting = false;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  const send = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const url = new URL(req.url, `http://localhost`);
  const force = url.searchParams.get('force') === '1';

  send('status', { phase: 'starting', message: force ? 'Starting forced news update (append-only)...' : 'Starting news update...' });

  const args = ['run', 'update-news'];
  if (force) args.push('--', '--force');

  updateProcess = spawn('npm', args, {
    cwd: __dirname,
    shell: true,
    env: { ...process.env, FORCE_COLOR: '0' },
  });

  let stdoutBuffer = '';
  let stderrBuffer = '';

  updateProcess.stdout.on('data', (chunk) => {
    stdoutBuffer += chunk.toString();
    const lines = stdoutBuffer.split('\n');
    stdoutBuffer = lines.pop();
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Detect per-story incremental markers
      const storyMatch = trimmed.match(/^\[STORY_ADDED\]\s+(.+)$/);
      if (storyMatch) {
        try {
          const data = JSON.parse(storyMatch[1]);
          send('story_added', data);
        } catch { /* ignore parse errors */ }
        // Also forward as a normal log line so the UI shows it
        send('log', { stream: 'stdout', line: trimmed });
        continue;
      }

      // Detect completion marker
      const doneMatch = trimmed.match(/^\[UPDATE_DONE\]\s+(.+)$/);
      if (doneMatch) {
        try {
          const data = JSON.parse(doneMatch[1]);
          send('update_done', data);
        } catch { /* ignore parse errors */ }
        send('log', { stream: 'stdout', line: trimmed });
        continue;
      }

      send('log', { stream: 'stdout', line: trimmed });
    }
  });

  updateProcess.stderr.on('data', (chunk) => {
    stderrBuffer += chunk.toString();
    const lines = stderrBuffer.split('\n');
    stderrBuffer = lines.pop();
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed) send('log', { stream: 'stderr', line: trimmed });
    }
  });

  updateProcess.on('close', (code) => {
    if (stdoutBuffer.trim()) send('log', { stream: 'stdout', line: stdoutBuffer.trim() });
    if (stderrBuffer.trim()) send('log', { stream: 'stderr', line: stderrBuffer.trim() });

    if (updateAborting) {
      send('status', { phase: 'aborted', message: 'Update aborted by user' });
    } else if (code === 0) {
      send('status', { phase: 'done', message: 'Update completed successfully!' });
    } else {
      send('status', { phase: 'error', message: `Update failed with exit code ${code}` });
    }
    res.write('event: end\ndata: {}\n\n');
    res.end();
    updateProcess = null;
    updateAborting = false;
  });

  updateProcess.on('error', (err) => {
    send('status', { phase: 'error', message: `Failed to start: ${err.message}` });
    res.write('event: end\ndata: {}\n\n');
    res.end();
    updateProcess = null;
    updateAborting = false;
  });

  req.on('close', () => {
    if (updateProcess) {
      try {
        if (process.platform === 'win32') {
          spawn('taskkill', ['/PID', String(updateProcess.pid), '/F', '/T'], { shell: false });
        } else {
          updateProcess.kill();
        }
      } catch { /* ignore */ }
      updateProcess = null;
      updateAborting = false;
    }
  });
}

const server = http.createServer((req, res) => {
  const urlPath = new URL(req.url, `http://localhost`).pathname;

  // API: trigger news update
  if (urlPath === '/api/update-news' && req.method === 'POST') {
    handleUpdateNews(req, res);
    return;
  }

  // API: abort an in-progress news update
  if (urlPath === '/api/update-news/abort' && req.method === 'POST') {
    handleAbortUpdate(req, res);
    return;
  }

  // API: list available archive dates
  if (urlPath === '/api/news-dates' && req.method === 'GET') {
    handleNewsDates(req, res);
    return;
  }

  // API: issue number config
  if (urlPath === '/api/issue-config' && req.method === 'GET') {
    handleIssueConfig(req, res);
    return;
  }

  // API: AI chat for a specific story (SSE streaming)
  if (urlPath === '/api/chat-story' && req.method === 'POST') {
    handleChatStory(req, res);
    return;
  }

  // API: record a knowledge gap
  if (urlPath === '/api/chat-story/gap' && req.method === 'POST') {
    handleChatGap(req, res);
    return;
  }

  // Data files always served from public/ (live, no rebuild needed)
  const baseDir = isDataFilePath(urlPath) ? PUBLIC_DIR : DIST_DIR;
  const filePath = path.join(baseDir, urlPath === '/' ? 'index.html' : decodeURIComponent(urlPath));
  const ext = path.extname(filePath).toLowerCase();

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found: ' + req.url);
      return;
    }
    const mime = MIME_TYPES[ext] || 'application/octet-stream';
    const charset = mime.startsWith('text/') || mime === 'application/json' || mime === 'application/javascript' || mime === 'image/svg+xml' ? '; charset=utf-8' : '';
    res.writeHead(200, { 'Content-Type': mime + charset });
    res.end(data);
  });
});

// ── Chat story handler (SSE streaming) ────────────────────────────────
const DEEPSEEK_CHAT_URL = 'https://api.deepseek.com/chat/completions';
const DEEPSEEK_CHAT_MODEL = 'deepseek-chat'; // non-reasoning, fast + cheap

function handleChatStory(req, res) {
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    try {
      const { storyId, message, history } = JSON.parse(body);
      if (!storyId || !message) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing storyId or message' }));
        return;
      }

      // Load story context
      const newsData = JSON.parse(fs.readFileSync(path.join(PUBLIC_DIR, 'news-data.json'), 'utf-8'));
      const story = newsData.stories?.find(s => s.id === storyId);
      if (!story) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Story not found' }));
        return;
      }

      // Load gaps
      let gaps = [];
      const gapsPath = path.join(PUBLIC_DIR, 'user-knowledge-gaps.json');
      if (fs.existsSync(gapsPath)) {
        try { gaps = JSON.parse(fs.readFileSync(gapsPath, 'utf-8')).gaps?.filter(g => !g.resolvedAt) || []; } catch {}
      }

      // Build system prompt
      const storyContext = [
        `Headline: ${story.headlineEn || ''}`,
        `中文标题: ${story.headlineZh || ''}`,
        `Topic: ${story.topicTier || ''}`,
        story.leadEn ? `Summary: ${story.leadEn}` : '',
        story.keyDetailsEn?.length ? `Key Details: ${story.keyDetailsEn.join(' | ')}` : '',
        story.perspectivesEn?.length ? `Perspectives: ${story.perspectivesEn.map(p => `${p.who}: ${p.what}`).join(' | ')}` : '',
        `Confidence: ${story.confidence || 'N/A'}/5`,
      ].filter(Boolean).join('\n');

      let systemPrompt = `You are an editorial companion for GlobalPulse, a curated bilingual news briefing. Answer concisely (2-4 sentences) and offer to elaborate. Reply in the same language as the reader.\n\n## Current Story\n${storyContext}`;

      if (gaps.length > 0) {
        systemPrompt += `\n\n## Reader's Knowledge Gaps\n${gaps.slice(0, 5).map(g => `- ${g.topic}: ${g.context}`).join('\n')}`;
      }

      systemPrompt += `\n\nWhen the reader asks \"展开讲讲\" or \"what does X mean\", append [GAP: <topic>] at the end of your answer.`;

      // SSE streaming
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });

      const apiKey = process.env.DEEPSEEK_API_KEY;
      const chatMessages = [
        { role: 'system', content: systemPrompt },
        ...(history || []).filter(m => m.role !== 'system').slice(-6),
        { role: 'user', content: message },
      ];

      const apiRes = await fetch(DEEPSEEK_CHAT_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: DEEPSEEK_CHAT_MODEL,
          messages: chatMessages,
          temperature: 0.7,
          max_tokens: 1000,
          stream: true,
        }),
        signal: AbortSignal.timeout(120_000),
      });

      if (!apiRes.ok) {
        const errText = await apiRes.text();
        res.write(`data: ${JSON.stringify({ error: `API ${apiRes.status}: ${errText.slice(0, 200)}` })}\n\n`);
        res.end('data: [DONE]\n\n');
        return;
      }

      const reader = apiRes.body.getReader();
      const decoder = new TextDecoder();
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
              res.write('data: [DONE]\n\n');
              res.end();
              return;
            }
            try {
              const parsed = JSON.parse(data);
              const token = parsed.choices?.[0]?.delta?.content || '';
              if (token) {
                res.write(`data: ${JSON.stringify({ token })}\n\n`);
              }
            } catch {}
          }
        }
      }
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (err) {
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      } else {
        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
        res.end('data: [DONE]\n\n');
      }
    }
  });
}

function handleChatGap(req, res) {
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    try {
      const { topic, context } = JSON.parse(body);
      if (!topic) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing topic' }));
        return;
      }

      const gapsPath = path.join(PUBLIC_DIR, 'user-knowledge-gaps.json');
      let store = { gaps: [] };
      if (fs.existsSync(gapsPath)) {
        try { store = JSON.parse(fs.readFileSync(gapsPath, 'utf-8')); } catch {}
      }

      if (!store.gaps.some(g => g.topic === topic && !g.resolvedAt)) {
        store.gaps.push({
          id: `gap-${Date.now()}`,
          topic,
          context: context || '',
          createdAt: new Date().toISOString().split('T')[0],
          resolvedAt: null,
        });
        // Cap at 20 unresolved
        const unresolved = store.gaps.filter(g => !g.resolvedAt);
        if (unresolved.length > 20) {
          const toResolve = unresolved.sort((a, b) => a.createdAt.localeCompare(b.createdAt)).slice(0, unresolved.length - 20);
          for (const g of toResolve) g.resolvedAt = new Date().toISOString().split('T')[0];
        }
        fs.writeFileSync(gapsPath, JSON.stringify(store, null, 2));
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
  });
}

server.listen(PORT, () => {
  console.log('\x1b[32m╔════════════════════════════════════════════════════════════╗\x1b[0m');
  console.log('\x1b[32m║  GlobalPulse News Briefing Server                        ║\x1b[0m');
  console.log('\x1b[32m╠════════════════════════════════════════════════════════════╣\x1b[0m');
  console.log(`\x1b[36m║  Open: http://localhost:${PORT}/                           ║\x1b[0m`);
  console.log('\x1b[33m║  Press Ctrl+C to stop                                    ║\x1b[0m');
  console.log('\x1b[32m╚════════════════════════════════════════════════════════════╝\x1b[0m');
});
