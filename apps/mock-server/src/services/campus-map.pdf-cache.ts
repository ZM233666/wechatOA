import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { logWarn } from '../utils/logger';

const ROOT = path.resolve(__dirname, '../../');
export const LIVE_CAMPUS_MAP_PDF_DIR = path.join(ROOT, 'runtime/campus-map/live');

export function resolveLiveCampusMapPdfAbsolute(location: string, fileName: string): string | null {
  if (!fileName || fileName.includes('..')) {
    return null;
  }
  const absolute = path.join(LIVE_CAMPUS_MAP_PDF_DIR, location, fileName);
  return fs.existsSync(absolute) ? absolute : null;
}

function safePdfName(fileName: string): string {
  const base = path.basename(fileName.replace(/[^\w.\-()+]/g, '_'));
  return base.toLowerCase().endsWith('.pdf') ? base : `${base}.pdf`;
}

export async function cacheCampusMapPdfFromUrl(
  location: string,
  fileName: string,
  downloadUrl: string,
): Promise<string | null> {
  const safeName = safePdfName(fileName || 'campus-map.pdf');
  const dir = path.join(LIVE_CAMPUS_MAP_PDF_DIR, location);
  const absolute = path.join(dir, safeName);
  try {
    fs.mkdirSync(dir, { recursive: true });
    const response = await fetch(downloadUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length < 32) {
      throw new Error('PDF 内容过短');
    }
    fs.writeFileSync(absolute, buffer);
    return absolute;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logWarn('Campus map PDF cache failed', {
      location,
      fileName: safeName,
      urlKey: createHash('sha1').update(downloadUrl.split('?')[0] ?? '').digest('hex').slice(0, 8),
      message,
    });
    if (fs.existsSync(absolute)) {
      return absolute;
    }
    return null;
  }
}
