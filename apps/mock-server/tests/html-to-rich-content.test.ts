import { describe, expect, it } from 'vitest';
import { htmlToRichContent } from '../src/services/html-to-rich-content';

describe('htmlToRichContent media blocks', () => {
  it('maps carousel container and video tags to structured blocks', () => {
    const html = `
      <p>导语</p>
      <div data-kb-block="carousel" data-caption="活动剪影">
        <img src="https://cdn.example.com/a.svg" alt="图1" />
        <img src="https://cdn.example.com/b.png" alt="图2" />
      </div>
      <video src="https://cdn.example.com/clip.mp4" poster="https://cdn.example.com/poster.jpg"></video>
    `;
    const { blocks } = htmlToRichContent('article-99', html, {
      mediaBaseUrl: 'https://api.example.com',
    });
    expect(blocks.some((b) => b.type === 'paragraph')).toBe(true);
    const carousel = blocks.find((b) => b.type === 'carousel');
    expect(carousel && carousel.type === 'carousel' && carousel.slides.length).toBe(2);
    const video = blocks.find((b) => b.type === 'video');
    expect(video && video.type === 'video' && video.src).toContain('clip.mp4');
  });

  it('maps aa-svg-gallery section from CMS HTML', () => {
    const config = encodeURIComponent(
      JSON.stringify({
        images: [
          'https://minio.example.com/news-articles/2025/10/photo-1.jpg',
          'https://minio.example.com/news-articles/2025/10/photo-2.jpg',
        ],
        effect: 'scroll',
        scrollDuration: 6,
        loop: true,
      }),
    );
    const html = `
      <p><span>动图展示测试</span></p>
      <section class="aa-svg-gallery aa-effect-scroll" data-aa-svg-gallery="1" data-aa-config="${config}">
        <svg viewBox="0 0 375 400"><foreignObject><img src="https://minio.example.com/news-articles/2025/10/photo-1.jpg" />
        <img src="https://minio.example.com/news-articles/2025/10/photo-2.jpg" />
        <img src="https://minio.example.com/news-articles/2025/10/photo-1.jpg" />
        <img src="https://minio.example.com/news-articles/2025/10/photo-2.jpg" /></foreignObject></svg>
      </section>
    `;
    const { blocks } = htmlToRichContent('article-aa', html);
    const carousel = blocks.find((b) => b.type === 'carousel');
    expect(carousel && carousel.type === 'carousel').toBe(true);
    if (!carousel || carousel.type !== 'carousel') {
      return;
    }
    expect(carousel.slides).toHaveLength(2);
    expect(carousel.autoplay).toBe(true);
    expect(carousel.interval).toBe(6000);
    expect(blocks.some((b) => b.type === 'paragraph')).toBe(true);
  });
});
