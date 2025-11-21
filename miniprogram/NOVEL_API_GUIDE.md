# 小说功能API配置完整指南

## 🚨 当前状态
由于笔趣阁类网站域名频繁失效，当前使用**演示数据模式**。

要使用真实小说数据，需要配置可访问的书源。

---

## 📋 方案一：寻找可用的笔趣阁镜像（推荐）

### 步骤1：测试可用域名

在**浏览器**中逐个测试以下域名，找到能正常访问的：

```
https://www.biqukan.com
https://www.biqugezw.com
https://www.biquge.cc
https://www.xbiquge6.com
https://www.biquge.biz
https://www.biquge.tv
https://www.paoshu8.com
https://www.biquku.com
```

### 步骤2：测试搜索功能

找到可用域名后，在浏览器地址栏测试搜索：

```
https://找到的域名/modules/article/search.php?searchkey=斗破苍穹
```

或

```
https://找到的域名/s.php?s=1&q=斗破苍穹
```

如果返回HTML页面（不是404），说明搜索接口可用。

### 步骤3：修改配置文件

编辑 `F:\CSFC\miniprogram\config\env.js`：

```javascript
novelApiBase: 'https://你找到的可用域名'
```

### 步骤4：修改搜索URL

编辑 `F:\CSFC\miniprogram\utils\novelApi.js`，找到 `searchNovel` 函数中的 `wx.request`，修改 URL：

```javascript
wx.request({
  url: `${config.novelApiBase}/modules/article/search.php`,
  // 或者
  url: `${config.novelApiBase}/s.php`,
  data: {
    searchkey: keyword.trim()  // 或 q: keyword.trim()
  },
  // ...
})
```

### 步骤5：配置小程序后台

在微信公众平台添加该域名到合法域名列表。

---

## 📋 方案二：使用第三方小说API服务

### 免费API服务（需要注册）

1. **聚合数据**
   - 网址：https://www.juhe.cn/
   - 搜索"小说API"
   - 免费版有调用限制

2. **APISpace**
   - 网址：https://www.apispace.com/
   - 提供小说搜索API
   - 需要注册获取密钥

### 使用方法

1. 注册并获取API密钥
2. 查看API文档，了解接口格式
3. 修改 `novelApi.js` 中的 `searchNovel` 函数
4. 在 `env.js` 中保存API密钥

---

## 📋 方案三：自建小说API服务器（高级）

如果你有服务器，可以：

1. 搭建爬虫程序，从笔趣阁抓取数据
2. 建立自己的小说数据库
3. 提供HTTP API接口
4. 小程序调用你的服务器

**参考项目**：
- GitHub搜索：`novel crawler`
- GitHub搜索：`fiction spider`

---

## 🔧 当前演示模式说明

### 搜索功能
返回一条示例数据，提示用户配置真实API。

### 如何切换到真实API
1. 按照上述方案配置API
2. 修改 `novelApi.js` 中的相关函数
3. 测试通过后正常使用

---

## 📝 常见问题

### Q1: 为什么笔趣阁域名经常失效？
A: 版权问题导致网站经常更换域名。

### Q2: 有没有稳定的免费小说API？
A: 真正免费且稳定的API很少，建议：
- 寻找多个笔趣阁镜像作备用
- 使用付费API服务
- 自建服务器

### Q3: 小程序审核时会检查吗？
A: 会检查内容来源，建议：
- 使用有版权的小说源
- 或仅提供公版书籍

### Q4: 能否使用HTTP域名？
A: 不能，小程序要求HTTPS。

---

## 🎯 推荐解决方案（优先级排序）

### 1. 自己测试找可用的笔趣阁（最快）
- 优点：免费，立即可用
- 缺点：不稳定，可能随时失效
- 适合：开发测试阶段

### 2. 使用第三方API服务（最稳定）
- 优点：稳定，有技术支持
- 缺点：需要付费，有调用限制
- 适合：正式上线

### 3. 自建服务器（最灵活）
- 优点：完全可控，无限制
- 缺点：需要技术能力，有成本
- 适合：长期运营

---

## 📞 需要帮助？

如果你找到了可用的笔趣阁域名，告诉我：
1. 域名地址
2. 搜索接口URL格式
3. 返回的HTML结构示例

我可以帮你适配代码！

---

**最后更新：2025-01-21**
