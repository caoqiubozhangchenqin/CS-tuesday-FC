# 阅读进度数据库配置

## 📚 新增数据库集合

### 集合名称：`reading_progress`

用于存储每个用户的阅读进度，支持多设备同步。

---

## 🔧 创建步骤

### 1. 打开云开发控制台
```
微信开发者工具 → 点击工具栏「云开发」图标
```

### 2. 创建集合
```
左侧菜单 → 数据库
点击右上角「+」添加集合
集合名称：reading_progress
点击「确定」
```

### 3. 配置权限
```
点击集合名称 → 权限设置

推荐配置：
- 读权限：仅创建者可读写
- 写权限：仅创建者可写

自定义安全规则：
{
  "read": "doc._openid == auth.openid",
  "write": "doc._openid == auth.openid"
}
```

这样每个用户只能读写自己的阅读进度。

---

## 📋 数据结构

### 字段说明

| 字段名 | 类型 | 说明 | 示例 |
|--------|------|------|------|
| `_id` | string | 自动生成的文档ID | `5f9c...` |
| `_openid` | string | 用户唯一标识（自动） | `oVAxO...` |
| `novelId` | string | 关联的小说ID | `novel_1732180000000` |
| `chapterIndex` | number | 当前阅读章节序号 | `25` |
| `scrollTop` | number | 滚动位置（像素） | `1250` |
| `updateTime` | date | 更新时间 | `2025-11-21 19:15:30` |

### 示例文档

```json
{
  "_id": "5f9c1234567890abcdef5678",
  "_openid": "oVAxOvrDAY9Q0qG8WBnRxO3_m1nw",
  "novelId": "novel_1732180000000",
  "chapterIndex": 25,
  "scrollTop": 1250,
  "updateTime": {
    "$date": "2025-11-21T11:15:30.000Z"
  }
}
```

---

## 🎯 功能特性

### 1. 多设备同步
```
用户在手机A上阅读到第25章
→ 切换到手机B打开同一本书
→ 自动跳转到第25章，继续阅读
```

### 2. 滚动位置记忆
```
用户在第10章滚动到一半退出
→ 再次打开
→ 自动定位到之前的滚动位置
```

### 3. 实时保存
```
- 翻页时自动保存
- 滚动时记录位置
- 退出时保存进度
```

---

## 🔍 索引配置（推荐）

### 复合索引
```
字段1：_openid（升序）
字段2：novelId（升序）
唯一性：是
说明：保证每个用户每本书只有一条进度记录
```

### 添加方式：
```
点击集合名称 → 索引管理
点击「添加索引」
选择字段和排序方式
勾选「唯一索引」
保存
```

---

## 📊 数据流程

### 保存进度
```javascript
// reader.js - saveProgress()
const db = wx.cloud.database();

// 1. 准备数据
const progressData = {
  novelId: this.data.bookId,
  chapterIndex: this.data.currentChapterIndex,
  scrollTop: this.data.lastScrollTop,
  updateTime: db.serverDate()
};

// 2. 查询是否已有记录
const existResult = await db.collection('reading_progress')
  .where({
    novelId: this.data.bookId,
    _openid: '{auto}' // 自动匹配当前用户
  })
  .get();

// 3. 更新或新增
if (existResult.data.length > 0) {
  // 更新已有记录
  await db.collection('reading_progress')
    .doc(existResult.data[0]._id)
    .update({ data: progressData });
} else {
  // 新增记录
  await db.collection('reading_progress')
    .add({ data: progressData });
}
```

### 加载进度
```javascript
// reader.js - loadProgress()
const db = wx.cloud.database();

const result = await db.collection('reading_progress')
  .where({
    novelId: this.data.bookId,
    _openid: '{auto}' // 自动匹配当前用户
  })
  .orderBy('updateTime', 'desc')
  .limit(1)
  .get();

if (result.data.length > 0) {
  const progress = result.data[0];
  // 跳转到之前的章节和位置
  this.setData({
    currentChapterIndex: progress.chapterIndex,
    scrollTop: progress.scrollTop
  });
}
```

---

## 🎨 阅读器优化

### 1. 滚动模式（已实现）
```
✅ 隐藏翻页按钮（上一章/下一章）
✅ 滚动到底部自动加载下一章
✅ 连续阅读体验
✅ 滚动位置实时记录
```

### 2. 云端进度同步（已实现）
```
✅ 打开书籍自动加载进度
✅ 显示「继续阅读第XX章」提示
✅ 自动定位到上次滚动位置
✅ 退出时自动保存进度
✅ 翻页时实时保存
```

### 3. 页码跳转（已实现）
```
✅ 底部菜单新增「跳转」按钮
✅ 输入章节号直接跳转
✅ 范围验证（1-总章节数）
✅ 跳转后重置滚动位置
```

---

## 🚀 使用流程

### 用户A首次阅读
```
1. 打开书籍，从第1章开始
2. 阅读到第10章第3屏
3. 退出小程序
→ 自动保存：chapterIndex=10, scrollTop=1500
```

