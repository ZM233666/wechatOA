import type { IdentityAccessTier } from '../utils/identity-access';
import { resolveIdentityAccessTier } from '../utils/identity-access';
import {
  clearIdentityBinding,
  fetchIdentityBindingFromServer,
  getStoredIdentityBinding,
  saveIdentityBinding,
  type IdentityBindingRecord,
} from './identity-binding.service';

/** 同一冷启动内重复拉取绑定状态的最小间隔（Profile Tab 切回等） */
const IDENTITY_SYNC_MIN_INTERVAL_MS = 60 * 1000;

let identitySyncPromise: Promise<IdentityBindingRecord | null> | null = null;
let lastIdentitySyncAt = 0;
let sessionReady = false;
let identitySessionRevision = 0;
let lastPublishedIdentityKey = '';

const identitySessionListeners = new Set<() => void>();

export type IdentitySessionSnapshot = {
  ready: boolean;
  syncing: boolean;
  tier: IdentityAccessTier;
  bound: boolean;
  binding: IdentityBindingRecord | null;
};

function buildSnapshot(binding: IdentityBindingRecord | null, ready: boolean): IdentitySessionSnapshot {
  const tier = resolveIdentityAccessTier(binding);
  return {
    ready,
    syncing: Boolean(identitySyncPromise),
    tier,
    bound: tier !== 'visitor',
    binding,
  };
}

function identitySnapshotKey(binding: IdentityBindingRecord | null, ready: boolean): string {
  const tier = resolveIdentityAccessTier(binding);
  const email = binding?.companyEmail?.trim() ?? '';
  return `${ready ? '1' : '0'}|${tier}|${email}`;
}

function publishSnapshot(binding: IdentityBindingRecord | null, ready: boolean): void {
  sessionReady = ready;
  const snapshot = buildSnapshot(binding, ready);
  const key = identitySnapshotKey(binding, ready);
  if (key !== lastPublishedIdentityKey) {
    lastPublishedIdentityKey = key;
    identitySessionRevision += 1;
    identitySessionListeners.forEach((listener) => listener());
  }
  try {
    const app = getApp<IAppOption>();
    app.globalData.identitySession = snapshot;
    app.globalData.identitySessionRevision = identitySessionRevision;
  } catch {
    // getApp 在极早期可能不可用
  }
}

export function getIdentitySessionRevision(): number {
  return identitySessionRevision;
}

/** 身份 tier/邮箱变更时触发（启动同步、绑定成功等） */
export function subscribeIdentitySessionChanged(listener: () => void): () => void {
  identitySessionListeners.add(listener);
  return () => {
    identitySessionListeners.delete(listener);
  };
}

export function getIdentitySessionSnapshot(): IdentitySessionSnapshot {
  const binding = getStoredIdentityBinding();
  return buildSnapshot(binding, sessionReady);
}

/**
 * 小程序启动时调用一次：wx.login + GET 身份绑定，结果写入本地 storage。
 * 各功能页的权限判断只读 storage / getIdentitySessionSnapshot，不再逐次请求绑定接口。
 */
export async function syncIdentitySession(options?: {
  force?: boolean;
}): Promise<IdentityBindingRecord | null> {
  const force = options?.force === true;
  const now = Date.now();

  if (!force && identitySyncPromise) {
    return identitySyncPromise;
  }

  if (
    !force &&
    sessionReady &&
    now - lastIdentitySyncAt < IDENTITY_SYNC_MIN_INTERVAL_MS
  ) {
    const cached = getStoredIdentityBinding();
    publishSnapshot(cached, true);
    return cached;
  }

  publishSnapshot(getStoredIdentityBinding(), sessionReady);

  identitySyncPromise = (async () => {
    try {
      const record = await fetchIdentityBindingFromServer();
      lastIdentitySyncAt = Date.now();
      publishSnapshot(record, true);
      return record;
    } catch {
      const fallback = getStoredIdentityBinding();
      publishSnapshot(fallback, true);
      return fallback;
    } finally {
      identitySyncPromise = null;
    }
  })();

  return identitySyncPromise;
}

/** 绑定成功后刷新会话快照（openid 已与邮箱关联） */
export function applyIdentityBindingToSession(record: IdentityBindingRecord): void {
  saveIdentityBinding(record);
  lastIdentitySyncAt = Date.now();
  publishSnapshot(record, true);
}

export function clearIdentitySession(): void {
  clearIdentityBinding();
  lastIdentitySyncAt = 0;
  sessionReady = true;
  publishSnapshot(null, true);
}
