# 云数据库章节表配置

## 📚 新增数据库集合

### 集合名称：`novel_chapters`

用于存储小说章节内容，解决云函数返回超过6MB限制的问题。

---

## 🔧 创建步骤

### 1. 打开云开发控制台
```
微信开发者工具 → 点击工具栏「云开发」图标
或访问：https://console.cloud.tencent.com/tcb
```

### 2. 进入数据库管理
```
左侧菜单 → 「数据库」
点击右上角「+」按钮添加集合
```

### 3. 创建集合
```
集合名称：novel_chapters
说明：小说章节内容存储
点击「确定」
```

### 4. 配置权限（重要）
```
点击集合名称 → 「权限设置」

推荐配置：
- 读权限：所有用户可读
- 写权限：仅创建者可写

自定义安全规则：
{
  "read": true,
  "write": "doc._openid == auth.openid"
}
```

---

## 📋 数据结构

### 字段说明

| 字段名 | 类型 | 说明 | 示例 |
|--------|------|------|------|
| `_id` | string | 自动生成的文档ID | `5f9c...` |
| `novelId` | string | 关联的小说ID | `novel_1732180000000` |
| `chapterId` | number | 章节序号 | `0`, `1`, `2` ... |
| `title` | string | 章节标题 | `第一章 序幕` |
| `content` | string | 章节内容 | `话说...` |
| `link` | string | 章节链接 | `chapter_0` |
| `createTime` | date | 创建时间 | `2025-11-21 18:59:26` |

### 示例文档

```json
{
  "_id": "5f9c1234567890abcdef1234",
  "novelId": "novel_1732180000000",
  "chapterId": 0,
  "title": "第一章 序幕",
  "content": "这是一个漫长的故事...",
  "link": "chapter_0",
  "createTime": {
    "$date": "2025-11-21T10:59:26.000Z"
  }
}
```

---

## 🔍 索引配置（可选）

为提升查询性能，建议添加以下索引：

### 1. novelId 索引
```
字段：novelId
排序：升序
唯一性：否
说明：快速查询某本书的所有章节
```

### 2. 复合索引（推荐）
```
字段1：novelId（升序）
字段2：chapterId（升序）
唯一性：是
说明：保证每本书的章节序号唯一
```

### 添加方式：
```
点击集合名称 → 「索引管理」
点击「添加索引」
选择字段和排序方式
保存
```

---

## 📊 容量估算

### 单本小说

| 项目 | 数值 | 说明 |
|------|------|------|
| 平均章节数 | 500章 | 中等长度小说 |
| 单章内容大小 | 5KB | 约2500字 |
| 单本小说大小 | 2.5MB | 500章 × 5KB |

### 数据库容量

| 云开发套餐 | 数据库容量 | 可存储小说数量 |
|-----------|----------|--------------|
| 免费版 | 2GB | 约800本 |
| 基础版1 | 3GB | 约1200本 |
| 基础版2 | 5GB | 约2000本 |

**建议**：定期清理过期或无用的章节数据

---

## 🎯 数据流程

### 上传流程

```
1. 用户上传 TXT/EPUB 文件
   ↓
2. 文件保存到云存储
   ↓
3. 元数据保存到 novels 集合
   ↓
4. 用户首次打开书籍
   ↓
5. 调用 parseNovel 云函数
   ↓
6. 解析章节内容
   ↓
7. 批量保存到 novel_chapters 集合
   ↓
8. 返回章节数量（不返回内容）
   ↓
9. 前端跳转到阅读页
```

### 阅读流程

```
1. 打开阅读页
   ↓
2. 查询 novel_chapters 集合
   ↓
3. 获取该书所有章节（分批查询）
   ↓
4. 显示章节列表和内容
   ↓
5. 翻页时从内存直接读取
```

---

## 🚀 性能优化

### 1. 分批查询
```javascript
// 每次查询100条，循环获取全部章节
let allChapters = [];
let skip = 0;
const MAX_LIMIT = 100;

while (true) {
  const result = await db.collection('novel_chapters')
    .where({ novelId: bookId })
    .orderBy('chapterId', 'asc')
    .skip(skip)
    .limit(MAX_LIMIT)
    .get();
  
  allChapters = allChapters.concat(result.data);
  
  if (result.data.length < MAX_LIMIT) break;
  skip += MAX_LIMIT;
}
```

### 2. 限制章节数量
```javascript
// 云函数中限制最多保存1000章
const maxChapters = 1000;
const chaptersToSave = chapters.slice(0, maxChapters);
```

### 3. 批量写入
```javascript
// 每次写入20条，减少请求次数
const batchSize = 20;
for (let i = 0; i < chapters.length; i += batchSize) {
  const batch = chapters.slice(i, i + batchSize);
  const promises = batch.map(chapter => 
    db.collection('novel_chapters').add({ data: chapter })
  );
  await Promise.all(promises);
}
```

---

## 🐛 常见问题

### Q1: 为什么要用数据库存储章节？
**A**: 云函数返回有6MB限制，大文件解析后的章节内容会超过限制。使用数据库存储，云函数只返回元数据，避免超限。

