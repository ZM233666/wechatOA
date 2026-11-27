import { CONTENT_STANDBY_TITLE } from '../../../constants/content-unavailable';

Component({
  properties: {
    title: {
      type: String,
      value: '暂无内容',
    },
    description: {
      type: String,
      value: '',
    },
  },
  data: {
    standby: false,
  },
  observers: {
    title(title: string) {
      this.setData({ standby: title === CONTENT_STANDBY_TITLE });
    },
  },
});
