import { execFile, execFileSync } from 'node:child_process';
import { promisify } from 'node:util';
const execFileAsync = promisify(execFile);
import fs from 'node:fs';
import path from 'node:path';
import { logError, logInfo } from '../utils/logger';

const SCRIPT_PATH = path.resolve(__dirname, '../../scripts/render-pdf-sheets.py');
const DEFAULT_ZOOM = 2;

export class PdfSheetRenderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PdfSheetRenderError';
  }
}

function latestMtimeMs(dir: string): number {
  if (!fs.existsSync(dir)) {
    return 0;
  }
  return fs
    .readdirSync(dir)
    .filter((name) => /^page-\d+\.png$/i.test(name))
    .reduce((max, name) => {
      const stamp = fs.statSync(path.join(dir, name)).mtimeMs;
      return Math.max(max, stamp);
    }, 0);
}

function countSheetPages(dir: string): number {
  if (!fs.existsSync(dir)) {
    return 0;
  }
  return fs.readdirSync(dir).filter((name) => /^page-\d+\.png$/i.test(name)).length;
}

/** PDF 比 sheets 新、或尚无页图时，用 PyMuPDF 即时渲成 page-*.png */
export function ensurePdfSheets(options: {
  id: string;
  pdfAbsolute: string;
  sheetsDir: string;
  zoom?: number;
}): number {
  const { id, pdfAbsolute, sheetsDir, zoom = DEFAULT_ZOOM } = options;
  if (!fs.existsSync(pdfAbsolute)) {
    throw new PdfSheetRenderError(`PDF 不存在，无法渲页: ${pdfAbsolute}`);
  }

  const pdfMtime = fs.statSync(pdfAbsolute).mtimeMs;
  const sheetCount = countSheetPages(sheetsDir);
  const sheetsMtime = latestMtimeMs(sheetsDir);
  if (sheetCount > 0 && sheetsMtime >= pdfMtime) {
    return sheetCount;
  }

  fs.mkdirSync(sheetsDir, { recursive: true });
  logInfo(`Rendering PDF sheets for ${id}`, { pdfAbsolute, sheetsDir });

  try {
    const stdout = execFileSync(
      'python3',
      [SCRIPT_PATH, pdfAbsolute, sheetsDir, '--zoom', String(zoom)],
      { encoding: 'utf8' },
    );
    const rendered = Number.parseInt(stdout.trim(), 10);
    const finalCount = Number.isFinite(rendered) && rendered > 0 ? rendered : countSheetPages(sheetsDir);
    if (finalCount <= 0) {
      throw new PdfSheetRenderError(`PDF 渲页失败（0 页）: ${id}`);
    }
    return finalCount;
  } catch (error) {
    if (error instanceof PdfSheetRenderError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : String(error);
    logError(`PDF 渲页失败: ${id}`, { message });
    throw new PdfSheetRenderError(
      `PDF 即时渲页失败: ${id}。请确认已安装 PyMuPDF（pip install pymupdf）。详情: ${message}`,
    );
  }
}


/** Bounded asynchronous variant for live Mini PDFs; legacy Insights behavior is unchanged. */
let livePython: Promise<string> | undefined;
async function pdfPython(): Promise<string> {
  if (!livePython) livePython = (async () => {
    for (const candidate of ['python3', '/usr/local/bin/python3', '/opt/homebrew/bin/python3']) {
      try { await execFileAsync(candidate, ['-c', 'import fitz'], { timeout: 5_000, maxBuffer: 4096 }); return candidate; }
      catch { /* Try only an already-installed interpreter; never install packages. */ }
    }
    throw new PdfSheetRenderError('PDF renderer unavailable (PyMuPDF required)');
  })();
  return livePython;
}
export async function renderLivePdfSheets(pdfAbsolute: string, sheetsDir: string): Promise<void> {
  const python = await pdfPython();
  try {
    await execFileAsync(python, [SCRIPT_PATH, pdfAbsolute, sheetsDir, '--zoom', '2',
      '--max-pages', '120', '--max-pixels', '12000000', '--max-total-pixels', '120000000',
      '--max-output-bytes', '157286400'], { timeout: 45_000, maxBuffer: 8192 });
  } catch { throw new PdfSheetRenderError('PDF rendering failed or exceeded safety limits'); }
}
