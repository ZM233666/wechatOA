import { RequestError } from '../types/api';

/** 微信 login code 有效期约 5 分钟，会话内复用以减少 wx.login 次数 */
const LOGIN_CODE_TTL_MS = 4 * 60 * 1000;

let cachedLoginCode = '';
let cachedLoginCodeAt = 0;

function fetchWxLoginCode(): Promise<string> {
  return new Promise((resolve, reject) => {
    wx.login({
      success(res) {
        const code = res.code?.trim();
        if (code) {
          resolve(code);
          return;
        }
        reject(new RequestError('微信登录失败，请重试'));
      },
      fail() {
        reject(new RequestError('微信登录失败，请重试'));
      },
    });
  });
}

/** 会话内复用 loginCode；启动身份同步与受保护 Mini API 共用 */
export async function getSessionLoginCode(): Promise<string> {
  const now = Date.now();
  if (cachedLoginCode && now - cachedLoginCodeAt < LOGIN_CODE_TTL_MS) {
    return cachedLoginCode;
  }
  const code = await fetchWxLoginCode();
  cachedLoginCode = code;
  cachedLoginCodeAt = now;
  return code;
}

export function invalidateSessionLoginCode(): void {
  cachedLoginCode = '';
  cachedLoginCodeAt = 0;
}
