import { guidanceDocumentsSchema } from '../schemas/kb-life.schema';
import { readJsonFile } from './fixture.service';

export function loadGuidanceDocuments() {
  return readJsonFile('kb-life/guidance-documents.json', guidanceDocumentsSchema);
}
