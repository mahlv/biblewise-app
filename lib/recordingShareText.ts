import type { RecordingSummary } from './recordingSummary';

interface ShareTextInput {
  summary: RecordingSummary;
  preacher?: string;
  church?: string;
}

const MAX_POINTS = 3;
const MAX_SCRIPTURES = 5;

/**
 * Plain text version of a recording's summary, ready for WhatsApp
 * (`*bold*` and `_italic_` are WhatsApp formatting).
 */
export function buildRecordingShareText({ summary, preacher, church }: ShareTextInput): string {
  const lines: string[] = [`*${summary.title}*`];

  const who = [preacher, church].filter((part): part is string => !!part?.trim()).join(' · ');
  if (who) lines.push(`_${who}_`);
  if (summary.theme.trim()) lines.push('', summary.theme.trim());

  const points = summary.centralPoints.slice(0, MAX_POINTS);
  if (points.length > 0) {
    lines.push('', '*Pontos centrais*');
    points.forEach((point, index) => lines.push(`${index + 1}. ${point.title}`));
  }

  const references = summary.scripturesCited.map((item) => item.reference.trim()).filter(Boolean).slice(0, MAX_SCRIPTURES);
  if (references.length > 0) lines.push('', `*Escrituras:* ${references.join(', ')}`);

  if (summary.impactQuote.trim()) lines.push('', `“${summary.impactQuote.trim()}”`);

  lines.push('', 'Resumo feito com o Biblewise');
  return lines.join('\n');
}

/** A safe file name for the shared audio, e.g. "Pregacao-o-poder-da-gratidao.m4a". */
export function recordingFileName(title: string | undefined): string {
  const slug = (title ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
    .replace(/-+$/g, '');
  return `Pregacao-${slug || 'gravacao'}.m4a`;
}
