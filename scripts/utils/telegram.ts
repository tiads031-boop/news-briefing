import { info, error } from './logger';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

interface TelegramMessage {
  text: string;
  parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
}

export async function sendTelegramMessage(message: TelegramMessage): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    info('Telegram not configured (TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID missing)');
    return false;
  }

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message.text,
        parse_mode: message.parse_mode || 'HTML',
        disable_web_page_preview: false,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`HTTP ${res.status}: ${body}`);
    }

    info('Telegram notification sent successfully');
    return true;
  } catch (err) {
    error('Failed to send Telegram message', err);
    return false;
  }
}

export function formatBriefingNotification(params: {
  issueNumber?: number;
  issueDate: string;
  storyCount: number;
  alsoTodayCount: number;
  sourceCount: number;
  newStories?: string[];
  baseUrl?: string;
}): string {
  const { issueNumber, issueDate, storyCount, alsoTodayCount, sourceCount, newStories, baseUrl } = params;

  const lines: string[] = [];
  lines.push(`📰 <b>GlobalPulse 简报更新</b>`);
  lines.push('');
  if (issueNumber) {
    lines.push(`<b>第 ${issueNumber} 期</b> · ${issueDate}`);
  } else {
    lines.push(`<b>${issueDate}</b>`);
  }
  lines.push('');
  lines.push(`📌 ${storyCount} 条深度报道`);
  lines.push(`📎 ${alsoTodayCount} 条简讯`);
  lines.push(`📡 ${sourceCount} 个信源`);

  if (newStories && newStories.length > 0) {
    lines.push('');
    lines.push('<b>新增报道：</b>');
    newStories.slice(0, 5).forEach((title, i) => {
      lines.push(`${i + 1}. ${title}`);
    });
    if (newStories.length > 5) {
      lines.push(`... 还有 ${newStories.length - 5} 条`);
    }
  }

  if (baseUrl) {
    lines.push('');
    lines.push(`<a href="${baseUrl}">👉 查看完整简报</a>`);
  }

  return lines.join('\n');
}
