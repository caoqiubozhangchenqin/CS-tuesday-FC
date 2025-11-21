# 云端小说存储位置详解

## 📂 存储架构

```
云开发环境
├── 云存储 (Cloud Storage)           ← 存储文件实体
│   └── novels/                       
│       ├── 1732176000000_斗破苍穹.txt
│       ├── 1732176001234_三体.epub
│       └── ...
│
├── 云数据库 (Cloud Database)        ← 存储元数据
│   └── novels (集合)
│       ├── 记录1: { name, author, fileID, ... }
│       ├── 记录2: { name, author, fileID, ... }
│       └── ...
│
└── 云函数 (Cloud Functions)         ← 解析逻辑
    └── parseNovel
        ├── index.js (解析代码)
        └── package.json (依赖)
```

---

## 1️⃣ 云存储（文件实体）

### 存储路径
```
云存储根目录/novels/{timestamp}_{filename}

示例：
novels/1732176000000_斗破苍穹.txt
novels/1732176001234_三体.epub
```

### 路径说明
- **novels/**：文件夹名称（可自定义）
- **timestamp**：上传时间戳（毫秒）
- **filename**：原始文件名

### 文件 ID 格式
```
cloud://环境ID.你的云环境/novels/xxx.txt
```

### 查看方法

#### 方法1：开发者工具
1. 打开微信开发者工具
2. 点击顶部 **云开发** 图标
3. 选择 **云存储** 标签
4. 查看 `novels/` 文件夹

#### 方法2：云开发控制台
1. 登录 https://console.cloud.tencent.com/tcb
2. 选择你的环境
3. 进入 **云存储** 管理
4. 浏览文件列表

#### 方法3：代码查询
```javascript
// 获取文件列表
wx.cloud.getTempFileURL({
  fileList: ['cloud://...']
}).then(res => {
  console.log('临时链接:', res.fileList[0].tempFileURL);
});
```

### 存储特点
- ✅ 文件完整保存（原始 TXT/EPUB）
- ✅ 自动备份
- ✅ 支持生成临时下载链接（有效期2小时）
- ✅ 支持文件管理（上传/下载/删除）
- ⚠️ 免费版限制：2GB

---

## 2️⃣ 云数据库（元数据）

### 集合名称
```
novels
```

### 数据结构
```javascript
{
  // 系统字段
  _id: "记录的唯一ID",
  _openid: "用户openid", // 自动填充，用于权限隔离
  
  // 书籍基本信息
  name: "斗破苍穹",                    // 书名
  author: "天蚕土豆",                  // 作者
  intro: "三十年河东，三十年河西...",  // 简介
  category: "玄幻",                    // 分类
  format: "TXT",                       // 格式: TXT/EPUB
  
  // 云存储关联
  fileID: "cloud://环境.../novels/...", // 云存储文件ID
  cloudPath: "novels/xxx.txt",         // 云存储路径
  
  // 文件信息
  size: 1234567,                       // 文件大小（字节）
  sizeText: "1.23 MB",                 // 格式化大小
  
  // 时间戳
  uploadTime: {                        // 服务器时间（Date类型）
    "$date": "2025-11-21T10:00:00.000Z"
  }
}
```

### 字段说明

| 字段 | 类型 | 说明 | 必填 |
|------|------|------|------|
| _id | String | 自动生成的记录ID | ✅ |
| _openid | String | 用户openid，自动填充 | ✅ |
| name | String | 书名 | ✅ |
| author | String | 作者 | ✅ |
| intro | String | 简介 | ❌ |
| category | String | 分类（玄幻/武侠等） | ✅ |
| format | String | TXT 或 EPUB | ✅ |
| fileID | String | 云存储文件ID | ✅ |
| cloudPath | String | 云存储路径 | ✅ |
| size | Number | 文件大小（字节） | ✅ |
| sizeText | String | 格式化大小 | ✅ |
| uploadTime | Date | 服务器时间 | ✅ |

### 权限设置
```json
{
  "read": "doc._openid == auth.openid",
  "write": "doc._openid == auth.openid"
}
```
**含义**：仅创建者可读写（基于 openid 隔离）

### 查看方法

#### 方法1：数据库控制台
1. 云开发控制台
2. 选择 **数据库** 标签
3. 选择 `novels` 集合
4. 查看所有记录

#### 方法2：代码查询
```javascript
const db = wx.cloud.database();
db.collection('novels')
  .orderBy('uploadTime', 'desc')
  .get()
  .then(res => {
    console.log('云端书籍:', res.data);
  });
```

#### 方法3：使用调试页面
1. 进入小说书架
2. 点击 🔧 调试按钮
3. 点击 **查询云端书籍**

---

## 3️⃣ 本地缓存（解析后的章节）

### 存储位置
**手机本地存储**（`wx.storage`）

### 存储时机
- 点击"阅读"时
- 云函数解析完成后
- 自动保存到本地

### 数据结构
```javascript
// 存储键: novel_shelf
wx.getStorageSync('novel_shelf') = [
  {
    id: 'book_id',
    name: '斗破苍穹',
    author: '天蚕土豆',
    cover: '',
    url: 'cloud://...',  // fileID
    currentChapter: 5,   // 当前阅读到第5章
    addTime: 1732176000000,
    isCloud: true,       // 标记为云端书籍
    
    // 解析后的章节（完整章节数组）
    chapters: [
      {
        id: 0,
        title: '第一章 少年萧炎',
        content: '完整章节内容...',
        link: 'chapter_0'
      },
      {
        id: 1,
        title: '第二章 退婚',
        content: '完整章节内容...',
        link: 'chapter_1'
      },
      // ... 更多章节
    ]
  }
]
```

### 存储特点
- ✅ 离线可读（已解析的章节）
- ✅ 快速加载
- ✅ 自动保存阅读进度
- ⚠️ 占用手机存储空间
- ⚠️ 清除缓存会丢失

---

## 📊 存储容量计算

### 云存储
```
1本TXT小说 ≈ 1MB
1本EPUB小说 ≈ 2-5MB

免费版 2GB = 约 2000本 TXT 或 400-1000本 EPUB
```

### 云数据库
```
1条元数据记录 ≈ 1KB

免费版 2GB = 约 200万条记录
（实际上传不了这么多，会被云存储限制）
```

### 本地缓存
```
1本解析后的小说（100章）≈ 500KB - 2MB

手机存储限制: 通常 10MB 左右
（微信小程序单个 storage 限制）
```

---

## 🔍 完整数据流

### 上传流程
```
1. 用户选择文件（手机）
   ↓
2. wx.cloud.uploadFile
   → 上传到云存储（novels/xxx.txt）
   → 返回 fileID
   ↓
3. db.collection('novels').add
   → 保存元数据到数据库
   → 包含 fileID 关联
```

### 阅读流程
```
1. 用户点击阅读
   ↓
2. 查询数据库获取 fileID
   ↓
3. 调用云函数 parseNovel
   → 云函数下载文件（通过 fileID）
   → 解析 TXT/EPUB
   → 返回章节数组
   ↓
4. 保存章节到本地缓存
   wx.setStorageSync('novel_shelf', ...)
   ↓
5. 渲染阅读页面
```

### 删除流程
```
1. 用户点击删除
   ↓
2. db.collection('novels').doc(id).remove()
   → 删除数据库记录
   ↓
3. wx.cloud.deleteFile({ fileList: [fileID] })
   → 删除云存储文件
   ↓
4. 清除本地缓存（可选）
```

---

## 🛠️ 管理工具

### 1. 在调试页面查询
```
书架 → 🔧 调试 → 查询云端书籍
```

### 2. 云开发控制台
```
https://console.cloud.tencent.com/tcb
→ 选择环境
→ 云存储/数据库
```

### 3. 代码脚本
```javascript
// 查询所有书籍
const db = wx.cloud.database();
const result = await db.collection('novels').get();
console.log('总数:', result.data.length);

// 计算总大小
const totalSize = result.data.reduce((sum, book) => 
  sum + (book.size || 0), 0
);
console.log('总大小:', (totalSize / 1024 / 1024).toFixed(2), 'MB');
```

---

## ⚠️ 注意事项

### 1. 文件同步
- ❌ 云存储和数据库**不会自动同步**
- ✅ 删除记录时需要**同时删除文件**
- ✅ 上传失败时需要**清理已上传文件**

### 2. 存储限制
- 免费版：云存储 2GB，数据库 2GB
- 单文件：建议不超过 10MB
- 本地缓存：建议不超过 10MB

### 3. 权限隔离
- 基于 `_openid` 自动隔离
- 用户A上传的书，用户B看不到
- 不会互相干扰

### 4. 备份建议
- 定期导出云数据库数据
- 重要书籍本地备份
- 云存储有自动备份机制

---

## 📋 查询示例代码

```javascript
// 查询云端书籍总数
const db = wx.cloud.database();
const countResult = await db.collection('novels').count();
console.log('书籍总数:', countResult.total);

// 查询最近上传的5本书
const recentBooks = await db.collection('novels')
  .orderBy('uploadTime', 'desc')
  .limit(5)
  .get();

// 按分类查询
const xuanhuanBooks = await db.collection('novels')
  .where({ category: '玄幻' })
  .get();

// 按格式查询
const epubBooks = await db.collection('novels')
  .where({ format: 'EPUB' })
  .get();

// 查询文件存储位置
recentBooks.data.forEach(book => {
  console.log('书名:', book.name);
  console.log('文件ID:', book.fileID);
  console.log('存储路径:', book.cloudPath);
  console.log('---');
});
```

---

**更新时间**：2025-11-21  
**版本**：v1.0  

需要查看你的云端书籍，请使用调试页面的"查询云端书籍"功能！
