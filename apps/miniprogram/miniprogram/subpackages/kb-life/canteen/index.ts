import { getCanteen, type CanteenSection } from '../../../services/kb-life.service';
import { KB_LIFE_NO_CONTENT_DESC, KB_LIFE_NO_CONTENT_TITLE } from '../../../constants/kb-life-empty';
import { friendlyUnavailablePageData, logPageLoadIssue, standbyContentFields } from '../../../utils/friendly-page-error';
import { resolveCampusLocation } from '../../../utils/campus-location';
import { handleIdentityAccessFailure } from '../../../utils/identity-access';
import { rejectVisitorCampusAccess } from '../../../utils/kb-life-access';

Page({
  data: {
    location: '',
    navTitle: 'Canteen',
    intro: '',
    menuTitle: '',
    menuDate: '',
    coverImage: '',
    sections: [] as CanteenSection[],
    pageStatus: 'loading' as 'loading' | 'success' | 'error' | 'empty',
    emptyTitle: KB_LIFE_NO_CONTENT_TITLE,
    emptyDesc: KB_LIFE_NO_CONTENT_DESC,
    errorText: '',
  },

  onLoad(query: Record<string, string | undefined>) {
    if (rejectVisitorCampusAccess('Canteen')) {
      return;
    }
    this.location = resolveCampusLocation(query.location);
    this.setData({ location: this.location });
    void this.loadCanteen();
  },

  location: '' as string,

  async loadCanteen() {
    this.setData({ pageStatus: 'loading' });
    try {
      const result = await getCanteen(this.location);
      const hasMenu = result.sections.length > 0;
      this.setData({
        location: result.location,
        intro: result.intro,
        menuTitle: result.title,
        menuDate: result.menuDate,
        coverImage: result.coverImage,
        sections: result.sections,
        pageStatus: hasMenu ? 'success' : 'empty',
        ...(hasMenu ? {} : standbyContentFields()),
      });
    } catch (error) {
      logPageLoadIssue('canteen', error);
      if (handleIdentityAccessFailure(error, { title: 'Canteen' })) {
        return;
      }
      this.setData(
        friendlyUnavailablePageData({
          title: KB_LIFE_NO_CONTENT_TITLE,
          description: KB_LIFE_NO_CONTENT_DESC,
        }),
      );
    }
  },
});
