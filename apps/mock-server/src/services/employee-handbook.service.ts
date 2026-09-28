import { employeeHandbookSchema } from '../schemas/kb-life.schema';
import { readJsonFile } from './fixture.service';
import {
  findEmployeeHandbookPdfFileName,
  refreshAllMinioPdfsInBackground,
  syncPdfCatalogFromMinio,
} from './minio-pdf.service';

export const EMPLOYEE_HANDBOOK_PDF_URL_PREFIX = '/mock-assets/kb-life/handbook/files/';

export type EmployeeHandbookPayload = {
  title: string;
  edition: string;
  introCn: string;
  introEn: string;
  pdfUrl?: string;
  pdfFileName?: string;
};

function encodePdfPath(fileName: string): string {
  return fileName.split('/').map((part) => encodeURIComponent(part)).join('/');
}

export function refreshEmployeeHandbookFromMinio(): void {
  refreshAllMinioPdfsInBackground();
}

export async function loadEmployeeHandbook(): Promise<EmployeeHandbookPayload> {
  await syncPdfCatalogFromMinio('employee-handbook');
  const meta = readJsonFile('kb-life/handbook.json', employeeHandbookSchema);
  const declared = meta.pdfFile?.trim() || undefined;
  const fileName = findEmployeeHandbookPdfFileName(declared);
  const pdfUrl = fileName
    ? `${EMPLOYEE_HANDBOOK_PDF_URL_PREFIX}${encodePdfPath(fileName)}`
    : undefined;
  return {
    title: meta.title,
    edition: meta.edition,
    introCn: meta.introCn,
    introEn: meta.introEn,
    pdfUrl,
    pdfFileName: fileName ?? undefined,
  };
}
