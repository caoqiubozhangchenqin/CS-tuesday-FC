// 球队名称中英文映射表
// 用于将 OpenFootball.json 中的英文球队名翻译为中文

const teamNameMap = {
  // ========== 英超 Premier League ==========
  'Manchester City': '曼城',
  'Arsenal': '阿森纳',
  'Liverpool': '利物浦',
  'Aston Villa': '阿斯顿维拉',
  'Tottenham Hotspur': '托特纳姆热刺',
  'Manchester United': '曼联',
  'West Ham United': '西汉姆联',
  'Chelsea': '切尔西',
  'Newcastle United': '纽卡斯尔联',
  'Brighton & Hove Albion': '布莱顿',
  'Wolverhampton Wanderers': '狼队',
  'Fulham': '富勒姆',
  'Bournemouth': '伯恩茅斯',
  'Crystal Palace': '水晶宫',
  'Brentford': '布伦特福德',
  'Everton': '埃弗顿',
  'Nottingham Forest': '诺丁汉森林',
  'Luton Town': '卢顿',
  'Burnley': '伯恩利',
  'Sheffield United': '谢菲尔德联',
  'Leicester City': '莱斯特城',
  'Leeds United': '利兹联',
  'Southampton': '南安普顿',
  'Watford': '沃特福德',
  'Norwich City': '诺维奇',

  // ========== 德甲 Bundesliga ==========
  'Bayern München': '拜仁慕尼黑',
  'Bayern Munich': '拜仁慕尼黑',
  'Borussia Dortmund': '多特蒙德',
  'RB Leipzig': '莱比锡红牛',
  'Union Berlin': '柏林联合',
  'SC Freiburg': '弗赖堡',
  'Bayer Leverkusen': '勒沃库森',
  'Eintracht Frankfurt': '法兰克福',
  'VfL Wolfsburg': '沃尔夫斯堡',
  'Mainz 05': '美因茨',
  'Borussia Mönchengladbach': '门兴格拉德巴赫',
  'FC Köln': '科隆',
  'Hoffenheim': '霍芬海姆',
  'Werder Bremen': '云达不莱梅',
  'VfL Bochum': '波鸿',
  'FC Augsburg': '奥格斯堡',
  'VfB Stuttgart': '斯图加特',
  'Hertha BSC': '柏林赫塔',
  'Schalke 04': '沙尔克04',
  'Arminia Bielefeld': '比勒费尔德',

  // ========== 西甲 La Liga ==========
  'Real Madrid': '皇家马德里',
  'Barcelona': '巴塞罗那',
  'Atlético Madrid': '马德里竞技',
  'Athletic Bilbao': '毕尔巴鄂竞技',
  'Real Sociedad': '皇家社会',
  'Real Betis': '皇家贝蒂斯',
  'Villarreal': '比利亚雷亚尔',
  'Valencia': '瓦伦西亚',
  'Osasuna': '奥萨苏纳',
  'Getafe': '赫塔菲',
  'Sevilla': '塞维利亚',
  'Girona': '赫罗纳',
  'Rayo Vallecano': '巴列卡诺',
  'Mallorca': '马略卡',
  'Deportivo Alavés': '阿拉维斯',
  'Las Palmas': '拉斯帕尔马斯',
  'Cádiz': '加的斯',
  'Celta Vigo': '塞尔塔',
  'Granada': '格拉纳达',
  'Almería': '阿尔梅里亚',
  'Espanyol': '西班牙人',
  'Elche': '埃尔切',
  'Levante': '莱万特',

  // ========== 意甲 Serie A ==========
  'Inter': '国际米兰',
  'AC Milan': 'AC米兰',
  'Juventus': '尤文图斯',
  'Atalanta': '亚特兰大',
  'Roma': '罗马',
  'Lazio': '拉齐奥',
  'Fiorentina': '佛罗伦萨',
  'Torino': '都灵',
  'Napoli': '那不勒斯',
  'Bologna': '博洛尼亚',
  'Frosinone': '弗罗西诺内',
  'Sassuolo': '萨索洛',
  'Lecce': '莱切',
  'Udinese': '乌迪内斯',
  'Genoa': '热那亚',
  'Monza': '蒙扎',
  'Verona': '维罗纳',
  'Cagliari': '卡利亚里',
  'Empoli': '恩波利',
  'Salernitana': '萨勒尼塔纳',
  'Sampdoria': '桑普多利亚',
  'Spezia': '斯佩齐亚',
  'Cremonese': '克雷莫纳',

  // ========== 法甲 Ligue 1 ==========
  'Paris Saint-Germain': '巴黎圣日耳曼',
  'Paris SG': '巴黎圣日耳曼',
  'AS Monaco': '摩纳哥',
  'Lille': '里尔',
  'Olympique Marseille': '马赛',
  'Lens': '朗斯',
  'Rennes': '雷恩',
  'Nice': '尼斯',
  'Lyon': '里昂',
  'Montpellier': '蒙彼利埃',
  'Strasbourg': '斯特拉斯堡',
  'Reims': '兰斯',
  'Toulouse': '图卢兹',
  'Nantes': '南特',
  'Lorient': '洛里昂',
  'Le Havre': '勒阿弗尔',
  'Brest': '布雷斯特',
  'Clermont Foot': '克莱蒙',
  'Metz': '梅斯',
  'Troyes': '特鲁瓦',
  'Auxerre': '欧塞尔',
  'Ajaccio': '阿雅克肖',
  'Angers': '昂热',
  'Saint-Étienne': '圣埃蒂安',
};

/**
 * 将英文球队名翻译为中文
 * @param {string} englishName - 英文球队名
 * @returns {string} - 中文球队名（如果映射表中没有，返回原英文名）
 */
function translateTeamName(englishName) {
  if (!englishName) return '';
  
  // 先尝试完全匹配
  if (teamNameMap[englishName]) {
    return teamNameMap[englishName];
  }
  
  // 尝试去除多余空格后匹配
  const trimmedName = englishName.trim();
  if (teamNameMap[trimmedName]) {
    return teamNameMap[trimmedName];
  }
  
  // 如果没有找到映射，返回原英文名
  return englishName;
}

/**
 * 批量翻译球队名
 * @param {Array} teams - 球队列表（每个球队对象需要有 team 属性）
 * @returns {Array} - 翻译后的球队列表
 */
function translateTeams(teams) {
  if (!Array.isArray(teams)) return teams;
  
  return teams.map(team => ({
    ...team,
    team: translateTeamName(team.team),
    originalName: team.team // 保留原始英文名
  }));
}

/**
 * 检查是否有缺失的翻译
 * @param {Array} teams - 球队列表
 * @returns {Array} - 缺失翻译的球队名列表
 */
function checkMissingTranslations(teams) {
  if (!Array.isArray(teams)) return [];
  
  const missing = [];
  teams.forEach(team => {
    const name = team.team || team;
    if (typeof name === 'string' && !teamNameMap[name]) {
      if (!missing.includes(name)) {
        missing.push(name);
      }
    }
  });
  
  return missing;
}

module.exports = {
  teamNameMap,
  translateTeamName,
  translateTeams,
  checkMissingTranslations
};