### Q2: 数据库查询会很慢吗？
**A**: 
- ✅ 首次查询：2-3秒（500章）
- ✅ 后续翻页：秒开（内存读取）
- ✅ 添加索引后更快

### Q3: 会占用很多数据库空间吗？
**A**: 
- 单本小说约 2-3MB
- 免费版2GB可存800本
- 超出可升级套餐或清理旧数据

### Q4: 删除小说后章节会自动删除吗？
**A**: 目前不会自动删除，需要手动清理。后续可添加云函数自动清理。

### Q5: 如何清理某本书的章节？
```javascript
// 在云函数或控制台执行
await db.collection('novel_chapters')
  .where({ novelId: 'novel_xxx' })
  .remove();
```

---

## ✅ 验证配置

### 测试步骤：

1. **创建集合**
   ```
   ✓ 集合名称：novel_chapters
   ✓ 权限：所有用户可读
   ```

2. **上传测试书籍**
   ```
   ✓ 上传一个 2-3MB 的 TXT 文件
   ✓ 点击阅读
   ✓ 观察解析过程
   ```

3. **检查数据库**
   ```
   ✓ 进入云开发控制台 → 数据库
   ✓ 打开 novel_chapters 集合
   ✓ 确认有章节数据写入
   ✓ 检查字段是否完整
   ```

4. **测试阅读**
   ```
   ✓ 再次点击阅读（应该很快）
   ✓ 测试翻页功能
   ✓ 测试章节目录
   ✓ 确认阅读进度保存
   ```

---

## 🎓 技术原理

### 为什么6MB限制？

微信小程序云函数对HTTP响应体大小有限制：
- **单次返回最大6MB**
- 超过会报错：`-504002 FUNCTIONS_EXECUTE_FAIL`

### 解决方案对比

| 方案 | 优点 | 缺点 | 适用场景 |
|------|------|------|---------|
| 本地缓存 | 速度快 | 空间限制10MB | 小说少于5本 |
| 云函数返回 | 简单直接 | 有6MB限制 | 小文件（<500章） |
| **云数据库** | **无大小限制** | **需额外查询** | **大文件（>500章）** ✅ |
| 云存储 | 无限容量 | 每次都需下载 | 备份存档 |

### 当前方案优势

- ✅ 突破6MB限制
- ✅ 支持超大文件（>10MB）
- ✅ 全局共享章节数据
- ✅ 只需解析一次
- ✅ 后续阅读秒开
- ✅ 支持离线缓存

---

## 📈 监控与维护

### 数据库用量监控
```
云开发控制台 → 概览
查看：数据库容量使用情况
```

### 定期清理建议
```javascript
// 清理30天未访问的章节（可选）
const thirtyDaysAgo = new Date(Date.now() - 30*24*60*60*1000);

await db.collection('novel_chapters')
  .where({
    createTime: db.command.lt(thirtyDaysAgo)
  })
  .remove();
```

---

## 🆘 故障排查

### 错误1：集合不存在
```
错误信息：Collection 'novel_chapters' not found

解决方案：
1. 检查集合名称是否正确（区分大小写）
2. 在云开发控制台手动创建集合
3. 重新编译小程序
```

### 错误2：权限不足
```
错误信息：Permission denied

解决方案：
1. 检查集合权限设置
2. 设置为「所有用户可读」
3. 或添加自定义安全规则
```

### 错误3：查询超时
```
错误信息：Request timeout

解决方案：
1. 添加索引（novelId字段）
2. 减少单次查询数量
3. 增加超时时间配置
```

---

## 🎁 完整示例

### 云函数写入
```javascript
// parseNovel/index.js
const chapters = await parseTXT(fileID);

for (let i = 0; i < chapters.length; i += 20) {
  const batch = chapters.slice(i, i + 20);
  const promises = batch.map(chapter => {
    return db.collection('novel_chapters').add({
      data: {
        novelId: novelId,
        chapterId: chapter.id,
        title: chapter.title,
        content: chapter.content,
        link: chapter.link,
        createTime: db.serverDate()
      }
    });
  });
  await Promise.all(promises);
}
```

### 小程序读取
```javascript
// reader.js
async loadCloudBook() {
  const db = wx.cloud.database();
  let allChapters = [];
  let skip = 0;
  
  while (true) {
    const result = await db.collection('novel_chapters')
      .where({ novelId: this.data.bookId })
      .orderBy('chapterId', 'asc')
      .skip(skip)
      .limit(100)
      .get();
    
    allChapters = allChapters.concat(result.data);
    
    if (result.data.length < 100) break;
    skip += 100;
  }
  
  this.setData({ chapters: allChapters });
}
```

---

**当前环境**
- 云环境ID: cloud1-3ge5gomsffe800a7
- 新增集合: novel_chapters
- 关联集合: novels

**下一步**：
1. 创建 `novel_chapters` 集合
2. 配置读写权限
3. 重新部署 `parseNovel` 云函数
4. 测试上传和阅读功能

配置完成后，就可以支持任意大小的小说文件了！📚
