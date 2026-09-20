/*
 * 岗位列表示例（后续开发启用）
 *
 * import { OPEN_POSITIONS, getOpenPositionById } from '../../../mock/open-positions';
 *
 * data: { positions: OPEN_POSITIONS }
 *
 * onShow() {
 *   // 从详情返回后，短时锁定，避免残留点击再次打开上一岗位
 *   this.navLocked = true;
 *   ...
 * }
 *
 * onJobTap(event) {
 *   const { jobId } = event.currentTarget.dataset;
 *   wx.navigateTo({
 *     url: `/pages/kb-life/open-positions/detail?id=${encodeURIComponent(jobId)}`,
 *   });
 * }
 */

Page({});
