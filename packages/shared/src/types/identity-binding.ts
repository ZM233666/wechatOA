/** 身份绑定：公司邮箱 + 微信 openid（由后端在 code 交换后绑定） */

export interface IdentityBindingInfo {
  companyEmail: string;
  boundAt: string;
  displayName: string;
  department: string;
  roleLabel: string;
}

export interface IdentityBindingStatus {
  bound: boolean;
  binding: IdentityBindingInfo | null;
}

export interface IdentityBindingSubmitBody {
  companyEmail: string;
  /** wx.login 返回的 code，后端换取 openid 并写入绑定关系 */
  loginCode: string;
}
