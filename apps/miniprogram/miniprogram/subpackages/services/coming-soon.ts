import { COMING_SOON_TOAST } from '../../constants/routes';

export function showComingSoonModal(featureTitle?: string): void {
  wx.showModal({
    title: featureTitle?.trim() || '提示',
    content: COMING_SOON_TOAST,
    showCancel: false,
    confirmText: '知道了',
  });
}
