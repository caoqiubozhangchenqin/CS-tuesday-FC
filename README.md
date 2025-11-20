# ⚽ 常熟足球俱乐部小程序 (CSFC)

一个功能完整的足球俱乐部管理微信小程序，包含用户评估、球队管理、赛程积分、社区互动等功能。

## 📱 功能特性

### 🎯 核心功能
- **用户评估系统**：通过问卷评估用户身价
- **球队管理**：球队选择、签约、解约功能
- **排行榜**：身价排行榜（分页加载，50条/页）
- **赛程管理**：查看联赛赛程和积分榜
- **每日签到**：签到系统（需身价 ≥ 50）
- **社区留言板**：点赞、按时间/热度排序

### 🌍 数据展示
- **天气预报**：常熟7天天气（ALAPI v3 接口）
- **欧洲五大联赛**：积分榜和赛程
- **Bug提交系统**：用户反馈管理

### 👨‍💼 管理功能
- 管理员后台
- 队长管理面板
- Bug状态管理

---

## 🚀 快速开始

### 前置要求

- 微信开发者工具（建议版本 >= 1.06.0）
- 已注册的微信小程序账号
- 开通微信云开发服务

### 1️⃣ 克隆项目

```bash
git clone https://github.com/你的用户名/CSFC.git
cd CSFC
```

### 2️⃣ 配置环境变量

1. 进入 `miniprogram/config/` 目录
2. 复制 `env.example.js` 为 `env.js`：
   ```bash
   cp miniprogram/config/env.example.js miniprogram/config/env.js
   ```
3. 修改 `env.js`，填入您自己的配置：

```javascript
module.exports = {
  // 微信小程序 AppID（在微信公众平台 -> 开发 -> 开发设置中获取）
  appId: 'wxYOUR_APPID_HERE',

  // 云开发环境 ID（在微信开发者工具 -> 云开发 -> 设置中获取）
  cloudEnvId: 'cloud1-xxxxxxxxx',

  // ALAPI 天气接口 Token（在 https://alapi.cn/ 注册获取）
  alapiToken: 'your_alapi_token_here',

  // 管理员 OpenID（登录小程序后在控制台查看）
  adminOpenId: 'your_admin_openid_here',
};
```

### 3️⃣ 修改小程序配置

修改 `project.config.json` 中的 `appid` 为您自己的小程序 AppID：

```json
{
  "appid": "你的小程序AppID"
}
```

> ⚠️ **注意**：AppID 需要在 `env.js` 和 `project.config.json` 中都填写相同的值。

### 4️⃣ 部署云函数

1. 在微信开发者工具中打开项目
2. 点击"云开发"按钮，创建云开发环境
3. 右键点击 `cloudfunctions` 目录下的每个云函数，选择"上传并部署：云端安装依赖"

需要部署的云函数：
- `calculateStandings` - 计算积分榜
- `cancelJoinTeam` - 取消加入球队
- `communityMessages` - 社区留言管理
- `deleteBug` - 删除Bug
- `getAdminDetails` - 获取管理员详情
- `getAllTeams` - 获取所有球队
- `getRanking` - 获取排行榜
- `getSchedules` - 获取赛程
- `getUserInfo` - 获取用户信息
- `getUserInterestedTeams` - 获取用户感兴趣的球队
- `getUserSelectedTeam` - 获取用户选择的球队
- `initBugsCollection` - 初始化Bug集合
- `joinTeam` - 加入球队
- `login` - 登录
- `messageBoard` - 留言板
- `resetSeasonData` - 重置赛季数据
- `saveUserInfo` - 保存用户信息
- `signIn` - 签到
- `submitAnswers` - 提交答案
- `updateBugStatus` - 更新Bug状态

### 5️⃣ 初始化数据库

在云开发控制台中创建以下集合：

- `users` - 用户信息
- `teams` - 球队信息
- `schedules` - 赛程
- `standings` - 积分榜
- `messages` - 留言板消息
- `bugs` - Bug反馈
- `signInRecords` - 签到记录

### 6️⃣ 运行项目

1. 在微信开发者工具中点击"编译"
2. 如果一切配置正确，小程序将正常运行

---

## 📂 项目结构

