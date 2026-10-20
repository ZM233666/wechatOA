import type { IdentityBindingInfo, IdentityBindingStatus } from '@app/shared';
import fs from 'node:fs';
import path from 'node:path';
import { FIXTURES_DIR } from './fixture.service';
import { identityBindRegistrySchema } from '../schemas/identity-binding.schema';

type RegistryEntry = {
  email: string;
  displayName: string;
  department: string;
  roleLabel: string;
};

type Registry = {
  allowedDomains: string[];
  entries: RegistryEntry[];
};

type StoredBinding = IdentityBindingInfo & { openId: string };

const bindingsByOpenId = new Map<string, StoredBinding>();

/**
 * Mock：固定 openid，模拟同一微信用户多次 wx.login 仍对应同一 openid。
 * 正式 Django：loginCode → code2Session → openid。
 */
function resolveOpenIdFromLoginCode(_loginCode: string): string {
  return 'mock-openid-local-wechat-user';
}

function loadRegistry(): Registry {
  const filePath = path.join(FIXTURES_DIR, 'profile/identity-bind-registry.json');
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as unknown;
  return identityBindRegistrySchema.parse(raw);
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function domainFromEmail(email: string): string {
  const at = email.lastIndexOf('@');
  return at >= 0 ? email.slice(at + 1) : '';
}

function titleCaseLocalPart(local: string): string {
  if (!local) {
    return 'User';
  }
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function lookupIdentityByEmail(companyEmail: string): Omit<IdentityBindingInfo, 'boundAt' | 'companyEmail'> | null {
  const email = normalizeEmail(companyEmail);
  const registry = loadRegistry();
  const exact = registry.entries.find((item) => normalizeEmail(item.email) === email);
  if (exact) {
    return {
      displayName: exact.displayName,
      department: exact.department,
      roleLabel: exact.roleLabel,
    };
  }
  const domain = domainFromEmail(email);
  if (!domain || !registry.allowedDomains.includes(domain)) {
    return null;
  }
  const local = email.split('@')[0] ?? 'user';
  return {
    displayName: titleCaseLocalPart(local),
    department: 'Corporate',
    roleLabel: 'Employee',
  };
}

export function getIdentityBindingStatus(loginCode: string): IdentityBindingStatus {
  const openId = resolveOpenIdFromLoginCode(loginCode);
  const stored = bindingsByOpenId.get(openId);
  if (!stored) {
    return { bound: false, binding: null };
  }
  const { openId: _oid, ...binding } = stored;
  return { bound: true, binding };
}

export function bindIdentityByEmail(
  companyEmail: string,
  loginCode: string,
): IdentityBindingInfo {
  const email = normalizeEmail(companyEmail);
  const openId = resolveOpenIdFromLoginCode(loginCode);
  const existing = bindingsByOpenId.get(openId);
  if (existing && normalizeEmail(existing.companyEmail) !== email) {
    const error = new Error('IDENTITY_ALREADY_BOUND');
    (error as Error & { details: Record<string, unknown> }).details = {
      currentEmail: existing.companyEmail,
    };
    throw error;
  }
  if (existing && normalizeEmail(existing.companyEmail) === email) {
    const { openId: _oid, ...binding } = existing;
    return binding;
  }

  const profile = lookupIdentityByEmail(email);
  if (!profile) {
    const error = new Error('IDENTITY_EMAIL_NOT_ALLOWED');
    throw error;
  }

  const binding: StoredBinding = {
    openId,
    companyEmail: email,
    boundAt: new Date().toISOString(),
    ...profile,
  };
  bindingsByOpenId.set(openId, binding);
  const { openId: _oid, ...result } = binding;
  return result;
}

/** 测试用：清空内存绑定 */
export function resetIdentityBindingsForTest(): void {
  bindingsByOpenId.clear();
}
