import { shouldBlockWetalkForNonEmployee as blockNonEmployee } from './identity-access';

/** 未绑定或非 Employee 身份不可进入 WeTalk */
export function shouldBlockWetalkForNonEmployee(): boolean {
  return blockNonEmployee();
}
