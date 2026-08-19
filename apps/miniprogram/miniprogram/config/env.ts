export type MiniProgramEnvVersion = 'develop' | 'trial' | 'release';

export type DataSource = 'mock-server' | 'real-server';

export interface ApiEnvironmentConfig {
  apiBaseUrl: string;
  timeout: number;
  enableDebugLog: boolean;
  dataSource: DataSource;
  mockScenario?: string;
}

/**
 * 各环境 API 配置。
 * 原生微信小程序不能依赖浏览器的 process.env，
 * 请根据 wx.getAccountInfoSync().miniProgram.envVersion 选择。
 *
 * 真机调试请在开发者工具中把 apiBaseUrl 临时改为电脑局域网 IP，
 * 例如 http://192.168.x.x:3100，不要把某台机器的固定 IP 提交进仓库。
 *
 * Mock-only：`mockScenario`、`X-Mock-Scenario` 仅允许 develop 使用。
 */
const API_ENV_MAP: Record<MiniProgramEnvVersion, ApiEnvironmentConfig> = {
  develop: {
    apiBaseUrl: 'http://127.0.0.1:3100',
    timeout: 15000,
    enableDebugLog: true,
    dataSource: 'mock-server',
  },
  trial: {
    apiBaseUrl: 'https://api-trial.example.com',
    timeout: 15000,
    enableDebugLog: false,
    dataSource: 'real-server',
  },
  release: {
    apiBaseUrl: 'https://api.example.com',
    timeout: 15000,
    enableDebugLog: false,
    dataSource: 'real-server',
  },
};

function resolveEnvVersion(): MiniProgramEnvVersion {
  try {
    const { miniProgram } = wx.getAccountInfoSync();
    const version = miniProgram.envVersion;
    if (version === 'develop' || version === 'trial' || version === 'release') {
      return version;
    }
  } catch {
    // 获取失败时回退到开发环境，便于本地联调
  }
  return 'develop';
}

function isPrivateOrLocalHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host === '::1'
  ) {
    return true;
  }
  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!ipv4) {
    return false;
  }
  const first = Number(ipv4[1]);
  const second = Number(ipv4[2]);
  if (first === 10 || first === 127) {
    return true;
  }
  if (first === 192 && second === 168) {
    return true;
  }
  if (first === 172 && second >= 16 && second <= 31) {
    return true;
  }
  if (first === 169 && second === 254) {
    return true;
  }
  return false;
}

function extractHostnameAndScheme(apiBaseUrl: string): { scheme: string; hostname: string } | null {
  const match = /^([a-z][a-z0-9+.-]*):\/{2}(?:[^@/?#]*@)?(\[[^\]]+\]|[^:/?#]+)/i.exec(apiBaseUrl.trim());
  if (!match) {
    return null;
  }
  return {
    scheme: match[1].toLowerCase(),
    hostname: match[2].replace(/^\[|\]$/g, '').toLowerCase(),
  };
}

function isPlaceholderHostname(hostname: string): boolean {
  // 拒绝 example.com、*.example.com、example.org、example.net 等常见占位域名
  return (
    hostname === 'example.com' ||
    hostname === 'example.org' ||
    hostname === 'example.net' ||
    hostname.endsWith('.example.com') ||
    hostname.endsWith('.example.org') ||
    hostname.endsWith('.example.net')
  );
}

/**
 * trial/release 禁止本地/局域网 IP、占位域名、非 HTTPS 地址、空地址。
 *
 * 错误含义：当前环境尚未配置有效的正式 HTTPS API 地址。
 * develop 不受此限制（允许 http://127.0.0.1:3100 和临时局域网 IP）。
 */
export function isForbiddenProductionApiBaseUrl(
  version: MiniProgramEnvVersion,
  apiBaseUrl: string,
): boolean {
  if (version !== 'trial' && version !== 'release') {
    return false;
  }
  if (!apiBaseUrl || apiBaseUrl.trim() === '') {
    return true;
  }
  const parsed = extractHostnameAndScheme(apiBaseUrl);
  if (!parsed) {
    return true;
  }
  if (parsed.scheme !== 'https') {
    return true;
  }
  if (isPrivateOrLocalHostname(parsed.hostname)) {
    return true;
  }
  if (isPlaceholderHostname(parsed.hostname)) {
    return true;
  }
  return false;
}

export function getApiEnvironment(): ApiEnvironmentConfig {
  return API_ENV_MAP[resolveEnvVersion()];
}

export function getApiBaseUrl(): string {
  return getApiEnvironment().apiBaseUrl;
}

export function getCurrentEnvVersion(): MiniProgramEnvVersion {
  return resolveEnvVersion();
}
