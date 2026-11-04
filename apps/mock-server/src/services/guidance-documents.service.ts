import { guidanceDocumentsSchema } from '../schemas/kb-life.schema';
import { readJsonFile } from './fixture.service';

/** 本版本不提供员工手册；恢复时删掉该 id */
const HIDDEN_GUIDANCE_DOCUMENT_IDS = new Set(['employee-handbook']);

export function loadGuidanceDocuments() {
  const data = readJsonFile('kb-life/guidance-documents.json', guidanceDocumentsSchema);
  return {
    ...data,
    items: data.items.filter((item) => !HIDDEN_GUIDANCE_DOCUMENT_IDS.has(item.id)),
  };
}
