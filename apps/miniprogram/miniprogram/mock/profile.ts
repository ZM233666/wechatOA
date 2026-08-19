export interface ProfileUser {
  chineseName: string;
  name: string;
  titleCn: string;
  titleEn: string;
  department: string;
  role: string;
  avatar: string;
}

export type ProfileRoleKey = 'Edward' | 'Customer' | 'Visitor';

export interface ProfileRoleOption {
  key: ProfileRoleKey;
  label: string;
}

export interface ProfileField {
  id: string;
  labelCn: string;
  labelEn: string;
  value: string;
  icon: string;
}

export const DEFAULT_PROFILE_ROLE_KEY: ProfileRoleKey = 'Edward';

export const PROFILE_USERS: Record<ProfileRoleKey, ProfileUser> = {
  Edward: {
    chineseName: '爱德华',
    name: 'Edward',
    titleCn: '系统工程师',
    titleEn: 'Systems Engineer',
    department: 'Digital Solutions',
    role: 'Employee',
    avatar: '/assets/images/profile/avatar-edward.png',
  },
  Customer: {
    chineseName: '李娜',
    name: 'Li Na',
    titleCn: '车队经理',
    titleEn: 'Fleet Manager',
    department: 'Metro Rail',
    role: 'Customer',
    avatar: '/assets/images/profile/avatar-customer.png',
  },
  Visitor: {
    chineseName: '王磊',
    name: 'Wang Lei',
    titleCn: '访客',
    titleEn: 'Visitor',
    department: 'External',
    role: 'Visitor',
    avatar: '/assets/images/profile/avatar-visitor.png',
  },
};

export const PROFILE_ROLE_OPTIONS: ProfileRoleOption[] = [
  { key: 'Edward', label: 'Employee' },
  { key: 'Customer', label: 'Customer' },
  { key: 'Visitor', label: 'Visitor' },
];

export const PROFILE_USER = PROFILE_USERS.Edward;

const PROFILE_ROLE_STORAGE_KEY = 'profileRoleKey';

let currentRoleKey: ProfileRoleKey = 'Edward';
let hasLoadedRole = false;

function resolveRoleKey(value: unknown): ProfileRoleKey {
  if (value === 'Customer' || value === 'Visitor' || value === 'Edward') {
    return value;
  }
  return 'Edward';
}

function readStoredRoleKey(): ProfileRoleKey {
  try {
    return resolveRoleKey(wx.getStorageSync(PROFILE_ROLE_STORAGE_KEY));
  } catch {
    return 'Edward';
  }
}

function ensureRoleLoaded() {
  if (!hasLoadedRole) {
    currentRoleKey = readStoredRoleKey();
    hasLoadedRole = true;
  }
}

export function getCurrentProfileUser(): ProfileUser {
  ensureRoleLoaded();
  if (currentRoleKey === 'Customer') {
    return PROFILE_USERS.Customer;
  }
  if (currentRoleKey === 'Visitor') {
    return PROFILE_USERS.Visitor;
  }
  return PROFILE_USERS.Edward;
}

export function setProfileRole(roleKey: ProfileRoleKey): ProfileUser {
  currentRoleKey = resolveRoleKey(roleKey);
  hasLoadedRole = true;
  try {
    wx.setStorageSync(PROFILE_ROLE_STORAGE_KEY, currentRoleKey);
  } catch {
    // ignore storage write errors; in-memory role still applies this session
  }
  return getCurrentProfileUser();
}

export function getProfileRoleOptions() {
  ensureRoleLoaded();
  return PROFILE_ROLE_OPTIONS.map((option) => ({
    key: option.key,
    label: option.label,
    selected: option.key === currentRoleKey,
  }));
}

export const PROFILE_FIELDS: ProfileField[] = [
  {
    id: 'employee-id',
    labelCn: '工号',
    labelEn: 'Employee ID',
    value: '20023333',
    icon: '/assets/images/profile/profile-hash.png',
  },
  {
    id: 'position',
    labelCn: '职位',
    labelEn: 'Position',
    value: 'Systems Engineer',
    icon: '/assets/images/profile/profile-briefcase.png',
  },
  {
    id: 'department',
    labelCn: '部门',
    labelEn: 'Department',
    value: 'Systems Engineering',
    icon: '/assets/images/profile/profile-user.png',
  },
  {
    id: 'phone',
    labelCn: '工作电话',
    labelEn: 'Work Phone',
    value: '+86 512 6616 0000',
    icon: '/assets/images/profile/profile-phone.png',
  },
  {
    id: 'email',
    labelCn: '邮箱',
    labelEn: 'Email',
    value: 'xxxxx@knorr-bremse.com',
    icon: '/assets/images/profile/profile-mail.png',
  },
  {
    id: 'company',
    labelCn: '公司',
    labelEn: 'Company',
    value: 'Knorr-Bremse Systems for Rail Vehicles (Suzhou) Co., Ltd.',
    icon: '/assets/images/profile/profile-building.png',
  },
  {
    id: 'address',
    labelCn: '公司地址',
    labelEn: 'Company Address',
    value: 'Suzhou',
    icon: '/assets/images/profile/profile-pin.png',
  },
];
