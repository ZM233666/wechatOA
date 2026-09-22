import type { BrandOverview } from '../schemas/brand.schema';
import { getFixtures } from './fixture.service';
import { isBrandIntroEnabled } from './brand-intro.client';
import {
  getCachedBrandIntro,
  refreshBrandIntroInBackground,
  syncBrandIntro,
} from './brand-intro.service';

/**
 * 优先使用 Django 公开读接口缓存；远程无数据或失败时回退本地 fixture。
 */
export async function getBrandForRequest(): Promise<BrandOverview> {
  if (isBrandIntroEnabled()) {
    let brand = getCachedBrandIntro();
    if (!brand) {
      brand = await syncBrandIntro({ force: true });
    } else {
      refreshBrandIntroInBackground();
    }
    if (brand) {
      return brand;
    }
  }
  return getFixtures().brand;
}