### 用户A再次打开
```
1. 打开同一本书
2. 提示「继续阅读第11章」
3. 自动跳转并定位到之前位置
4. 继续阅读
```

### 用户A切换设备
```
1. 在另一台手机登录同一账号
2. 打开同一本书
3. 自动同步进度到第10章第3屏
4. 无缝继续阅读
```

---

## 📈 容量估算

### 单用户数据

| 项目 | 数值 | 说明 |
|------|------|------|
| 单条记录大小 | ~200字节 | 很小 |
| 用户阅读10本书 | ~2KB | 几乎可忽略 |
| 用户阅读100本书 | ~20KB | 仍然很小 |

### 数据库总容量

| 用户数 | 每人100本书 | 总容量 |
|--------|------------|--------|
| 100人 | 100本 | 2MB |
| 1000人 | 100本 | 20MB |
| 10000人 | 100本 | 200MB |

**结论**：阅读进度数据非常小，不必担心容量问题。

---

## 🐛 常见问题

### Q1: 为什么需要云端保存？
**A**: 
- ✅ 多设备同步（手机、平板、电脑）
- ✅ 换设备不丢失进度
- ✅ 卸载重装后恢复进度
- ✅ 清理缓存不影响进度

### Q2: 本地缓存不行吗？
**A**: 本地缓存的问题：
- ❌ 只在当前设备有效
- ❌ 清理数据后丢失
- ❌ 换设备需重新开始
- ❌ 卸载重装后丢失

### Q3: 会占用很多流量吗？
**A**: 不会，单次保存流量：
```
更新进度：~500字节
加载进度：~500字节
一天阅读10次：~10KB（可忽略）
```

### Q4: 滚动时频繁保存会卡吗？
**A**: 不会，已做优化：
- 只在滚动停止时保存
- 退出页面时保存
- 翻页时保存
- 不会实时保存每次滚动

### Q5: 如何清空所有进度？
```javascript
// 云函数或控制台执行
await db.collection('reading_progress')
  .where({
    _openid: '{用户openid}'
  })
  .remove();
```

---

## ✅ 验证配置

### 测试步骤：

1. **创建集合**
   ```
   ✓ 集合名称：reading_progress
   ✓ 权限：仅创建者可读写
   ```

2. **上传测试书籍**
   ```
   ✓ 上传一本书
   ✓ 打开阅读
   ✓ 阅读到第5章
   ```

3. **检查数据库**
   ```
   ✓ 进入云开发控制台 → 数据库
   ✓ 打开 reading_progress 集合
   ✓ 确认有进度记录
   ✓ 检查字段：novelId, chapterIndex, scrollTop
   ```

4. **测试同步**
   ```
   ✓ 退出小程序
   ✓ 重新打开书籍
   ✓ 确认自动跳转到第5章
   ✓ 确认滚动位置正确
   ```

---

## 🎁 优化建议

### 1. 定期清理过期记录
```javascript
// 清理180天未更新的记录
const db = cloud.database();
const _ = db.command;
const sixMonthsAgo = new Date(Date.now() - 180*24*60*60*1000);

await db.collection('reading_progress')
  .where({
    updateTime: _.lt(sixMonthsAgo)
  })
  .remove();
```

### 2. 添加阅读统计
```javascript
// 扩展字段
{
  novelId: 'xxx',
  chapterIndex: 10,
  scrollTop: 1500,
  updateTime: Date,
  // 新增统计字段
  totalReadTime: 3600,  // 总阅读时长（秒）
  readCount: 15,        // 打开次数
  lastReadDate: Date    // 最后阅读日期
}
```

### 3. 添加书签功能
```javascript
// 新增 bookmarks 集合
{
  novelId: 'xxx',
  chapterIndex: 10,
  scrollTop: 1500,
  note: '这段写得真好',  // 书签备注
  createTime: Date
}
```

---

## 📚 相关文档

- **[CLOUD_DATABASE_CHAPTERS.md](./CLOUD_DATABASE_CHAPTERS.md)** - 章节数据库配置
- **[CLOUD_FUNCTION_ERRORS.md](./CLOUD_FUNCTION_ERRORS.md)** - 错误解决方案
- **[QUICK_DEPLOY.md](./QUICK_DEPLOY.md)** - 快速部署指南

---

**当前环境**
- 云环境ID: cloud1-3ge5gomsffe800a7
- 新增集合: reading_progress
- 关联集合: novels, novel_chapters

**功能特性**：
- ✅ 滚动阅读模式
- ✅ 云端进度同步
- ✅ 多设备同步
- ✅ 滚动位置记忆
- ✅ 页码快速跳转
- ✅ 自动加载下一章

**下一步**：
1. 创建 `reading_progress` 数据库集合
2. 配置权限（仅创建者可读写）
3. 添加复合索引（_openid + novelId）
4. 重新编译测试

配置完成后，阅读体验将大幅提升！📖✨
