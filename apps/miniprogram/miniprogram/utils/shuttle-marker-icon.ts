const iconCache = new Map<string, string>();

export function normalizeMarkerColor(color: string): string {
  const raw = color.trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(raw)) {
    return raw.toLowerCase();
  }
  if (/^#[0-9A-Fa-f]{8}$/.test(raw)) {
    return `#${raw.slice(1, 7).toLowerCase()}`;
  }
  return '#409eff';
}

export function resolveShuttleMarkerIcon(color: string): Promise<string> {
  const key = normalizeMarkerColor(color);
  const cached = iconCache.get(key);
  if (cached) {
    return Promise.resolve(cached);
  }

  return new Promise((resolve, reject) => {
    const size = 32;
    const canvas = wx.createOffscreenCanvas({ type: '2d', width: size, height: size });
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Failed to create marker canvas'));
      return;
    }

    const center = size / 2;
    const radius = center - 4;
    ctx.clearRect(0, 0, size, size);
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.fillStyle = key;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();

    wx.canvasToTempFilePath({
      canvas,
      success: (res) => {
        iconCache.set(key, res.tempFilePath);
        resolve(res.tempFilePath);
      },
      fail: (err) => reject(err),
    });
  });
}

export async function resolveShuttleMarkerIcons(colors: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(colors.map((color) => normalizeMarkerColor(color)))];
  const entries = await Promise.all(
    unique.map(async (color) => [color, await resolveShuttleMarkerIcon(color)] as const),
  );
  return new Map(entries);
}
