import { downloadWetalkReaderImage } from '../../../services/wetalk.service';
import { RequestError } from '../../../types/api';

Component({
  properties: {
    page: { type: Object, value: {} },
    isMapMode: { type: Boolean, value: false },
  },
  data: { protectedImagePath: '', imageLoading: false, imageError: '' },
  observers: {
    page() { void this.loadProtectedImage(); },
  },
  lifetimes: {
    detached() {
      const self = this as WechatMiniprogram.Component.TrivialInstance & { _imageRequest?: number };
      self._imageRequest = (self._imageRequest || 0) + 1;
    },
  },
  methods: {
    async loadProtectedImage() {
      const self = this as WechatMiniprogram.Component.TrivialInstance & { _imageRequest?: number };
      const sequence = (self._imageRequest || 0) + 1;
      self._imageRequest = sequence;
      const page = this.properties.page as { protectedImage?: boolean; coverImage?: string };
      this.setData({ protectedImagePath: '', imageError: '', imageLoading: Boolean(page?.protectedImage) });
      if (!page?.protectedImage) return;
      if (!page.coverImage) { this.setData({ imageLoading: false, imageError: '阅读页地址缺失，请重新打开' }); return; }
      try {
        const file = await downloadWetalkReaderImage(page.coverImage);
        if (self._imageRequest === sequence) this.setData({ protectedImagePath: file, imageLoading: false });
      } catch (error) {
        if (self._imageRequest === sequence) this.setData({ imageLoading: false,
          imageError: '页图暂不可用，点击重试' });
      }
    },
    onRetryImage() {
      if (this.data.imageLoading) return;
      return this.loadProtectedImage();
    },
  },
});
