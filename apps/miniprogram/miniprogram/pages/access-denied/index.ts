import { openIdentityBindingInProfile } from '../../utils/identity-access';

type AccessDeniedKind = 'unbound' | 'employee';

function resolveCopy(kind: AccessDeniedKind, title: string) {
  if (kind === 'employee') {
    return {
      navTitle: title || 'Access Denied',
      headline: 'Internal Only',
      subtitle: title,
      desc: '此功能仅面向 KB 员工开放。请绑定员工身份后再访问。',
      descEn: 'This feature is only open to KB employees. Bind an employee identity to continue.',
      showBindButton: true,
    };
  }
  return {
    navTitle: title || 'Access Denied',
    headline: 'Access Denied',
    subtitle: title,
    desc: '您无访问权限。请先完成企业身份绑定后再查看此内容。',
    descEn: 'Complete identity binding in Profile to access this content.',
    showBindButton: true,
  };
}

Page({
  data: {
    navTitle: 'Access Denied',
    headline: 'Access Denied',
    subtitle: '',
    desc: '',
    descEn: '',
    showBindButton: true,
  },

  onLoad(query: Record<string, string | undefined>) {
    const kind = (query.kind === 'employee' ? 'employee' : 'unbound') as AccessDeniedKind;
    const title = decodeURIComponent((query.title || '').trim());
    this.setData(resolveCopy(kind, title));
  },

  onGoIdentityBinding() {
    openIdentityBindingInProfile();
  },
});
