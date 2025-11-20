# 球队名称翻译说明

## 📝 功能概述

小程序现在支持将 OpenFootball.json 数据库中的英文球队名自动翻译为中文显示。

## 🎯 实现方式

### 映射表位置
```
miniprogram/utils/teamNameMap.js
```

### 使用方法

```javascript
const { translateTeamName, translateTeams, checkMissingTranslations } = require('../../utils/teamNameMap.js');

// 1. 翻译单个球队名
const chineseName = translateTeamName('Manchester City');  // 返回: "曼城"

// 2. 批量翻译（积分榜数组）
const translatedStandings = translateTeams(standings);

// 3. 检查缺失的翻译
const missing = checkMissingTranslations(standings);
if (missing.length > 0) {
  console.warn('以下球队缺少翻译:', missing);
}
```

## 📊 已支持球队

### 英超 (Premier League) - 25支
- 曼城、阿森纳、利物浦、曼联、切尔西
- 托特纳姆热刺、纽卡斯尔联、西汉姆联、阿斯顿维拉
- 布莱顿、狼队、富勒姆、伯恩茅斯、水晶宫
- 布伦特福德、埃弗顿、诺丁汉森林、莱斯特城
- 利兹联、南安普顿、沃特福德、诺维奇等

### 德甲 (Bundesliga) - 20支
- 拜仁慕尼黑、多特蒙德、莱比锡红牛、勒沃库森
- 法兰克福、沃尔夫斯堡、门兴格拉德巴赫
- 弗赖堡、柏林联合、霍芬海姆、云达不莱梅等

### 西甲 (La Liga) - 20支
- 皇家马德里、巴塞罗那、马德里竞技
- 塞维利亚、瓦伦西亚、比利亚雷亚尔
- 皇家社会、毕尔巴鄂竞技、皇家贝蒂斯等

### 意甲 (Serie A) - 20支
- 国际米兰、AC米兰、尤文图斯、那不勒斯
- 罗马、拉齐奥、亚特兰大、佛罗伦萨
- 都灵、博洛尼亚、萨索洛等

### 法甲 (Ligue 1) - 20支
- 巴黎圣日耳曼、摩纳哥、里尔、马赛
- 里昂、尼斯、雷恩、朗斯
- 蒙彼利埃、斯特拉斯堡等

## 🔧 添加新的球队翻译

如果发现有球队名称未翻译（显示英文），可以按以下步骤添加：

### 1. 打开映射文件
```
miniprogram/utils/teamNameMap.js
```

### 2. 在对应联赛区域添加映射
```javascript
const teamNameMap = {
  // ... 其他映射 ...
  
  // 添加新的球队
  'English Team Name': '中文球队名',
  
  // 示例
  'Nottingham Forest': '诺丁汉森林',
};
```

### 3. 注意事项
- 英文名必须与 OpenFootball.json 数据库中完全一致
- 区分大小写和空格
- 可以为同一支球队添加多个别名

### 4. 常见别名处理
```javascript
// 同一支球队可能有多个英文名
'Bayern München': '拜仁慕尼黑',
'Bayern Munich': '拜仁慕尼黑',

'Paris Saint-Germain': '巴黎圣日耳曼',
'Paris SG': '巴黎圣日耳曼',
```

## 🐛 调试未翻译的球队

### 查看控制台日志

当有球队名称未翻译时，控制台会输出警告：

```javascript
// 控制台输出：
⚠️ 以下球队名称缺少中文翻译: ['Newly Promoted Team', 'Another Team']
```

### 处理步骤

1. **复制英文名**：从控制台复制准确的英文名
2. **查找官方译名**：在网上搜索该球队的中文译名
3. **添加到映射表**：按上述方法添加到 `teamNameMap.js`
4. **重新编译测试**：保存后重新编译小程序

## 📱 显示效果

### 积分榜示例

| 排名 | 球队 | 赛 | 胜 | 平 | 负 | 积分 |
|-----|------|----|----|----|----|------|
| 1 | 曼城 ✅ | 38 | 28 | 5 | 5 | 89 |
| 2 | 阿森纳 ✅ | 38 | 26 | 6 | 6 | 84 |
| 3 | 利物浦 ✅ | 38 | 24 | 10 | 4 | 82 |

**注**：原英文名会保留在数据中的 `originalName` 字段，方便调试。

### 赛季信息示例

```
📊 英超 2023-24 赛季积分榜
🏆 冠军: 曼城
```

## 🎨 自定义翻译规则

### 保留英文名

如果某些球队你想保留英文名，可以：

```javascript
// 方案1：不添加到映射表（自动显示英文）
// 方案2：映射为英文名
'Arsenal': 'Arsenal',  // 强制显示英文
```

### 使用简称

```javascript
// 使用球队简称
'Tottenham Hotspur': '热刺',
'Brighton & Hove Albion': '布莱顿',
'Wolverhampton Wanderers': '狼队',
```

### 使用全称

```javascript
// 使用完整译名
'Manchester United': '曼彻斯特联队',  // 完整
'Manchester United': '曼联',          // 简称（推荐）
```

## 🔄 更新映射表

### 赛季更新时

每个赛季可能有升降级球队，需要更新映射表：

1. 查看新赛季球队列表
2. 添加升级球队的翻译
3. 可以保留降级球队的翻译（不影响）

### 维护建议

```javascript
// 按赛季注释新增的球队
// ========== 2024-25 赛季新增 ==========
'Ipswich Town': '伊普斯维奇',
'Southampton': '南安普顿',  // 升级回来

// ========== 2023-24 赛季新增 ==========
'Luton Town': '卢顿',
```

## 📈 未来扩展

### 可能的增强功能

1. **球队徽章**：添加球队图标/logo
2. **球队简称**：提供多种翻译版本（全称/简称）
3. **用户自定义**：允许用户自定义球队译名
4. **自动翻译**：集成翻译API自动翻译新球队
5. **多语言支持**：支持繁体中文、英文切换

### 数据结构示例

```javascript
// 未来可能的扩展结构
const enhancedTeamData = {
  'Manchester City': {
    zh_CN: '曼城',              // 简体中文
    zh_TW: '曼城',              // 繁体中文
    en: 'Manchester City',     // 英文
    shortName: '曼城',          // 简称
    fullName: '曼彻斯特城',     // 全称
    logo: '/images/teams/mancity.png',  // 队徽
    color: '#6CABDD'           // 球队颜色
  }
};
```

## ❓ 常见问题

### Q1: 为什么有些球队还是显示英文？
**A**: 映射表中可能没有该球队，请按上述方法添加。

### Q2: 如何知道准确的英文名？
**A**: 查看控制台日志中的警告信息，会显示原始英文名。

### Q3: 翻译后如何生效？
**A**: 保存文件后重新编译小程序即可。

### Q4: 能否同时显示中英文？
**A**: 可以修改 WXML 模板，同时显示 `team` 和 `originalName`。

### Q5: 历史赛季的球队名也会翻译吗？
**A**: 是的，所有赛季使用相同的映射表。

## 📞 贡献翻译

如果你发现：
- 翻译不准确
- 缺少球队翻译
- 有更好的翻译建议

欢迎：
1. 提交 Issue
2. 提交 Pull Request
3. 联系维护者

---

**当前版本**: v1.0  
**最后更新**: 2025-11-20  
**维护状态**: ✅ 活跃维护中
