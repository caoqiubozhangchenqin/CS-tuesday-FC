# 追书神器API失效说明

## ⚠️ 问题描述

追书神器API（api.zhuishushenqi.com）已经失效，所有请求都返回：

```json
{
  "ok": false,
  "code": "invalid id",
  "msg": "invalid id",
  "token": ""
}
```

## 🔄 当前解决方案

**已切换到本地演示模式**

- 📚 内置20本精选小说
- 📖 每本书自动生成100章演示内容
- ⚡ 无需网络请求，立即可用
- 💾 支持所有功能（搜索、书架、阅读、进度保存）

## 📝 功能说明

### 本地演示模式特点

✅ **完整功能演示**
- 支持搜索（书名、作者、标签）
- 支持加入书架
- 支持阅读和进度保存
- 支持所有阅读器功能（主题、字体、翻页）

✅ **内置书籍列表**
```
玄幻：斗破苍穹、斗罗大陆、遮天、完美世界、武动乾坤
科幻：三体、诡秘之主、超神机械师
修仙：凡人修仙传、盘龙、一念永恒、我欲封天、仙逆
都市：全职高手
武侠：雪中悍刀行
言情：何以笙箫默、微微一笑很倾城
其他：择天记、大主宰、元尊
```

✅ **自动生成章节**
- 每本书100章
- 章节标题：第X章 修炼/突破/战斗/奇遇/历练/悟道之路
- 章节内容：包含演示文本，说明为演示内容

## 🔧 代码结构

### 文件说明

1. **miniprogram/utils/novelApi.js** (主文件)
   - 已注释掉追书神器API代码
   - 引用本地演示模式

2. **miniprogram/utils/novelApi-local.js** (本地模式)
   - 20本书的完整数据
   - 搜索、章节列表、章节内容函数
   - 模拟网络延迟效果

### 切换方式

如需恢复API模式（当找到可用API时）：

1. 编辑 `miniprogram/utils/novelApi.js`
2. 注释掉第5-6行：
   ```javascript
   // const localApi = require('./novelApi-local.js');
   // module.exports = localApi;
   ```
3. 取消注释第8行及以后的代码
4. 修改API地址和接口

## 🌐 可选的替代方案

### 方案A：自建小说API
- 爬取免费小说网站（如笔趣阁）
- 搭建自己的API服务器
- 优点：完全可控
- 缺点：需要服务器和维护

### 方案B：使用其他第三方API
- 搜索 "免费小说API"
- 注意版权和稳定性问题
- 需要测试接口可用性

### 方案C：继续使用本地模式
- 无需网络请求
- 功能完整
- 仅限演示用途
- 可扩展书库（添加更多书籍到LOCAL_BOOKS）

## 💡 扩展建议

### 如何添加更多本地书籍？

编辑 `miniprogram/utils/novelApi-local.js`，在 `LOCAL_BOOKS` 数组中添加：

```javascript
{ 
  id: 21, 
  name: '书名', 
  author: '作者', 
  intro: '简介...', 
  cover: 'https://封面地址', 
  tags: ['标签1', '标签2'] 
}
```

### 如何修改章节数量？

编辑 `getChapterList` 函数，修改 `chapterCount` 变量：

```javascript
const chapterCount = 200; // 改成200章
```

### 如何自定义章节内容？

编辑 `generateChapterContent` 函数，修改 `paragraphs` 数组。

## 📚 技术说明

### API失效原因分析

1. **追书神器服务关闭**：可能是服务不再维护
2. **需要认证**：可能现在需要API密钥
3. **域名变更**：可能换了新域名
4. **限流机制**：可能需要特定请求头

### 测试记录

```
时间：2025-11-21
测试URL：https://api.zhuishushenqi.com/book/fuzzy-search?query=斗破苍穹
状态码：200
响应：{"ok":false,"code":"invalid id","msg":"invalid id","token":""}
结论：API已失效
```

## ✅ 当前状态

- [x] 切换到本地演示模式
- [x] 所有功能正常工作
- [x] 搜索功能可用
- [x] 阅读功能可用
- [x] 进度保存可用
- [ ] 寻找新的可用API（待定）

## 📞 联系与反馈

如果你找到了新的可用小说API，请：
1. 测试API接口可用性
2. 参考 `novelApi-local.js` 的函数结构
3. 创建新的API文件
4. 修改 `novelApi.js` 的引用

---

**更新时间**：2025-11-21  
**状态**：本地演示模式运行中 ✅
