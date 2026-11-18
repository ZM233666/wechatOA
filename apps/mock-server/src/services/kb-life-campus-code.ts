/** 纠正导航或请求里被重复编码的地点（如 `BJ%20Office`） */
export function normalizeKbLifeLocation(value: string): string {
  let text = value.trim();
  for (let i = 0; i < 2; i += 1) {
    if (!/%[0-9A-Fa-f]{2}/.test(text)) {
      break;
    }
    try {
      const decoded = decodeURIComponent(text);
      if (decoded === text) {
        break;
      }
      text = decoded;
    } catch {
      break;
    }
  }
  return text;
}

/** KB Life 下拉 `location` → 管理端园区地图 / 业务 API 的 `location` 查询参数 */
const CAMPUS_API_CODES: Record<string, string> = {
  suzhou: 'suzhou',
  qingdao: 'qingdao',
  daxing: 'daxing',
  nankou: 'nankou',
  'bj office': 'beijing_office',
};

export function campusCodeFromLocation(location: string): string {
  const key = normalizeKbLifeLocation(location).toLowerCase();
  return CAMPUS_API_CODES[key] ?? key;
}