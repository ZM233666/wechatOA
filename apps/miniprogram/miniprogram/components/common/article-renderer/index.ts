import type { ArticleContentBlock, RichTextSpan } from '../../../types/content';
import { getCurrentEnvVersion } from '../../../config/env';

const KNOWN_TYPES = new Set([
  'heading',
  'paragraph',
  'image',
  'quote',
  'list',
  'divider',
  'callout',
  'link',
  'carousel',
  'video',
]);

const TAB_PATHS = new Set([
  '/pages/index/index',
  '/pages/services/index',
  '/pages/kb-life/index',
  '/pages/profile/index',
]);

interface RenderSpan extends RichTextSpan {
  className: string;
}

interface RenderBlock {
  id: string;
  type: string;
  level?: number;
  text?: string;
  align?: string;
  spans?: RenderSpan[];
  image?: { url: string; alt: string };
  caption?: string;
  layout?: string;
  source?: string;
  ordered?: boolean;
  items?: string[];
  variant?: string;
  title?: string;
  url?: string;
  linkType?: string;
  imageFailed?: boolean;
  slides?: Array<{ url: string; alt: string }>;
  autoplay?: boolean;
  interval?: number;
  src?: string;
  poster?: string;
}

function marksClass(marks: string[] | undefined): string {
  const classes = ['ar-span'];
  const set = new Set(marks ?? []);
  if (set.has('bold')) classes.push('ar-span--bold');
  if (set.has('italic')) classes.push('ar-span--italic');
  if (set.has('underline')) classes.push('ar-span--underline');
  return classes.join(' ');
}

function toRenderBlocks(blocks: ArticleContentBlock[]): RenderBlock[] {
  return blocks
    .filter((block) => {
      if (!KNOWN_TYPES.has(block.type)) {
        if (getCurrentEnvVersion() === 'develop') {
          console.warn('[article-renderer] unknown block type ignored:', block.type);
        }
        return false;
      }
      return true;
    })
    .map((block) => {
      if (block.type === 'heading') {
        return {
          ...block,
          align: block.align || 'left',
        };
      }
      if (block.type === 'paragraph') {
        return {
          id: block.id,
          type: block.type,
          align: block.align || 'left',
          spans: block.spans.map((span) => ({
            ...span,
            className: marksClass(span.marks),
          })),
        };
      }
      if (block.type === 'image') {
        return {
          id: block.id,
          type: block.type,
          image: block.image,
          caption: block.caption,
          layout: block.layout || 'normal',
          imageFailed: false,
        };
      }
      if (block.type === 'carousel') {
        return {
          id: block.id,
          type: block.type,
          slides: block.slides.map((slide) => ({
            url: slide.url,
            alt: slide.alt || '轮播配图',
          })),
          caption: block.caption,
          autoplay: block.autoplay === true,
          interval: block.interval && block.interval > 0 ? block.interval : 5000,
        };
      }
      if (block.type === 'video') {
        return {
          id: block.id,
          type: block.type,
          src: block.src,
          poster: block.poster,
          caption: block.caption,
        };
      }
      return { ...block } as RenderBlock;
    });
}

Component({
  properties: {
    blocks: {
      type: Array,
      value: [],
    },
    /** 轮播图是否支持点击全屏预览；新闻动图（aa-svg-gallery）应设为 false */
    carouselPreview: {
      type: Boolean,
      value: false,
    },
  },
  data: {
    renderBlocks: [] as RenderBlock[],
  },
  observers: {
    blocks(value: ArticleContentBlock[]) {
      const list = Array.isArray(value) ? value : [];
      this.setData({
        renderBlocks: toRenderBlocks(list),
      });
    },
  },
  methods: {
    onImageError(event: WechatMiniprogram.TouchEvent) {
      const { id } = event.currentTarget.dataset as { id?: string };
      if (!id) {
        return;
      }
      const renderBlocks = (this.data.renderBlocks as RenderBlock[]).map((block) =>
        block.id === id ? { ...block, imageFailed: true } : block,
      );
      this.setData({ renderBlocks });
    },
    onInternalLink(event: WechatMiniprogram.TouchEvent) {
      const { url, linkType } = event.currentTarget.dataset as {
        url?: string;
        linkType?: string;
      };
      this.openLink(url, linkType);
    },
    onSpanLink(event: WechatMiniprogram.TouchEvent) {
      const { href } = event.currentTarget.dataset as { href?: string };
      this.openLink(href, href && href.startsWith('/pages/') ? 'internal' : 'external');
    },
    onCarouselImageTap(event: WechatMiniprogram.TouchEvent) {
      if (!this.properties.carouselPreview) {
        return;
      }
      const { id, url } = event.currentTarget.dataset as { id?: string; url?: string };
      if (!id || !url) {
        return;
      }
      const block = (this.data.renderBlocks as RenderBlock[]).find((item) => item.id === id);
      const urls = block?.slides?.map((slide) => slide.url) ?? [];
      wx.previewImage({
        current: url,
        urls: urls.length ? urls : [url],
      });
    },
    openLink(url: string | undefined, linkType: string | undefined) {
      if (!url) {
        return;
      }
      if (linkType === 'internal' && url.startsWith('/pages/')) {
        const path = url.split('?')[0];
        if (TAB_PATHS.has(path)) {
          wx.switchTab({ url: path });
          return;
        }
        wx.navigateTo({ url });
        return;
      }
      wx.showModal({
        title: '外部链接',
        content: '当前小程序暂不支持直接打开外部网页。',
        showCancel: false,
      });
    },
  },
});
