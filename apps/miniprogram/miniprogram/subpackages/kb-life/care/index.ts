import {
  getEmployeeCare,
  type EmployeeCareHeroView,
  type EmployeeCareInitiativeView,
} from '../../../services/kb-life.service';
import { RequestError } from '../../../types/api';
import { showComingSoonModal } from '../coming-soon';
import { rejectUnboundIdentityAccess } from '../../../utils/identity-access';

Page({
  data: {
    hero: {
      title: '',
      subtitle: '',
      image: '',
    } as EmployeeCareHeroView,
    initiatives: [] as EmployeeCareInitiativeView[],
    pageStatus: 'loading' as 'loading' | 'success' | 'empty' | 'error',
    errorText: '',
  },

  onLoad() {
    if (rejectUnboundIdentityAccess('/pages/kb-life/index')) {
      return;
    }
    void this.loadCare();
  },

  async loadCare() {
    this.setData({ pageStatus: 'loading', errorText: '' });
    try {
      const result = await getEmployeeCare();
      const empty = !result.initiatives.length;
      this.setData({
        hero: result.hero,
        initiatives: result.initiatives,
        pageStatus: empty ? 'empty' : 'success',
      });
    } catch (error) {
      this.setData({
        pageStatus: 'error',
        errorText: error instanceof RequestError ? error.message : '员工关怀加载失败',
      });
    }
  },

  onReadMore(event: WechatMiniprogram.TouchEvent) {
    const { title } = event.currentTarget.dataset as { title?: string };
    showComingSoonModal(title || 'Initiative');
  },
});
