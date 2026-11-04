import { describe, expect, it } from 'vitest';
import {
  absolutizeHtmlAssetUrls,
  extractPlainTextFromHtml,
  prepareArticleHtml,
  sanitizeRichTextHtml,
} from '../src/services/article-html.service';

const SAMPLE_HTML = `
<p><br></p>
<p><span style="background-color: rgb(234, 153, 153);">克诺尔在中国三十年风雨同舟</span></p>
<p><span style="color: rgb(147, 196, 125);">绿色正文</span><br><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==" alt=""/></p>
<h2>标题一</h2>
<table><tbody><tr><td>单元格</td></tr></tbody></table>
<p>普通段落</p>
<script>alert(1)</script>
`;

describe('article-html.service', () => {
  it('preserves editor inline styles and table markup', () => {
    const html = prepareArticleHtml('demo-1', SAMPLE_HTML, { mediaBaseUrl: 'http://127.0.0.1:8000' });
    expect(html).toContain('background-color: rgb(234, 153, 153)');
    expect(html).toContain('color: rgb(147, 196, 125)');
    expect(html).toContain('绿色正文');
    expect(html).toContain('<h2>标题一</h2>');
    expect(html).toContain('<table');
    expect(html).toContain('单元格');
    expect(html).not.toContain('<script');
  });

  it('persists base64 images to mock-assets runtime path', () => {
    const html = prepareArticleHtml('demo-2', SAMPLE_HTML, { mediaBaseUrl: 'http://127.0.0.1:8000' });
    expect(html).toContain('/mock-assets/news/runtime/demo-2/');
    expect(html).not.toContain('data:image');
  });

  it('absolutizes mock-assets and media urls in html string', () => {
    const html =
      '<img src="/mock-assets/news/runtime/2/a.png"/><a href="/media/files/x.pdf">x</a>';
    const out = absolutizeHtmlAssetUrls(
      html,
      'http://127.0.0.1:3100',
      'http://127.0.0.1:8000',
    );
    expect(out).toContain('src="http://127.0.0.1:3100/mock-assets/news/runtime/2/a.png"');
    expect(out).toContain('href="http://127.0.0.1:8000/media/files/x.pdf"');
  });

  it('extracts plain text for summary', () => {
    const text = extractPlainTextFromHtml(SAMPLE_HTML);
    expect(text).toContain('克诺尔在中国三十年风雨同舟');
    expect(text).toContain('绿色正文');
    expect(text).toContain('普通段落');
  });

  it('does not leak leftover carousel keyframes into summary or rich-text html', () => {
    const html = `
      <p>你好，这是一篇全球关怀的test文章 。。。</p>
      <style>@keyframes aagaey8r96v{0.000%{transform:translateX(-0.00px)}100%{transform:translateX(0)}}</style>
      <section class="aa-svg-gallery" data-aa-svg-gallery="1"></section>
    `;
    const text = extractPlainTextFromHtml(html);
    expect(text).toBe('你好，这是一篇全球关怀的test文章 。。。');
    expect(text).not.toContain('@keyframes');
    const cleaned = sanitizeRichTextHtml(html);
    expect(cleaned).toContain('全球关怀');
    expect(cleaned).not.toContain('@keyframes');
    expect(cleaned).not.toContain('aa-svg-gallery');
  });

  it('strips leftover carousel shells from html (carousel is rendered via richContent)', () => {
    const html =
      '<p>正文</p><section class="aa-svg-gallery" data-aa-svg-gallery="1"><img src="/media/a.png" alt="a"></section>';
    const cleaned = sanitizeRichTextHtml(html);
    expect(cleaned).toContain('正文');
    expect(cleaned).not.toContain('aa-svg-gallery');
    expect(cleaned).not.toContain('<img');
  });
});
