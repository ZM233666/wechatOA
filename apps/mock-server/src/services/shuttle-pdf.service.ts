import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import type { ShuttleData } from '@app/shared';
import { shuttleSchema } from '../schemas/kb-life.schema';
import { findSuzhouShuttleBusPdfAbsolute, isMinioPdfEnabled } from './minio-pdf.service';
import { logError, logInfo } from '../utils/logger';

const ROOT = path.resolve(__dirname, '../../');
const FIXTURES_DIR = path.join(ROOT, 'fixtures');
const SCRIPT_PATH = path.resolve(__dirname, '../../scripts/parse-shuttle-pdf.py');
export const SHUTTLE_PDF_DIR = path.join(FIXTURES_DIR, 'kb-life/Shuttlebus');

/** 该 PDF 对应苏州园区班车时刻 */
export const SHUTTLE_PDF_LOCATIONS = new Set(['Suzhou']);

export class ShuttlePdfParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ShuttlePdfParseError';
  }
}

/** 苏州：MinIO 启用时取 suzhou/shuttle-bus 缓存；否则取 Shuttlebus/ 下最新 PDF */
export function findShuttlePdfAbsolute(): string | null {
  if (isMinioPdfEnabled()) {
    const fromMinio = findSuzhouShuttleBusPdfAbsolute();
    if (fromMinio) {
      return fromMinio;
    }
  }
  if (!fs.existsSync(SHUTTLE_PDF_DIR)) {
    return null;
  }
  const files = fs
    .readdirSync(SHUTTLE_PDF_DIR)
    .filter((name) => name.toLowerCase().endsWith('.pdf') && !name.startsWith('.'))
    .map((fileName) => {
      const absolute = path.join(SHUTTLE_PDF_DIR, fileName);
      return { absolute, mtimeMs: fs.statSync(absolute).mtimeMs };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
  return files[0]?.absolute ?? null;
}

export function parseShuttlePdf(pdfAbsolute: string): ShuttleData {
  try {
    const stdout = execFileSync('python3', [SCRIPT_PATH, pdfAbsolute], {
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
    });
    return shuttleSchema.parse(JSON.parse(stdout));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logError('Shuttle PDF parse failed', { pdfAbsolute, message });
    throw new ShuttlePdfParseError(
      `班车 PDF 解析失败: ${pdfAbsolute}。请确认已安装 PyMuPDF（pip install pymupdf）。详情: ${message}`,
    );
  }
}

export function loadShuttleDataFromPdf(): ShuttleData | null {
  const pdfAbsolute = findShuttlePdfAbsolute();
  if (!pdfAbsolute) {
    return null;
  }
  logInfo('Loading shuttle schedule from PDF', { pdfAbsolute });
  return parseShuttlePdf(pdfAbsolute);
}
