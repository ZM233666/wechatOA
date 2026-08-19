import type { ImageResource } from './image';

export type ProfileRoleKey = 'Edward' | 'Customer' | 'Visitor';

export interface ProfileUser {
  chineseName: string;
  name: string;
  titleCn: string;
  titleEn: string;
  department: string;
  role: string;
  avatar: ImageResource;
}

export interface ProfileField {
  id: string;
  labelCn: string;
  labelEn: string;
  value: string;
  icon: ImageResource;
}

export interface ProfileRoleOption {
  key: ProfileRoleKey;
  label: string;
}

export interface ProfileData {
  isLoggedIn: boolean;
  user: ProfileUser | null;
  fields: ProfileField[];
  roleOptions: ProfileRoleOption[];
}
