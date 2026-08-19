/** 设计 Token（供 TS 侧提示文案等引用；样式以 WXSS 变量为准） */
export const DESIGN_COLORS = {
  brand: '#00467f',
  navy: '#033e70',
  navyStrong: '#003b70',
  gold: '#d4a84b',
  goldLight: '#e8c56a',
  goldDark: '#b8892e',
  bg: '#F5F7FA',
  card: '#FFFFFF',
  text: '#1F2937',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  divider: '#EEF0F3',
  danger: '#DC2626',
  success: '#16A34A',
  tabInactive: '#8A94A3',
} as const;

export const DESIGN_SPACING = {
  pagePaddingX: 32,
  cardRadius: 24,
  cardPadding: 28,
} as const;
