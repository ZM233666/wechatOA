import type { Request, Response } from 'express';
import { isArticleNewsEnabled } from '../services/article-content.client';
import { getFixtures } from '../services/fixture.service';
import { withAbsoluteAssets } from '../services/asset-url.service';
import { selectHomeBanners, selectHomeNews } from '../services/news.service';
import { getNewsArticlesForRequest } from '../services/news-source.service';
import { success } from '../utils/response';

export function getHome(req: Request, res: Response): void {
  if (req.mockScenario === 'empty') {
    const emptyHome = {
      ...getFixtures().home,
      banners: [],
      quickEntries: [],
      recommendedProducts: [],
      recommendedCases: [],
      latestNews: [],
      serviceEntries: [],
    };
    success(res, withAbsoluteAssets(req, emptyHome), req.requestId);
    return;
  }
  const fixtures = getFixtures();
  const newsArticles = getNewsArticlesForRequest();
  const newsBanners = selectHomeBanners(newsArticles);
  const useArticleNews = isArticleNewsEnabled();
  const home = {
    ...fixtures.home,
    banners: newsBanners.length > 0 ? newsBanners : useArticleNews ? [] : fixtures.home.banners,
    latestNews: selectHomeNews(newsArticles),
  };
  success(res, withAbsoluteAssets(req, home), req.requestId);
}
