import { describe, expect, it } from 'vitest';
import { mapJobOpeningDetail, parseJobBackendId, toJobPublicId } from '../src/services/job-openings.mapper';

describe('job-openings.mapper', () => {
  it('maps public id round-trip for numeric cms id', () => {
    expect(toJobPublicId(42)).toBe('job-42');
    expect(parseJobBackendId('job-42')).toBe('42');
  });

  it('splits description and requirements from html', () => {
    const detail = mapJobOpeningDetail({
      id: 1,
      content_type: 'job_openings',
      title_zh: '测试岗位',
      category: 'Engineering',
      source: 'Suzhou',
      content_html:
        '<p>职责一</p><p>职责二</p><h3>任职要求 (Requirements)</h3><p>要求一</p>',
      status: 'published',
    });
    expect(detail.id).toBe('job-1');
    expect(detail.description).toContain('职责');
    expect(detail.requirements).toContain('要求');
  });
});
