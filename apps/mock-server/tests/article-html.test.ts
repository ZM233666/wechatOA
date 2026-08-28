import { describe, expect, it } from 'vitest';
import {
  absolutizeHtmlAssetUrls,
  extractPlainTextFromHtml,
  prepareArticleHtml,
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
});
