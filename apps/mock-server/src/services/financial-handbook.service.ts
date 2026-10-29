import path from 'node:path';
import type {
  FinancialGuidanceHandbookData,
  FinancialGuidanceSectionData,
  FinancialGuidanceSectionId,
} from '@app/shared';
import { mockEnv } from '../config/env';
import { financialHandbookSchema } from '../schemas/kb-life.schema';
import { logInfo, logWarn } from '../utils/logger';
import { readJsonFile } from './fixture.service';
import {
  fetchFinancialHandbookCurrent,
  isFinancialHandbookApiEnabled,
  pickPublishedHandbookPdfUrl,
} from './financial-handbook.client';
import {
  listFinancialHandbookPdfFileNames,
  pickPreferredPdfFileName,
  refreshAllMinioPdfsInBackground,
  syncPdfCatalogFromMinio,
} from './minio-pdf.service';

const ROOT = path.resolve(__dirname, '../../');
export const FINANCIAL_HANDBOOK_PDF_URL_PREFIX = '/mock-assets/kb-life/finance-handbook/files/';
export const FINANCIAL_HANDBOOK_LOCAL_PDF_DIR = path.join(
  ROOT,
  'fixtures/kb-life/finance-handbook/files',
);

/** 展示顺序 */
const DISPLAY_SECTION_ORDER: FinancialGuidanceSectionId[] = ['notes', 'manual'];
/** 分配 PDF 时先占「使用手册」，避免平铺目录下两份文件都被注意事项抢走 */
const ASSIGN_SECTION_ORDER: FinancialGuidanceSectionId[] = ['manual', 'notes'];

const LEGACY_ROOT_HINTS: Record<FinancialGuidanceSectionId, string[]> = {
  manual: ['manual', 'handbook', 'help.sap', '使用手册', 'user_manual', 'guide'],
  notes: ['precaution', 'precautions', 'notice', '注意事项', 'notes', 'caution', '提醒'],
};

export type FinancialHandbookPayload = FinancialGuidanceHandbookData;

function encodePdfPath(fileName: string): string {
  return fileName.split('/').map((part) => encodeURIComponent(part)).join('/');
}

function normalizeStorageSubdir(value: string): string {
  return value.replace(/^\/+|\/+$/g, '');
}

function sectionStorageSubdir(sectionId: FinancialGuidanceSectionId): string {
  const raw =
    sectionId === 'manual'
      ? mockEnv.MINIO_FINANCIAL_HANDBOOK_USER_MANUAL_SUBDIR
      : mockEnv.MINIO_FINANCIAL_HANDBOOK_PRECAUTIONS_SUBDIR;
  return normalizeStorageSubdir(raw);
}

function isUnderSectionSubdir(relativePath: string, sectionId: FinancialGuidanceSectionId): boolean {
  const sub = sectionStorageSubdir(sectionId);
  const normalized = relativePath.replace(/\\/g, '/');
  return normalized.startsWith(`${sub}/`);
}

function isLegacyRootPdf(relativePath: string): boolean {
  return !relativePath.replace(/\\/g, '/').includes('/');
}

function normalizeDeclaredPdfPath(
  sectionId: FinancialGuidanceSectionId,
  declared: string | undefined,
): string | undefined {
  const trimmed = declared?.trim();
  if (!trimmed) {
    return undefined;
  }
  const normalized = trimmed.replace(/\\/g, '/');
  if (normalized.includes('..')) {
    return undefined;
  }
  if (normalized.includes('/')) {
    return normalized;
  }
  return `${sectionStorageSubdir(sectionId)}/${normalized}`;
}

function declaredBasename(declared: string | undefined): string | undefined {
  const trimmed = declared?.trim();
  if (!trimmed) {
    return undefined;
  }
  const parts = trimmed.replace(/\\/g, '/').split('/').filter(Boolean);
  return parts[parts.length - 1];
}

function resolveSubdirPdfFileName(
  sectionId: FinancialGuidanceSectionId,
  declared: string | undefined,
  usedFiles: Set<string>,
): string | null {
  const available = listFinancialHandbookPdfFileNames().filter(
    (item) => !usedFiles.has(item.fileName) && isUnderSectionSubdir(item.fileName, sectionId),
  );
  const declaredPath = normalizeDeclaredPdfPath(sectionId, declared);
  const fileName = pickPreferredPdfFileName(available, {
    declared: declaredPath,
    fallbackToLatest: sectionId === 'manual',
  });
  if (fileName) {
    usedFiles.add(fileName);
  }
  return fileName;
}

