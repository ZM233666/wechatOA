import { describe, expect, it } from 'vitest';
import {
  hasUsableNewsBody,
  shouldPreferNewsRichContentBlocks,
} from '../src/services/news-body-presentation';

describe('shouldPreferNewsRichContentBlocks', () => {
  it('prefers blocks when html is placeholder but richContent has carousel', () => {
    const prefer = shouldPreferNewsRichContentBlocks(
      'html',
      [
        {
          id: 'p-1',
          type: 'paragraph',
          spans: [{ type: 'text', text: '动图展示测试' }],
        },
        {
          id: 'c-1',
          type: 'carousel',
          slides: [
            {
              url: 'https://cdn.example.com/a.jpg',
              alt: 'a',
              width: 1200,
              height: 675,
              aspectRatio: 1.7778,
            },
          ],
        },
      ],
      '<p>暂无正文</p>',
    );
    expect(prefer).toBe(true);
  });

  it('accepts non-placeholder html without forcing a second detail fetch', () => {
    expect(
      hasUsableNewsBody(
        'html',
        [
          {
            id: 'p-1',
            type: 'paragraph',
            spans: [{ type: 'text', text: '摘要占位' }],
          },
        ],
        '<p>这是完整正文</p>',
      ),
    ).toBe(true);
  });

  it('rejects placeholder html without usable blocks', () => {
    expect(
      hasUsableNewsBody(
        'html',
        [
          {
            id: 'p-1',
            type: 'paragraph',
            spans: [{ type: 'text', text: '暂无正文' }],
          },
        ],
        '<p>暂无正文</p>',
      ),
    ).toBe(false);
  });
});
