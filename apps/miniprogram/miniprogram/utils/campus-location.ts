const CAMPUS_LOCATION_STORAGE_KEY = 'kbLifeCampusLocation';
export const DEFAULT_CAMPUS_LOCATION = 'Suzhou';

export function resolveCampusLocation(
  value: unknown,
  allowed: string[] = [],
): string {
  if (typeof value === 'string' && value.trim()) {
    const trimmed = value.trim();
    if (!allowed.length || allowed.includes(trimmed)) {
      return trimmed;
    }
  }
  if (allowed.includes(DEFAULT_CAMPUS_LOCATION)) {
    return DEFAULT_CAMPUS_LOCATION;
  }
  return allowed[0] ?? DEFAULT_CAMPUS_LOCATION;
}

export function getStoredCampusLocation(allowed: string[] = []): string {
  try {
    return resolveCampusLocation(wx.getStorageSync(CAMPUS_LOCATION_STORAGE_KEY), allowed);
  } catch {
    return resolveCampusLocation(undefined, allowed);
  }
}

export function setStoredCampusLocation(location: string, allowed: string[] = []): string {
  const resolved = resolveCampusLocation(location, allowed);
  try {
    wx.setStorageSync(CAMPUS_LOCATION_STORAGE_KEY, resolved);
  } catch {
    // ignore storage failures in mock/dev
  }
  return resolved;
}

export function withCampusLocationQuery(path: string, location?: string): string {
  const loc = location || getStoredCampusLocation();
  const sep = path.includes('?') ? '&' : '?';
  return `${path}${sep}location=${encodeURIComponent(loc)}`;
}
