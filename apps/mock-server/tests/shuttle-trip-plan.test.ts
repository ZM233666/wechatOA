import { describe, expect, it } from 'vitest';
import {
  buildAddressAttempts,
  collectShuttleStops,
  haversineMeters,
  parseLatLngPair,
  pickBestGeocodeCandidate,
  resolveRouteDurationSeconds,
} from '../src/services/shuttle-trip-plan.utils';

describe('shuttle-trip-plan.utils', () => {
  it('computes haversine distance', () => {
    const meters = haversineMeters(
      { latitude: 31.29834, longitude: 120.58529 },
      { latitude: 31.3, longitude: 120.59 },
    );
    expect(meters).toBeGreaterThan(300);
    expect(meters).toBeLessThan(800);
  });

  it('parses lat,lng pairs', () => {
    expect(parseLatLngPair('31.3, 120.58')).toEqual({ latitude: 31.3, longitude: 120.58 });
    expect(parseLatLngPair('foo')).toBeNull();
  });

  it('prefers city-prefixed address attempts', () => {
    expect(buildAddressAttempts('裕沁庭', '苏州市')[0]).toBe('苏州市裕沁庭');
  });

  it('prefers POI near campus anchor over distant same-name place', () => {
    const anchor = { latitude: 31.29834, longitude: 120.58529 };
    const best = pickBestGeocodeCandidate(
      '裕沁庭',
      [
        { name: '裕沁庭(外地)', latitude: 30, longitude: 110 },
        { name: '裕沁庭西区', latitude: 31.32, longitude: 120.59 },
      ],
      { region: '苏州市', anchor, maxRadiusMeters: 50_000 },
    );
    expect(best?.name).toBe('裕沁庭西区');
  });

  it('treats small duration values as minutes when distance is long', () => {
    const seconds = resolveRouteDurationSeconds({ duration: 11, distance: 925 }, 925, 'walking');
    expect(seconds).toBe(660);
    expect(Math.ceil(seconds / 60)).toBe(11);
  });

  it('dedupes shuttle stops by coordinates', () => {
    const stops = collectShuttleStops({
      title: 'Map',
      center: { latitude: 31.3, longitude: 120.58 },
      routes: [
        {
          id: 'K01',
          name: 'Line A',
          color: '#409EFF',
          points: [],
          markers: [
            {
              id: 1,
              latitude: 31.3,
              longitude: 120.58,
              title: 'Stop A',
              sequence: 1,
              timesText: '8:00',
            },
          ],
        },
        {
          id: 'K02',
          name: 'Line B',
          color: '#67C23A',
          points: [],
          markers: [
            {
              id: 1,
              latitude: 31.3,
              longitude: 120.58,
              title: 'Stop A',
              sequence: 1,
              timesText: '8:10',
            },
          ],
        },
      ],
    });
    expect(stops).toHaveLength(1);
    expect(stops[0]?.shuttleLineNames).toEqual(['Line A', 'Line B']);
    expect(stops[0]?.timesText).toBe('8:00 / 8:10');
  });
});
