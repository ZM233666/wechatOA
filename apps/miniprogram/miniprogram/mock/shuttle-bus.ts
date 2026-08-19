export interface ShuttleStop {
  time?: string;
  name: string;
  note?: string;
}

export interface ShuttleRoute {
  id: string;
  name: string;
  stops: ShuttleStop[];
  /** 用于搜索和列表展示的拼接文案 */
  stationsText: string;
}

function toStationsText(stops: ShuttleStop[]): string {
  return stops
    .map((stop) => {
      const time = stop.time ? `${stop.time} ` : '';
      const note = stop.note ? `（${stop.note}）` : '';
      return `${time}${stop.name}${note}`;
    })
    .join('，');
}

function route(id: string, name: string, stops: ShuttleStop[]): ShuttleRoute {
  return {
    id,
    name,
    stops,
    stationsText: toStationsText(stops),
  };
}

/** 数据来源：assets/images/kb-life/New Shuttle Bus-KB新.pdf */
export const SHUTTLE_ROUTES: ShuttleRoute[] = [
  route('K01', '新区线', [
    { time: '7:37', name: '友新路教师新村公交站' },
    { time: '7:40', name: '吴中西路友新路西公交站' },
    { time: '7:42', name: '新郭路杨素路口' },
    { time: '7:52', name: '滨河路山水之恋' },
    { time: '7:58', name: '竹园路黄埔街口', note: '下班不停' },
    { time: '8:00', name: '竹园路新区实小公交站', note: '下班不停' },
    { time: '8:03', name: '竹园路馨泰花园南门' },
    { time: '8:07', name: '竹园路新区一中' },
    { time: '8:09', name: '竹园路新区水厂' },
    { name: '金色家园西公交站', note: '下班增加' },
    { name: '公司' },
  ]),
  route('K02', '科技城线', [
    { time: '7:55', name: '龙景花园三区' },
    { time: '7:58', name: '龙景花园二区' },
    { time: '8:01', name: '东渚宾馆' },
    { time: '8:05', name: '时尚水岸' },
    { time: '8:06', name: '水秀坊' },
    { time: '8:10', name: '锦峰路望湖湾' },
    { time: '8:12', name: '山湖湾' },
    { time: '8:35', name: '阳山四区', note: '暂时不去，有新员工多时就去' },
    { time: '8:35', name: '山神湾路和阳山东路路口' },
    { name: '公司' },
  ]),
  route('K03', '三香线', [
    { time: '7:38', name: '竹辉路人民路口' },
    { time: '7:47', name: '三香公园' },
    { time: '7:50', name: '彩香新村' },
    { time: '7:52', name: '彩虹新村' },
    { time: '7:55', name: '附二院' },
    { time: '8:00', name: '何山桥东' },
    { time: '8:04', name: '何山路今日家园' },
    { time: '8:07', name: '清水园' },
    { time: '8:10', name: '何山路枫津新村' },
    { name: '公司' },
  ]),
  route('K04', '三元线', [
    { time: '7:50', name: '西环路三元新村' },
    { time: '8:00', name: '滨河路金狮大厦' },
    { time: '8:05', name: '邓蔚路滨河花园' },
    { time: '8:10', name: '塔园路时代花园西' },
    { time: '8:15', name: '华山路（马浜花园）' },
    { time: '8:18', name: '华山路（大地之歌）' },
    { time: '8:20', name: '华山路新区医院' },
    { time: '8:23', name: '新区二中' },
    { name: '公司' },
  ]),
  route('K05', '相城线', [
    { time: '7:45', name: '晨曦馨苑东门' },
    { time: '7:50', name: '采莲路南公交站' },
    { time: '7:55', name: '澄和家园西门' },
    { time: '7:57', name: '阳澄湖中路地铁站' },
    { time: '8:04', name: '花好月圆' },
    { time: '8:07', name: '建元路金砖路' },
    { time: '8:10', name: '4号线姚祥地铁站（安元路上）' },
    { name: '上中环北线' },
    { time: '8:32', name: '汇金广场' },
    { time: '8:35', name: '阳山一区' },
    { name: '公司' },
  ]),
  route('K06', '木渎马涧线', [
    { time: '8:00', name: '姑苏路木东路口' },
    { time: '8:02', name: '木东路翠坊桥公交站' },
    { time: '8:04', name: '金山路木渎公交站' },
    { time: '8:05', name: '金山路天虹公交站' },
    { time: '8:09', name: '金山路中华园大酒店' },
    { time: '8:12', name: '玉山路青年城' },
    { time: '8:21', name: '马涧小区' },
    { time: '8:24', name: '建林路新鹿花苑' },
    { name: '公司' },
  ]),
  route('K07', '新庄阳山线', [
    { time: '7:55', name: '富强小区' },
    { time: '7:57', name: '陆步桥' },
    { time: '8:07', name: '浒阳路新浒花园三区北门' },
    { time: '8:13', name: '兴贤桥堍朱家庄公交站西派出所门口' },
    { time: '8:20', name: '华通花园一区西门' },
    { time: '8:22', name: '华通花园一区北门' },
    { time: '8:30', name: '阳山花园四区' },
    { name: '公司' },
  ]),
  route('K08', '南环线', [
    { time: '7:18', name: '郎诗东吴绿郡（广建路和枫津路口）' },
    { time: '7:20', name: '碧波街枫津路口' },
    { time: '7:30', name: '苏苑街农行门口' },
    { time: '7:40', name: '同济医院门口（南环路盘蠡路西北角口）' },
    { time: '7:45', name: '桐泾公园西站台' },
    { time: '7:50', name: '唐胥桥公交站台' },
    { time: '7:55', name: '索山桥南站台' },
    { time: '8:07', name: '新庄新村北汽车站' },
    { name: '公司' },
  ]),
  route('K09', '苏香名园线', [
    { time: '7:40', name: '新旅程东门' },
    { time: '7:44', name: '天平学院' },
    { time: '7:54', name: '竹园路新升新苑' },
    { time: '7:58', name: '金色家园南门', note: '下班不停' },
    { time: '8:15', name: '长江花园' },
    { time: '8:22', name: '鸿福路公交站' },
    { time: '8:25', name: '阳山花园四区', note: '修路暂时不去' },
    { name: '公司' },
  ]),
  route('K10', '娄葑线', [
    { time: '7:30', name: '通达路湖岸名家' },
    { time: '7:35', name: '通达路独墅湖大道口' },
    { time: '7:40', name: '娄葑镇政府' },
    { time: '7:45', name: '东振路东环路口' },
    { time: '7:49', name: '葑门路东环路口' },
    { time: '7:50', name: '徐家浜东环路' },
    { time: '7:55', name: '东环路中新路口' },
    { time: '8:00', name: '东环路天桥' },
    { name: '公司' },
  ]),
  route('K11', '机场线', [
    { time: '7:30', name: '东延路松涛街口' },
    { time: '7:37', name: '机场路天地源橄榄湾星湖街' },
    { time: '7:43', name: '欧洲城南施街公交车站台澳韵花园' },
    { time: '7:47', name: '湖东邻里中心公交站台' },
    { time: '7:53', name: '九龙医院公交站' },
    { time: '8:20', name: '3号线铜墩路站' },
    { name: '公司' },
  ]),
  route('K12', '湖东线', [
    { time: '7:30', name: '凤凰城西门' },
    { time: '7:38', name: '钟园路琉璃街口海悦花园' },
    { time: '7:44', name: '津梁街湖畔天城' },
    { time: '7:46', name: '第五元素东门' },
    { time: '7:55', name: '九华路海尚一品' },
    { name: '公司' },
  ]),
  route('K13', '太阳城线', [
    { time: '7:25', name: '北榭雨街太阳星辰花园西站台' },
    { time: '7:28', name: '现代大道太阳星辰花园南' },
    { time: '7:31', name: '东沈浒路九龙仓繁华里门口' },
    { time: '7:46', name: '现代大道玲珑湾' },
    { time: '7:56', name: '现代大道新城花园' },
    { time: '7:58', name: '印象城东方花园' },
    { time: '8:02', name: '东港新村向阳桥南' },
    { name: '公司' },
  ]),
  route('K14', '青剑湖线', [
    { time: '7:35', name: '阳澄湖展业路口' },
    { time: '7:42', name: '阳澄湖路星湖街口' },
    { time: '8:05', name: '城北公路梅花新村路口' },
    { time: '8:12', name: '火车站北广场' },
    { name: '公司' },
  ]),
  route('K15', '湖西线', [
    { time: '7:40', name: '高尔夫花园南门（星波街上）' },
    { time: '7:43', name: '城邦花园东公交站星州街上（高和路右转）' },
    { time: '7:45', name: '星港街御湖熙岸公交车站' },
    { time: '7:49', name: '中新大道/星汉街右转嘉怡苑西门' },
    { time: '7:53', name: '星汉街苏绣路口' },
    { time: '7:57', name: '星海街苏惠路口/环球188' },
    { time: '7:59', name: '中央公园西公交站台（右转至星明街上）' },
    { name: '公司' },
  ]),
];

export const SHUTTLE_NOTICE =
  '以上站点仅做参考，部分站点可能有调整未登记，请知悉。(Note: Stations are for reference only and may be subject to change.)';

export function filterShuttleRoutes(keyword: string): ShuttleRoute[] {
  const query = keyword.trim().toLowerCase();
  if (!query) {
    return SHUTTLE_ROUTES;
  }
  return SHUTTLE_ROUTES.filter((item) => {
    const haystack = `${item.id} ${item.name} ${item.stationsText}`.toLowerCase();
    return haystack.includes(query) || item.id.toLowerCase().includes(query);
  });
}