/** 兼容 MinIO 仍平铺在 finance-handbook/*.pdf（未分子目录） */
function resolveLegacyRootPdfFileName(
  sectionId: FinancialGuidanceSectionId,
  declared: string | undefined,
  usedFiles: Set<string>,
): string | null {
  const available = listFinancialHandbookPdfFileNames().filter(
    (item) => !usedFiles.has(item.fileName) && isLegacyRootPdf(item.fileName),
  );
  if (!available.length) {
    return null;
  }
  const basename = declaredBasename(declared);
  let fileName = pickPreferredPdfFileName(available, {
    declared: basename,
    preferredIncludes: LEGACY_ROOT_HINTS[sectionId],
    fallbackToLatest: sectionId === 'manual',
  });
  if (!fileName && sectionId === 'notes' && available.length > 0) {
    fileName = available[0]?.fileName ?? null;
  }
  if (fileName) {
    usedFiles.add(fileName);
    logInfo('Financial handbook legacy root PDF assigned', { sectionId, fileName });
  }
  return fileName;
}

function resolveSectionPdfFileName(
  sectionId: FinancialGuidanceSectionId,
  declared: string | undefined,
  usedFiles: Set<string>,
): string | null {
  return (
    resolveSubdirPdfFileName(sectionId, declared, usedFiles) ??
    resolveLegacyRootPdfFileName(sectionId, declared, usedFiles)
  );
}

export function refreshFinancialHandbookFromMinio(): void {
  refreshAllMinioPdfsInBackground();
}

export async function loadFinancialHandbook(): Promise<FinancialHandbookPayload> {
  void syncPdfCatalogFromMinio('financial-handbook');
  const meta = readJsonFile('kb-life/financial-handbook.json', financialHandbookSchema);

  let liveManualPdfUrl: string | undefined;
  let liveManualFileName: string | undefined;

  if (isFinancialHandbookApiEnabled()) {
    try {
      const row = await fetchFinancialHandbookCurrent();
      const liveUrl = row ? pickPublishedHandbookPdfUrl(row) : undefined;
      if (liveUrl) {
        liveManualPdfUrl = liveUrl;
        const rawName = row?.published_pdf_file_name || row?.pdf_file_name || undefined;
        liveManualFileName = rawName
          ? normalizeDeclaredPdfPath('manual', rawName) ?? rawName.replace(/\\/g, '/')
          : undefined;
        logInfo('Financial handbook manual PDF from management API', {
          campus: row?.campus,
          fileName: liveManualFileName,
        });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logWarn('Financial handbook management API failed; falling back to MinIO/fixtures', {
        message,
      });
    }
  }

  const usedFiles = new Set<string>();
  const pdfBySection = new Map<
    FinancialGuidanceSectionId,
    { pdfUrl?: string; pdfFileName?: string }
  >();

  if (liveManualPdfUrl) {
    pdfBySection.set('manual', {
      pdfUrl: liveManualPdfUrl,
      pdfFileName: liveManualFileName,
    });
    if (liveManualFileName) {
      usedFiles.add(liveManualFileName);
    }
  }

  const sectionById = new Map(meta.sections.map((section) => [section.id, section]));

  for (const sectionId of ASSIGN_SECTION_ORDER) {
    if (sectionId === 'manual' && pdfBySection.has('manual')) {
      continue;
    }
    const section = sectionById.get(sectionId);
    if (!section) {
      continue;
    }
    const declared =
      section.pdfFile && section.pdfFile.trim() !== '' ? section.pdfFile.trim() : undefined;
    const fileName = resolveSectionPdfFileName(sectionId, declared, usedFiles);
    if (fileName) {
      pdfBySection.set(sectionId, {
        pdfFileName: fileName,
        pdfUrl: `${FINANCIAL_HANDBOOK_PDF_URL_PREFIX}${encodePdfPath(fileName)}`,
      });
    }
  }

  const sections: FinancialGuidanceSectionData[] = DISPLAY_SECTION_ORDER.flatMap((sectionId) => {
    const section = sectionById.get(sectionId);
    if (!section) {
      return [];
    }
    const pdf = pdfBySection.get(sectionId);
    return [
      {
        id: section.id,
        title: section.title,
        subtitle: section.subtitle,
        introCn: section.introCn,
        introEn: section.introEn,
        pdfUrl: pdf?.pdfUrl,
        pdfFileName: pdf?.pdfFileName,
      },
    ];
  });

  return {
    title: meta.title,
    edition: meta.edition,
    introCn: meta.introCn,
    introEn: meta.introEn,
    sections,
  };
}
