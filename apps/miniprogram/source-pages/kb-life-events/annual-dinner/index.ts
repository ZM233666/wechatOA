import { getCompanyActivities } from '../../../../services/kb-life.service';
import { RequestError } from '../../../../types/api';

Page({
  data: {
    pageStatus: 'loading' as 'loading' | 'success' | 'empty' | 'error',
    errorText: '',
    event: {
      title: '',
      subtitle: '',
      infoTitle: '活动信息 / Event Info',
      time: '',
      venue: '',
      dressCode: '',
      highlightsTitle: '活动亮点 / Highlights',
      highlights: [] as string[],
    },
  },

  onLoad() {
    void this.loadDetail();
  },

  async loadDetail() {
    this.setData({ pageStatus: 'loading', errorText: '' });
    try {
      const result = await getCompanyActivities();
      if (!result.annualDinner) {
        this.setData({ pageStatus: 'empty' });
        return;
      }
      this.setData({
        event: result.annualDinner,
        pageStatus: 'success',
      });
    } catch (error) {
      this.setData({
        pageStatus: 'error',
        errorText: error instanceof RequestError ? error.message : '年会信息加载失败',
      });
    }
  },
});