```
CSFC/
├── cloudfunctions/          # 云函数目录
│   ├── calculateStandings/
│   ├── getRanking/
│   ├── signIn/
│   └── ...
├── miniprogram/            # 小程序主目录
│   ├── components/         # 自定义组件
│   │   └── bg/            # 背景组件
│   ├── config/            # 配置文件
│   │   ├── env.js         # 环境配置（不上传）
│   │   └── env.example.js # 配置模板
│   ├── images/            # 图片资源
│   ├── pages/             # 页面文件
│   │   ├── index/         # 首页
│   │   ├── ranking/       # 排行榜
│   │   ├── schedule/      # 赛程
│   │   ├── community/     # 社区
│   │   ├── admin/         # 管理员页面
│   │   └── ...
│   ├── utils/             # 工具函数
│   ├── app.js             # 小程序入口
│   ├── app.json           # 全局配置
│   └── app.wxss           # 全局样式
├── .gitignore             # Git忽略文件
├── project.config.json    # 项目配置
└── README.md             # 项目文档
```

---

## 🔑 环境变量说明

### cloudEnvId
云开发环境 ID，在微信开发者工具的云开发控制台中获取。

**获取方式**：
1. 打开微信开发者工具
2. 点击"云开发"按钮
3. 在设置页面找到"环境 ID"

### alapiToken
ALAPI 天气接口的访问令牌。

**获取方式**：
1. 访问 [https://alapi.cn/](https://alapi.cn/)
2. 注册账号并登录
3. 在个人中心获取 Token
4. 订阅"天气查询"接口（有免费额度）

### adminOpenId
管理员的微信 OpenID，用于权限控制。

**获取方式**：
1. 在小程序中登录
2. 在控制台查看打印的 openid
3. 或在云开发数据库的 `users` 集合中查找

---

## 🛠️ 常见问题

### Q: 天气数据显示失败？
A: 检查以下几点：
1. `env.js` 中的 `alapiToken` 是否正确
2. ALAPI 账号是否订阅了"天气查询"接口
3. 接口额度是否用完

### Q: 云函数调用失败？
A: 
1. 确认所有云函数已正确部署
2. 检查云函数的环境 ID 是否与 `env.js` 中的一致
3. 查看云函数日志排查错误

### Q: 管理员功能无法使用？
A: 确保 `env.js` 中的 `adminOpenId` 是您当前登录用户的 OpenID。

### Q: 如何获取我的 OpenID？
A: 
1. 在小程序中登录
2. 打开微信开发者工具的控制台
3. 查找类似 "用户 openid: oVAxOvr..." 的日志

---

## 🔐 安全注意事项

### ⚠️ 重要提醒

1. **不要**将 `miniprogram/config/env.js` 上传到 Git
2. **不要**在代码中硬编码任何密钥、Token、AppID
3. **不要**将 `project.config.json` 中的真实 AppID 上传（或使用占位符）
4. 定期更换 API Token
5. 妥善保管管理员 OpenID

### 已配置的安全措施

- ✅ `.gitignore` 已排除敏感文件
- ✅ 使用配置文件管理敏感信息
- ✅ 提供了配置文件示例（`env.example.js`）

---

## 📝 开发指南

### 添加新页面

1. 在 `miniprogram/pages/` 下创建新目录
2. 在 `app.json` 的 `pages` 数组中添加路径
3. 编写页面逻辑和样式

### 添加新云函数

1. 在 `cloudfunctions/` 下创建新目录
2. 在目录中创建 `index.js` 和 `package.json`
3. 右键点击云函数目录，选择"上传并部署"

### 修改背景图

背景图存储在云存储中，路径格式：
```
cloud://环境ID/csfc_bg/图片名称.png
```

---

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

### 提交代码前请确保：

1. 代码风格统一
2. 测试功能正常
3. 更新相关文档
4. 不包含敏感信息

---

## 📄 许可证

MIT License

---

## 👥 联系方式

如有问题，欢迎通过以下方式联系：

- GitHub Issues: [提交问题](https://github.com/你的用户名/CSFC/issues)
- 微信小程序内的 Bug 提交功能

---

## 🎉 致谢

感谢以下服务提供商：

- [微信云开发](https://developers.weixin.qq.com/miniprogram/dev/wxcloud/basis/getting-started.html)
- [ALAPI](https://alapi.cn/) - 天气数据接口
- [桑德兰足球俱乐部](https://www.safc.com/) - 设计灵感

---

## 📊 版本历史

### v1.0.0 (2025-11-20)
- ✨ 初始版本发布
- 🎯 用户评估系统
- ⚽ 球队管理功能
- 📊 排行榜和赛程
- 🌤️ 天气预报集成
- 💬 社区留言板
- 🐛 Bug提交系统

---

**⚽ 享受您的足球俱乐部管理之旅！**
