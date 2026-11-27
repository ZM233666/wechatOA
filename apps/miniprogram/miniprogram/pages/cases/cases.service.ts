import type { ArticleContentBlock, ImageResource, PaginatedData } from '../../types/content';
import { toAssetUrl } from '../../utils/format';
import { API_ENDPOINTS } from '../../services/endpoints';
import { get, peekRequestCache, withRequestCache } from '../../services/request';

export interface ProjectCaseView {
  id: string;
  title: string;
  desc: string;
  image: string;
  meta: string;
  background: string;
  solution: string;
  richContent: ArticleContentBlock[];
  contentHtml: string;
  bodyFormat?: 'html' | 'blocks';
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
  contentHtml?: string;
  bodyFormat?: 'html' | 'blocks';
}

function formatWriterMeta(author: string): string {
  const writer = author.trim();
  return writer ? `Writer: ${writer}` : '';
}

export async function getCases(): Promise<ProjectCaseView[]> {
  return withRequestCache('cases:list', 2 * 60_000, async () => {
    const data = await get<PaginatedData<CaseSummaryDto>>(API_ENDPOINTS.cases, {
      page: 1,
      pageSize: 20,
    });
    return data.items.map((item) => ({
      id: item.id,
      title: item.title,
      desc: item.summary,
      image: toAssetUrl(item.coverImage),
      meta: formatWriterMeta(item.region),
      background: '',
      solution: '',
      richContent: [],
      contentHtml: '',
    }));
  });
}

export function peekCaseDetail(id: string): ProjectCaseView | null {
  return peekRequestCache<ProjectCaseView>(`cases:detail:${id}`);
}

export function prefetchCaseDetail(id: string): void {
  void getCaseDetail(id).catch(() => {
    // 预取失败不影响列表；进入详情时仍可重试。
  });
}

export async function getCaseDetail(id: string): Promise<ProjectCaseView> {
  return withRequestCache(`cases:detail:${id}`, 5 * 60_000, async () => {
    const data = await get<CaseDetailDto>(API_ENDPOINTS.caseDetail(id));
    return {
      id: data.id,
      title: data.title,
      desc: data.summary,
      image: toAssetUrl(data.coverImage),
      meta: formatWriterMeta(data.region),
      background: data.background,
      solution: data.solution,
      richContent: data.richContent ?? [],
      contentHtml: data.contentHtml ?? '',
      bodyFormat: data.bodyFormat,
    };
  });
}
