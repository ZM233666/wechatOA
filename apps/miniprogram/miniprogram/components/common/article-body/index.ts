import { shouldRenderArticleAsBlocks } from '../../../pages/news/rich-content';
import type { ArticleContentBlock } from '../../../types/content';

Component({
  properties: {
    blocks: {
      type: Array,
      value: [],
    },
    html: {
      type: String,
      value: '',
    },
    bodyFormat: {
      type: String,
      value: '',
    },
  },
  data: {
    useBlocks: false,
    hasBody: false,
  },
  lifetimes: {
    attached() {
      this.syncBody();
    },
  },
  observers: {
    'blocks, html, bodyFormat'() {
      this.syncBody();
    },
  },
  methods: {
    syncBody() {
      const blocks = (this.properties.blocks as ArticleContentBlock[]) ?? [];
      const html = this.properties.html || '';
      const bodyFormat = this.properties.bodyFormat;
      const hasBody = blocks.length > 0 || html.trim().length > 0;
      this.setData({
        hasBody,
        useBlocks: shouldRenderArticleAsBlocks(
          bodyFormat === 'html' || bodyFormat === 'blocks' ? bodyFormat : undefined,
          blocks,
          html,
        ),
      });
    },
  },
});
