import type { EmployeeCareInitiative, KbLifeBanner } from '@app/shared';
import {
  mapMiniCareArticleToInitiative,
  type MiniCareArticleDto,
  type MiniLocalGlobalCarePayload,
} from './local-global-care-mini.mapper';

/** 与首页 Banner 上限一致 */
export const KB_LIFE_BANNER_LIMIT = 5;

function initiativeToKbLifeBanner(item: EmployeeCareInitiative): KbLifeBanner | null {
  if (!item.image?.url) {
    return null;
  }
  return {
    id: item.id,
    title: item.title,
    subtitle: '',
    image: item.image,
    careId: item.id,
    targetUrl: `/subpackages/kb-life/care/detail?id=${encodeURIComponent(item.id)}`,
  };
}

/** 与首页 `selectHomeBanners` 类似：CMS 勾选「KB Life 顶栏」的全部已发布稿 */
export function selectKbLifeCareBanners(initiatives: EmployeeCareInitiative[]): KbLifeBanner[] {
  return initiatives
    .filter((item) => item.showOnKbLifeBanner === true)
    .sort((a, b) => (b.date || '').localeCompare(a.date || '') || a.id.localeCompare(b.id))
    .slice(0, KB_LIFE_BANNER_LIMIT)
    .map(initiativeToKbLifeBanner)
    .filter((item): item is KbLifeBanner => item != null);
}

/** 优先使用 Django Mini 的 `local.banner` / `global.banner`（与后台置顶列表一致） */
export function selectKbLifeCareBannersFromMini(payload: MiniLocalGlobalCarePayload): KbLifeBanner[] {
  const published = [...(payload.local?.articles ?? []), ...(payload.global?.articles ?? [])];
  const publishedIds = new Set(published.map((article) => article.id));
  const seen = new Set<number>();
  const pinned: MiniCareArticleDto[] = [];

  const push = (article: MiniCareArticleDto) => {
    if (!publishedIds.has(article.id) || seen.has(article.id)) {
      return;
    }
    seen.add(article.id);
    pinned.push(article);
  };

  for (const article of [...(payload.local?.banner ?? []), ...(payload.global?.banner ?? [])]) {
    push(article);
  }
  for (const article of published) {
    if (article.showOnKbLifeBanner) {
      push(article);
    }
  }

  return pinned
    .sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || '') || a.id - b.id)
    .slice(0, KB_LIFE_BANNER_LIMIT)
    .map((article) => initiativeToKbLifeBanner(mapMiniCareArticleToInitiative(article)))
    .filter((item): item is KbLifeBanner => item != null);
}
