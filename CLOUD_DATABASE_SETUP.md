# 云数据库初始化指南

## 📦 创建 novels 数据库集合

### 方法一：通过云开发控制台（推荐）

1. **打开云开发控制台**
   - 在微信开发者工具中，点击顶部菜单：`云开发` → `云开发控制台`
   - 或直接访问：https://console.cloud.tencent.com/tcb

2. **创建数据库集合**
   - 点击左侧菜单 `数据库`
   - 点击 `集合名称` 标签页旁的 `+` 号
   - 输入集合名称：`novels`
   - 点击 `确定`

3. **配置权限**（可选但推荐）
   - 选择刚创建的 `novels` 集合
   - 点击 `权限设置`
   - 选择自定义权限，设置规则：
   ```json
   {
     "read": true,
     "write": "doc._openid == auth.openid || get('database.novels._id', auth.openid).adminOpenId == auth.openid"
   }
   ```
   - 这样所有用户都可以读取，但只有上传者和管理员可以修改/删除

### 方法二：通过云函数初始化

创建一个临时云函数来初始化数据库：

```javascript
// cloudfunctions/initDatabase/index.js
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  try {
    // 创建 novels 集合（如果不存在）
    // 注意：腾讯云微信小程序不支持通过代码创建集合
    // 必须在控制台手动创建
    
    return {
      success: false,
      message: '请在云开发控制台手动创建 novels 集合'
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}
```

## 📊 novels 集合数据结构

创建集合后，上传书籍时会自动添加以下字段：

```javascript
{
  _id: "自动生成的ID",
  _openid: "上传者的openid（自动）",
  name: "书籍名称",
  author: "作者",
  intro: "简介",
  category: "分类",
  format: "TXT|EPUB",
  fileID: "云存储文件ID",
  cloudPath: "云存储路径",
  size: 文件大小(字节),
  sizeText: "格式化的大小",
  cover: "封面图URL（可选）",
  uploadTime: 时间戳
}
```

## 🔍 验证集合是否创建成功

### 方法一：在控制台查看
1. 打开云开发控制台
2. 点击 `数据库`
3. 确认 `novels` 集合存在

### 方法二：通过小程序测试
1. 编译运行小程序
2. 进入 `小说列表` 页面
3. 如果不再报错 `-502005`，说明创建成功

## 📤 上传测试书籍

集合创建成功后：

1. **进入小说列表页面**
   - 管理员账号会看到 `📤 上传` 按钮

2. **上传书籍**
   - 点击上传按钮
   - 选择 TXT 或 EPUB 文件
   - 填写书籍信息
   - 点击上传

3. **验证**
   - 返回小说列表
   - 应该能看到刚上传的书籍
   - 在云开发控制台的 novels 集合中也能看到记录

## ⚠️ 常见问题

### Q: 创建集合后仍然报错？
A: 
1. 确认环境ID是否正确（config/env.js 中的 cloudEnvId）
2. 尝试重新编译小程序
3. 检查云开发环境是否已开通

### Q: 无法上传书籍？
A:
1. 确认是否为管理员账号（config/env.js 中的 adminOpenId）
2. 检查云存储是否已启用
3. 查看控制台错误信息

### Q: 如何查看我的 openid？
A:
1. 在小程序任意页面打开调试器
2. 在 Console 中输入：`getApp().globalData.openid`
3. 复制显示的 openid 到 config/env.js

## 🎯 下一步

集合创建完成后，您就可以：
- ✅ 查看小说列表
- ✅ 上传新书籍（管理员）
- ✅ 阅读书籍
- ✅ 删除书籍（管理员）

---

**环境信息**
- 云环境ID: cloud1-3ge5gomsffe800a7
- 管理员OpenID: oVAxOvrDAY9Q0qG8WBnRxO3_m1nw
- 集合名称: novels
