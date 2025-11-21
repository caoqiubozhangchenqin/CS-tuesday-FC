# 小说功能域名配置说明

## 📝 概述
小程序的小说阅读功能使用**追书神器API**（主要）和**笔趣阁API**（备用），需要在微信小程序后台配置服务器域名白名单。

## 🌐 需要添加的域名

### request 合法域名
在微信小程序后台 `开发 > 开发管理 > 开发设置 > 服务器域名` 中添加以下域名：

**推荐配置（笔趣阁稳定镜像）**：
```
https://www.biquge5200.com
https://www.qu.la
https://www.xbiquge.so
https://www.biquge.info
```

⚠️ **重要**：
- 笔趣阁类网站域名经常变化
- 建议配置多个备用域名
- 如域名失效，可在代码中切换 `novelApiBase`

## ⚙️ 配置步骤

1. 登录[微信小程序后台](https://mp.weixin.qq.com/)
2. 进入 `开发 > 开发管理 > 开发设置`
3. 找到 `服务器域名` 配置项
4. 点击 `request合法域名` 右侧的 `修改`
5. 将上述域名添加到列表中（如无法添加HTTP域名，只添加HTTPS域名）
6. 点击保存

## ⚠️ 注意事项

### 域名限制
- 每个月只能修改5次服务器域名
- 正式发布要求域名支持 HTTPS
- 域名必须经过ICP备案

### API选择策略
程序会自动选择API源：
1. **优先使用追书神器API**：数据结构规范，JSON格式，易于解析
2. **降级使用笔趣阁**：追书神器失败时自动切换

### 开发阶段
在开发者工具中，可以临时勾选 `详情 > 本地设置 > 不校验合法域名` 来跳过域名验证。

## 📂 相关文件

- **API配置**: `miniprogram/config/env.js`
- **API工具**: `miniprogram/utils/novelApi.js`
- **书架页面**: `miniprogram/pages/novel/shelf/`
- **搜索页面**: `miniprogram/pages/novel/search/`
- **阅读器页面**: `miniprogram/pages/novel/reader/`

## 🔧 API配置

在 `miniprogram/config/env.js` 中：

```javascript
// 小说API配置（笔趣阁多镜像源）
novelApiSources: [
  'https://www.xbiquge.com',
  'https://www.ibiquge.net',
  'https://www.biquge.com.cn'
],

// 小说API默认源
novelApiBase: 'https://www.xbiquge.com'
```

## 📱 功能说明

### 已实现功能
✅ 小说搜索（书名、作者）  
✅ 加入书架  
✅ 阅读进度保存  
✅ 章节列表  
✅ 上一章/下一章导航  
✅ 字号调节（14-24px）  
✅ 4种阅读主题（白色、护眼、羊皮纸、夜间）  
✅ 搜索历史记录  
✅ 本地存储管理  

### 数据存储

使用 `wx.setStorageSync` 存储以下数据：

- `novel_shelf`: 书架列表
- `novel_search_history`: 搜索历史
- `novel_read_settings`: 阅读设置（字号、主题）
- 各书籍的阅读进度存储在书架数据的 `currentChapter` 字段

## 🎨 UI特色

- 📚 **书架**: 橙粉渐变背景，卡片式布局
- 🔍 **搜索**: 紫蓝渐变背景，实时标记已在书架
- 📖 **阅读器**: 
  - 白色主题 (默认)
  - 护眼绿 (#c7edcc)
  - 羊皮纸 (#f4ecd8)
  - 夜间黑 (#1a1a1a)

## 🐛 已知问题

1. **HTML解析**: 不同笔趣阁镜像站的HTML结构可能略有差异，如遇解析失败可切换备用源
2. **图片封面**: 笔趣阁通常不提供封面图，使用默认📚图标
3. **域名稳定性**: 笔趣阁类网站域名可能变化，建议定期检查

## 🔄 更新日志

### v1.0.0 (2025-01-21)
- ✨ 首次实现小说阅读功能
- 🔍 支持笔趣阁API搜索
- 📚 书架管理
- 📖 阅读器（多主题、字号调节）
- 💾 本地进度保存
