import type { ArticleContentBlock, ImageResource, PaginatedData } from '../types/content';
import { toAssetUrl } from '../utils/format';
import { API_ENDPOINTS } from './endpoints';
import { get } from './request';

export interface ProjectCaseView {
  id: string;
  title: string;
  desc: string;
  image: string;
  meta: string;
  background: string;
  solution: string;
  richContent: ArticleContentBlock[];
}

interface CaseSummaryDto {
  id: string;
  title: string;
  summary: string;
  coverImage: ImageResource;
  region: string;
  industry: string;
}

interface CaseDetailDto extends CaseSummaryDto {
  meta: string;
  background: string;
  solution: string;
  richContent: ArticleContentBlock[];
}

export async function getCases(): Promise<ProjectCaseView[]> {
  const data = await get<PaginatedData<CaseSummaryDto>>(API_ENDPOINTS.cases, {
    page: 1,
    pageSize: 20,
  });
  return data.items.map((item) => ({
    id: item.id,
    title: item.title,
    desc: item.summary,
    image: toAssetUrl(item.coverImage),
    meta: `Industry: ${item.industry} · Region: ${item.region}`,
    background: '',
    solution: '',
    richContent: [],
  }));
}

export async function getCaseDetail(id: string): Promise<ProjectCaseView> {
  const data = await get<CaseDetailDto>(API_ENDPOINTS.caseDetail(id));
  return {
    id: data.id,
    title: data.title,
    desc: data.summary,
    image: toAssetUrl(data.coverImage),
    meta: data.meta,
    background: data.background,
    solution: data.solution,
    richContent: data.richContent,
  };
}
