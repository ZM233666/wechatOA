import { describe, expect, it } from 'vitest';
import { parse } from 'node-html-parser';
import {
  intervalMsFromAaConfig,
  loopFromAaConfig,
  parseDataIntervalAttribute,
  parseDataLoopAttribute,
  resolveCarouselIntervalMs,
  resolveCarouselLoop,
} from '../src/services/article-carousel-html';

describe('carousel interval from CMS HTML', () => {
  it('reads data-interval in milliseconds', () => {
    const el = parse('<section data-interval="4500"></section>').querySelector('section')!;
    expect(parseDataIntervalAttribute(el)).toBe(4500);
  });

  it('reads millisecond fields from aa-config', () => {
    expect(intervalMsFromAaConfig({ intervalMs: 3200 })).toBe(3200);
    expect(intervalMsFromAaConfig({ interval: 4500 })).toBe(4500);
    expect(intervalMsFromAaConfig({ scrollDuration: 6000 })).toBe(6000);
  });

  it('prefers data-interval over aa-config', () => {
    const el = parse('<section data-interval="5000"></section>').querySelector('section')!;
    expect(resolveCarouselIntervalMs(el, { intervalMs: 3000 })).toBe(5000);
  });
});

describe('carousel loop from CMS HTML', () => {
  it('reads data-loop and prefers it over data-circular', () => {
    const el = parse('<div data-loop="false" data-circular="true"></div>').querySelector('div')!;
    expect(parseDataLoopAttribute(el)).toBe(false);
  });

  it('reads loop from aa-config', () => {
    expect(loopFromAaConfig({ loop: false })).toBe(false);
    expect(loopFromAaConfig({ loop: true })).toBe(true);
  });

  it('prefers data-loop over aa-config JSON', () => {
    const el = parse('<section data-loop="false"></section>').querySelector('section')!;
    expect(resolveCarouselLoop(el, { loop: true })).toBe(false);
  });

  it('defaults loop to true when unset', () => {
    const el = parse('<section></section>').querySelector('section')!;
    expect(resolveCarouselLoop(el)).toBe(true);
  });
});
