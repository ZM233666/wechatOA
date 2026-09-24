import { getInsightReport } from '../../../../services/services.service';

Page({
  data: {
    title: 'KB Insights',
  },

  onLoad(query: Record<string, string | undefined>) {
    const id = query.id ?? '';
    if (!id) {
      return;
    }
    void getInsightReport(id)
      .then((report) => {
        this.setData({ title: report.title });
      })
      .catch(() => {
        // keep default title
      });
  },
});
