import { getStoredProfileRole } from '../services/profile.service';

/** Demo：Visitor / Customer 不可进入 WeTalk，仅员工（Edward）可访问 */
export function shouldBlockWetalkForNonEmployee(): boolean {
  return getStoredProfileRole() !== 'Edward';
}
