import { describe, expect, it } from 'vitest';
import {
  mapProjectCaseRowToDetail,
  mapProjectCaseRowToSummary,
} from '../src/services/project-case.mapper';
import { isPublicProjectCaseRow } from '../src/services/project-case.client';

describe('project-case.mapper', () => {
  it('maps row to legacy summary with absolute cover url', () => {
    const summary = mapProjectCaseRowToSummary(
      {
        id: 1,
        title_zh: '某轨道交通项目案例',
        summary: '案例摘要',
        cover_url: '/media/files/cover.jpg',
        category: '轨道交通',
        author: '某某客户',
        status: 'published',
        visible_range: 'all',
      },
      'http://127.0.0.1:8000',
    );
    expect(summary.id).toBe('1');
    expect(summary.title).toBe('某轨道交通项目案例');
    expect(summary.coverImage.url).toBe('http://127.0.0.1:8000/media/files/cover.jpg');
    expect(summary.industry).toBe('轨道交通');
    expect(summary.region).toBe('某某客户');
  });

  it('maps detail with content_html to richContent blocks', () => {
    const detail = mapProjectCaseRowToDetail(
      {
        id: 2,
        title_zh: '测试案例',
        summary: '摘要',
        content_html: '<h2>标题</h2><p>正文内容</p><img src="/media/files/body.jpg" alt="配图" />',
        category: '轨道交通',
        author: '客户A',
        status: 'published',
        publish_time: '2026-09-22 10:00:00',
      },
      'http://127.0.0.1:8000',
    );
    expect(detail.meta).toBe('Writer: 客户A');
    expect(detail.richContent.length).toBeGreaterThan(0);
    const imageBlock = detail.richContent.find((block) => block.type === 'image');
    expect(imageBlock?.type === 'image' && imageBlock.image.url).toBe(
      'http://127.0.0.1:8000/media/files/body.jpg',
    );
  });

  it('filters non-public rows by visible_range and status', () => {
    expect(
      isPublicProjectCaseRow({
        id: 1,
        status: 'published',
        visible_range: 'all',
      }),
    ).toBe(true);
    expect(
      isPublicProjectCaseRow({
        id: 2,
        status: 'published',
        visible_range: 'employee',
      }),
    ).toBe(false);
    expect(
      isPublicProjectCaseRow({
        id: 3,
        status: 'draft',
        visible_range: 'all',
      }),
    ).toBe(false);
  });
});
