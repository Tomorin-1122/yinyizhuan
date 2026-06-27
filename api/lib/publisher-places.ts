/**
 * 出版社 → 默认出版地映射表
 * 数据来源：用户历史导出记录 + 中国大陆主流学术出版社
 * 维护原则：只收录社名稳定、地址无歧义的出版社
 */
export const PUBLISHER_PLACES: Record<string, string> = {
  // === 北京（高频）===
  '社会科学文献出版社': '北京',
  '世界知识出版社': '北京',
  '九州出版社': '北京',
  '中国社会科学出版社': '北京',
  '北京日报出版社': '北京',
  '商务印书馆': '北京',
  '中华书局': '北京',
  '生活·读书·新知三联书店': '北京',
  '生活读书新知三联书店': '北京',
  '三联书店': '北京',
  '人民出版社': '北京',
  '中国人民大学出版社': '北京',
  '北京大学出版社': '北京',
  '清华大学出版社': '北京',
  '北京师范大学出版社': '北京',
  '国家图书馆出版社': '北京',
  '故宫出版社': '北京',
  '世界图书出版公司': '北京',
  '世界图书出版北京公司': '北京',
  '人民文学出版社': '北京',
  '新华出版社': '北京',
  '中央编译出版社': '北京',
  '中共党史出版社': '北京',
  '当代中国出版社': '北京',
  '方志出版社': '北京',
  '中国大百科全书出版社': '北京',

  // === 上海 ===
  '上海人民出版社': '上海',
  '上海古籍出版社': '上海',
  '上海书店出版社': '上海',
  '上海书店': '上海',
  '上海译文出版社': '上海',
  '上海三联书店': '上海',
  '复旦大学出版社': '上海',
  '华东师范大学出版社': '上海',
  '上海大学出版社': '上海',
  '上海书画出版社': '上海',

  // === 南京 ===
  '江苏人民出版社': '南京',
  '江苏古籍出版社': '南京',
  '凤凰出版社': '南京',
  '译林出版社': '南京',
  '南京大学出版社': '南京',
  '江苏凤凰文艺出版社': '南京',

  // === 杭州 ===
  '浙江大学出版社': '杭州',
  '浙江古籍出版社': '杭州',
  '浙江人民出版社': '杭州',
  '中国美术学院出版社': '杭州',

  // === 其他省会 ===
  '广西师范大学出版社': '桂林',
  '四川人民出版社': '成都',
  '巴蜀书社': '成都',
  '厦门大学出版社': '厦门',
  '天津古籍出版社': '天津',
  '天津人民出版社': '天津',
  '福建人民出版社': '福州',
  '福建古籍出版社': '福州',
  '武汉大学出版社': '武汉',
  '中山大学出版社': '广州',
  '广东人民出版社': '广州',
  '广东高等教育出版社': '广州',
  '山东大学出版社': '济南',
  '齐鲁书社': '济南',
  '山东人民出版社': '济南',
  '中州古籍出版社': '郑州',
  '河南大学出版社': '开封',
  '黄山书社': '合肥',
  '安徽人民出版社': '合肥',
  '云南大学出版社': '昆明',
  '岳麓书社': '长沙',
  '湖南人民出版社': '长沙',
  '湖南大学出版社': '长沙',
  '陕西人民出版社': '西安',
  '三秦出版社': '西安',
  '西北大学出版社': '西安',
  '山西人民出版社': '太原',
  '三晋出版社': '太原',
  '辽宁人民出版社': '沈阳',
  '辽宁大学出版社': '沈阳',

  // === 港台 ===
  '香港中文大学出版社': '香港',
  '学生书局': '台北',
  '联经出版公司': '台北',
  '联经出版事业公司': '台北',
  '中央研究院近代史研究所': '台北',
  '稻乡出版社': '台北',
  '台湾商务印书馆': '台北',
  '国立台湾大学出版中心': '台北',

  // === 海外英文出版社 ===
  'Cambridge University Press': 'Cambridge',
  'Oxford University Press': 'Oxford',
  'Princeton University Press': 'Princeton',
  'Harvard University Press': 'Cambridge, MA',
  'Yale University Press': 'New Haven',
  'Stanford University Press': 'Stanford',
  'Columbia University Press': 'New York',
  'University of California Press': 'Oakland',
  'University of Chicago Press': 'Chicago',
  'University of North Carolina Press': 'Chapel Hill',
  'The University of North Carolina Press': 'Chapel Hill',
  'Cornell University Press': 'Ithaca',
  'Routledge': 'London',
  'Taylor & Francis': 'London',
  'Palgrave Macmillan': 'London',
  'Springer': 'Berlin',
  'Brill': 'Leiden',
  'C. Hurst & Co': 'London',
  'Hurst Publishers': 'London',
}

/**
 * 按出版社名查默认出版地
 * 匹配策略：先精确，再包含（如"生活·读书·新知三联书店"匹配"三联书店"）
 * 返回 undefined 表示无匹配
 */
export function lookupPlace(publisher: string): string | undefined {
  if (!publisher || !publisher.trim()) return undefined
  const p = publisher.trim()

  // 1. 精确匹配
  if (PUBLISHER_PLACES[p]) return PUBLISHER_PLACES[p]

  // 2. 包含匹配（去掉空格和标点后再比，避免"出 版 社"这种干扰）
  const normalize = (s: string) => s.replace(/[\s·、，,]/g, '')
  const np = normalize(p)
  for (const [key, val] of Object.entries(PUBLISHER_PLACES)) {
    if (normalize(key) === np) return val
  }

  // 3. 子串包含（用户输入"生活·读书·新知三联书店"含"三联书店"）
  //    只在 key 较短（≤6字）时启用，避免"出版社"误匹配一堆
  for (const [key, val] of Object.entries(PUBLISHER_PLACES)) {
    if (key.length <= 6 && p.includes(key)) return val
    if (key.length <= 6 && key.includes(p)) return val
  }

  return undefined
}
