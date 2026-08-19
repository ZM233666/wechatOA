export function getMockNow(): Date {
  const raw = process.env.MOCK_NOW;
  if (raw) {
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return new Date();
}
