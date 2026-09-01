import { describe, expect, it } from 'vitest';
import { coverMirrorCandidates } from '../src/services/article-media-mirror.service';

describe('coverMirrorCandidates', () => {
  it('prefers cover_url then de-duplicates attachment urls', () => {
    const candidates = coverMirrorCandidates({
      id: 2,
      cover_url: '/media/files/d/c/cover.png',
      cover: 25,
      attachments: [
        { url: '/media/files/c/9/inline-a.png', file: 18, attachment_type: 'inline_image' },
        { url: '/media/files/c/9/inline-a.png', file: 19, attachment_type: 'inline_image' },
        { url: '/media/files/7/e/fallback.png', file: 24, attachment_type: 'inline_image' },
      ],
    });
    expect(candidates[0]).toEqual({ url: '/media/files/d/c/cover.png', fileId: 25 });
    expect(candidates.map((item) => item.url)).toEqual([
      '/media/files/d/c/cover.png',
      '/media/files/c/9/inline-a.png',
      '/media/files/7/e/fallback.png',
    ]);
  });
});
