import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Story } from '../types';

interface PdfExportProps {
  stories: Story[];
  issueDate?: string;
  issueNumber?: number;
}

export default function PdfExport({ stories, issueDate, issueNumber }: PdfExportProps) {
  const { t, i18n } = useTranslation();
  const [isExporting, setIsExporting] = useState(false);
  // Print window reference managed locally in handler

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Use browser print to PDF
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert(t('pdfExport.popupBlocked'));
        return;
      }

      const isZh = i18n.language === 'zh';
      const title = issueNumber
        ? `GlobalPulse #${issueNumber} — ${issueDate}`
        : `GlobalPulse — ${issueDate || new Date().toISOString().slice(0, 10)}`;

      const html = generatePrintHTML(stories, title, isZh, t);
      printWindow.document.write(html);
      printWindow.document.close();

      // Auto-trigger print after images load
      setTimeout(() => {
        printWindow.print();
      }, 500);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      className="pdf-export-btn"
      onClick={handleExport}
      disabled={isExporting}
      title={t('pdfExport.title')}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" x2="12" y1="15" y2="3" />
      </svg>
      <span>{isExporting ? t('pdfExport.exporting') : t('pdfExport.label')}</span>
    </button>
  );
}

function generatePrintHTML(
  stories: Story[],
  title: string,
  isZh: boolean,
  t: (key: string) => string
): string {
  const storyHTML = stories.map(story => {
    const headline = isZh ? (story.headlineZh || story.headline) : (story.headlineEn || story.headline);
    const lead = isZh ? (story.leadZh || story.lead) : (story.leadEn || story.lead);
    const details = isZh ? (story.keyDetailsZh || story.keyDetails) : (story.keyDetailsEn || story.keyDetails);
    const perspectives = isZh ? (story.perspectivesZh || story.perspectives) : (story.perspectivesEn || story.perspectives);
    const financeJargon = isZh ? (story.financeJargonZh || story.financeJargon) : (story.financeJargonEn || story.financeJargon);

    const perspectivesHTML = perspectives?.map(p => `
      <div style="margin: 8px 0; padding: 8px; background: #f8f8f8; border-left: 3px solid #333;">
        <strong>${p.who}</strong>
        <p style="margin: 4px 0 0;">${p.what}</p>
      </div>
    `).join('') || '';

    const financeJargonHTML = financeJargon?.map(item => `
      <li style="margin: 6px 0;">
        <strong>${item.term}</strong>: ${item.explanation}
        ${item.sourceUrl ? `<div style="font-size: 11px; color: #777; margin-top: 2px;">${isZh ? '来源：' : 'Source: '}<a href="${item.sourceUrl}" style="color: #555; text-decoration: underline;">${item.sourceName || (isZh ? '官方资料' : 'Official material')}</a></div>` : ''}
      </li>
    `).join('') || '';

    const sourcesHTML = story.sources.map(s => `
      <li style="margin: 4px 0;">
        <a href="${s.url || '#'}" style="color: #333; text-decoration: underline;">${s.name}</a>
        ${s.language ? `<span style="color: #999; font-size: 11px;"> (${s.language})</span>` : ''}
      </li>
    `).join('');

    return `
      <div style="margin-bottom: 40px; page-break-inside: avoid;">
        <div style="font-size: 11px; color: #999; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">
          ${story.topic} · ${story.agreement}
        </div>
        <h2 style="font-size: 20px; font-weight: 700; margin: 0 0 12px; line-height: 1.3;">${headline}</h2>
        <p style="font-size: 14px; color: #555; line-height: 1.6; margin: 0 0 16px;">${lead}</p>
        
        ${details?.length ? `
          <h3 style="font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin: 16px 0 8px;">${t('story.keyDetails')}</h3>
          <ul style="margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.7;">
            ${details.map(d => `<li>${d}</li>`).join('')}
          </ul>
        ` : ''}
        
        ${perspectivesHTML ? `
          <h3 style="font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin: 16px 0 8px;">${t('story.perspectives')}</h3>
          ${perspectivesHTML}
        ` : ''}

        ${financeJargonHTML ? `
          <h3 style="font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin: 16px 0 8px;">${isZh ? '关键术语' : 'Key Terms'}</h3>
          <ul style="margin: 0; padding-left: 20px; font-size: 12px; line-height: 1.6;">
            ${financeJargonHTML}
          </ul>
        ` : ''}
        
        <h3 style="font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin: 16px 0 8px;">${t('story.showSources')}</h3>
        <ul style="margin: 0; padding-left: 20px; font-size: 12px; line-height: 1.6;">
          ${sourcesHTML}
        </ul>
      </div>
    `;
  }).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    @page { margin: 20mm; size: A4; }
    body {
      font-family: Georgia, "Noto Serif SC", serif;
      font-size: 13px;
      line-height: 1.6;
      color: #222;
      max-width: 700px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #222;
      padding-bottom: 16px;
      margin-bottom: 32px;
    }
    .header h1 {
      font-size: 28px;
      font-weight: 700;
      margin: 0 0 8px;
      letter-spacing: -0.5px;
    }
    .header .date {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 2px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 16px;
      border-top: 1px solid #ddd;
      font-size: 10px;
      color: #999;
      text-align: center;
    }
    @media print {
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>GlobalPulse</h1>
    <div class="date">${title}</div>
  </div>
  
  <div class="no-print" style="text-align: center; margin-bottom: 24px; padding: 12px; background: #f5f5f5; border-radius: 4px;">
    <p style="margin: 0; font-size: 12px; color: #666;">
      ${isZh ? '按 Ctrl+P（或 Cmd+P）保存为 PDF' : 'Press Ctrl+P (or Cmd+P) to save as PDF'}
    </p>
  </div>
  
  ${storyHTML}
  
  <div class="footer">
    ${t('footer.disclaimer1')}
  </div>
</body>
</html>
  `;
}
