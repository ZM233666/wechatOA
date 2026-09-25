import { describe, expect, it } from 'vitest';
import { needsShuttleRouteDetail } from '../src/services/shuttle-schedule.client';
import { mapScheduleRoute, mapShuttleSchedulePayload } from '../src/services/shuttle-schedule.mapper';

describe('shuttle-schedule.mapper', () => {
  it('maps route stops and geo map lines', () => {
    const payload = mapShuttleSchedulePayload('suzhou', 'Suzhou', [
      {
        id: 1,
        name: 'K01 新区线',
        stops: [
          {
            stop: 10,
            stop_name: '站点A',
            sequence: 1,
            latitude: 31.3,
            longitude: 120.58,
            times: ['7:37', ''],
          },
          {
            stop: 11,
            stop_name: '站点B',
            sequence: 2,
            latitude: 31.31,
            longitude: 120.59,
            times: ['7:40'],
          },
        ],
      },
    ]);

    expect(payload.routes[0]?.id).toBe('K01');
    expect(payload.routes[0]?.stops[0]?.time).toBe('7:37');
    expect(payload.map?.routes[0]?.points).toHaveLength(2);
    expect(payload.map?.routes[0]?.markers[0]?.timesText).toBe('7:37');
  });

  it('builds map when stops have coordinates', () => {
    const payload = mapShuttleSchedulePayload('suzhou', 'Suzhou', [
      {
        id: 3,
        name: 'K03 木渎线',
        stops: [
          {
            stop: 1,
            stop_name: 'A',
            sequence: 1,
            latitude: 31.26,
            longitude: 120.6,
            times: ['8:00'],
          },
        ],
      },
    ]);
    expect(payload.map?.routes).toHaveLength(1);
  });

  it('skips detail fetch when list already includes stops', () => {
    expect(needsShuttleRouteDetail({ id: 1, name: 'K01', stops: [{ stop: 1, sequence: 1 }] })).toBe(false);
    expect(needsShuttleRouteDetail({ id: 2, name: 'K02' })).toBe(true);
    expect(needsShuttleRouteDetail({ id: 3, name: 'K03', stops: [] })).toBe(true);
  });

  it('skips map routes without coordinates', () => {
    const route = mapScheduleRoute({
      id: 2,
      name: 'K02',
      stops: [{ stop: 1, stop_name: '无坐标', sequence: 1, times: ['8:00'] }],
    });
    expect(route.id).toBe('K02');
  });
});
