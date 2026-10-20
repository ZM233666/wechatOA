import { COMING_SOON_TOAST } from '../constants/routes';

/** 与 Services / My Dashboard 等待上线能力一致的提示弹窗 */
export function showComingSoonModal(featureTitle?: string): void {
  wx.showModal({
    title: featureTitle?.trim() || '提示',
    content: COMING_SOON_TOAST,
    showCancel: false,
    confirmText: '知道了',
  });
}
