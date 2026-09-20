import 'pdf-parse/worker';
import { PDFParse } from 'pdf-parse';
import { createWorker } from 'tesseract.js';
import type { ExtractedReportMetadata } from './types';

const diseasePatterns: Array<{ name: string; regex: RegExp }> = [
  { name: 'Covid-19', regex: /\b(covid[- ]?19|sars[- ]?cov[- ]?2|coronavirus)\b/i },
  { name: 'Monkeypox', regex: /\b(monkeypox|mpox)\b/i },
  { name: 'Dengue', regex: /\bdengue\b/i },
  { name: 'Malaria', regex: /\bmalaria\b/i },
  { name: 'Swine Flu', regex: /\b(swine\s*flu|h1n1)\b/i },
  { name: 'Haemoglobin', regex: /\b(h[a]?emoglobin|hb|hgb)\b/i },
  { name: 'Uric Acid', regex: /\buric\s*acid\b/i },
  { name: 'Cholesterol', regex: /\bcholest[e]?rol\b/i },
  { name: 'Blood Glucose', regex: /\bblood\s*(glucose|sugar)\b/i }
];

function clean(value?: string | null) {
  return value?.replace(/\s+/g, ' ').trim() || null;
}

function labelValue(text: string, labels: string[]) {
  const escaped = labels.map(x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const match = text.match(new RegExp(`(?:${escaped})\\s*[:\\-]\\s*([^\\n\\r]{1,100})`, 'i'));
  return clean(match?.[1]);
}

function toIsoDate(raw?: string | null): string | null {
  if (!raw) return null;
  const value = raw.trim();
  const iso = value.match(/\b(20\d{2}|19\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`;

  const slash = value.match(/\b(\d{1,2})[/.\-](\d{1,2})[/.\-](20\d{2}|19\d{2})\b/);
  if (slash) {
    let first = Number(slash[1]);
    let second = Number(slash[2]);
    // Prefer US-style MM/DD/YYYY unless the first component cannot be a month.
    const month = first > 12 ? second : first;
    const day = first > 12 ? first : second;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${slash[3]}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return null;
}

function findDisease(text: string) {
  return diseasePatterns.find(item => item.regex.test(text))?.name ?? null;
}

function findLabName(text: string) {
  const direct = labelValue(text, ['Lab Name', 'Laboratory', 'Diagnostic Center', 'Lab']);
  if (direct) return direct;
  const lines = text.split(/\r?\n/).map(clean).filter(Boolean) as string[];
  return lines.find(line => /(lab|laborator|diagnostic|patholog|hospital)/i.test(line) && line.length < 100) ?? null;
}


export function parseReportText(
  text: string
): ExtractedReportMetadata {
  const reportDate =
    toIsoDate(
      labelValue(text, [
        'Report Date',
        'Date of Report',
        'Result Date',
        'Collection Date',
        'Sample Date'
      ])
    ) || new Date().toISOString().slice(0, 10);

  return {
    disease_name: findDisease(text),
    report_date: reportDate,
    lab_name: findLabName(text)
  };
}

async function ocrImage(data: Uint8Array | Buffer) {
  const worker = await createWorker('eng');
  try {
    const result = await worker.recognize(Buffer.from(data));
    return result.data.text || '';
  } finally {
    await worker.terminate();
  }
}

export async function extractReportText(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());

  if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
    return ocrImage(buffer);
  }

  if (file.type !== 'application/pdf') throw new Error('Only PDF, JPG and JPEG files are supported.');

  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    let text = result.text || '';

    // Scanned PDFs often contain little/no text. OCR the first two rendered pages as a fallback.
    if (text.replace(/\s/g, '').length < 80) {
      const screenshots = await parser.getScreenshot({ first: 2, desiredWidth: 1400, imageBuffer: true, imageDataUrl: false });
      const worker = await createWorker('eng');
      try {
        const pages: string[] = [];
        for (const page of screenshots.pages) {
          if (!page.data) continue;
          const recognized = await worker.recognize(Buffer.from(page.data));
          pages.push(recognized.data.text || '');
        }
        text = pages.join('\n');
      } finally {
        await worker.terminate();
      }
    }

    return text;
  } finally {
    await parser.destroy();
  }
}
