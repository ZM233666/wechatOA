import { getCompanyActivities } from '../../../../services/kb-life.service';
import { RequestError } from '../../../../types/api';

Page({
  data: {
    pageStatus: 'loading' as 'loading' | 'success' | 'empty' | 'error',
    errorText: '',
    event: {
      title: '部门团建与出游 / Team Building & Outings',
      subtitle: '放松身心，增进团队凝聚力 / Relax & Bond',
      activities: [] as Array<{
        id: string;
        title: string;
        descriptionCn: string;
        descriptionEn: string;
        timeLabel: string;
        status: 'open' | 'closed';
        statusText: string;
      }>,
    },
  },

  onLoad() {
    void this.loadDetail();
  },

  async loadDetail() {
    this.setData({ pageStatus: 'loading', errorText: '' });
    try {
      const result = await getCompanyActivities();
      const activities = result.outings;
      if (!activities.length) {
        this.setData({
          event: {
            title: result.outingsMeta.title,
            subtitle: result.outingsMeta.subtitle,
            activities: [],
          },
          pageStatus: 'empty',
        });
        return;
      }
      this.setData({
        event: {
          title: result.outingsMeta.title,
          subtitle: result.outingsMeta.subtitle,
          activities,
        },
        pageStatus: 'success',
      });
    } catch (error) {
      this.setData({
        pageStatus: 'error',
        errorText: error instanceof RequestError ? error.message : '团建出游加载失败',
      });
    }
  },
});
