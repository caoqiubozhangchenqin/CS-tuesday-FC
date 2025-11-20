# 💼 换电脑工作指南

## 📋 您的配置文件位置

### 当前电脑上的配置文件：
```
F:\CSFC\miniprogram\config\env.js
```

**重要提醒**：
- ✅ 这个文件包含您的私密配置（云环境ID、API Token、管理员OpenID）
- ✅ 这个文件**不会**被上传到 Git（已在 .gitignore 中排除）
- ⚠️ 换电脑时需要**手动备份**这个文件

---

## 🔄 换电脑修改小程序的完整步骤

### 方式 1：使用 Git（推荐）

#### 📥 **在新电脑上**

1️⃣ **安装必要软件**
```powershell
# 需要安装：
- 微信开发者工具
- Git
```

2️⃣ **克隆项目**
```powershell
# 从 GitHub 克隆
git clone https://github.com/您的用户名/CSFC.git
cd CSFC
```

3️⃣ **复制配置文件**
```powershell
# 方法A：从旧电脑复制 env.js（推荐）
# 将旧电脑的 F:\CSFC\miniprogram\config\env.js 复制到新电脑的对应位置

# 方法B：手动创建（如果没有备份）
cd miniprogram/config
cp env.example.js env.js
# 然后编辑 env.js，填入您的配置信息
```

4️⃣ **修改 project.config.json**
```json
{
  "appid": "wxb0112230d1040cf5"  // 改回您的真实 AppID
}
```

5️⃣ **打开项目**
- 用微信开发者工具打开 CSFC 目录
- 选择"miniprogram"作为小程序根目录
- 点击"编译"运行

6️⃣ **同步云函数**（如果云函数有更新）
- 右键每个云函数 → "下载云端安装的依赖"
- 或者"上传并部署"（如果本地有修改）

---

### 方式 2：直接复制项目文件夹

#### 📦 **备份步骤**

1️⃣ **在旧电脑上打包**
```powershell
# 压缩整个项目文件夹
# 确保包含 miniprogram/config/env.js
Compress-Archive -Path F:\CSFC -DestinationPath F:\CSFC_backup.zip
```

2️⃣ **传输到新电脑**
- 使用 U盘、移动硬盘、网盘等方式传输
- 或者使用局域网共享

3️⃣ **在新电脑上解压**
```powershell
# 解压到任意位置
Expand-Archive -Path CSFC_backup.zip -DestinationPath C:\Projects\CSFC
```

4️⃣ **打开项目**
- 用微信开发者工具打开解压后的目录
- 直接可以运行，无需额外配置

---

## 🔐 配置文件备份清单

### 必须备份的文件：

```
📁 必备文件（包含您的私密配置）
├── miniprogram/config/env.js          ⭐ 最重要！
└── project.config.json                 （如果已修改为真实AppID）

📁 可选备份（方便但可重新获取）
├── cloudfunctions/**/node_modules/     （云函数依赖）
└── miniprogram/miniprogram_npm/       （小程序依赖）
```

### 建议备份方式：

**方式 1：手动备份配置文件**
```powershell
# 在旧电脑上创建配置备份
mkdir F:\CSFC_config_backup
copy F:\CSFC\miniprogram\config\env.js F:\CSFC_config_backup\
copy F:\CSFC\project.config.json F:\CSFC_config_backup\
```

**方式 2：使用云同步（更方便）**
- 将 `env.js` 备份到云盘（OneDrive、百度网盘等）
- 或者加密后存储在密码管理器中

---

## 📝 env.js 配置内容参考

如果丢失了 `env.js`，可以按照以下格式重新创建：

```javascript
// miniprogram/config/env.js
module.exports = {
  // 云开发环境 ID
  // 在微信开发者工具 -> 云开发 -> 设置中查看
  cloudEnvId: 'cloud1-3ge5gomsffe800a7',

  // ALAPI 天气接口 Token
  // 在 https://alapi.cn/ 个人中心查看
  alapiToken: 'vkomdiv5oewmjg2jfqyxbjxjsrggdr',

  // 管理员 OpenID
  // 登录小程序后在控制台查看
  adminOpenId: 'oVAxOvrDAY9Q0qG8WBnRxO3_m1nw',
};
```

**如何找回这些信息？**
- **cloudEnvId**：登录微信云开发控制台查看
- **alapiToken**：登录 ALAPI 网站查看
- **adminOpenId**：在小程序中登录，控制台会打印

---

## 🔄 多台电脑同步工作流程

### 推荐的工作流程：

1️⃣ **在电脑 A 上修改代码**
```powershell
git add .
git commit -m "修改了XXX功能"
git push
```

2️⃣ **切换到电脑 B**
```powershell
git pull  # 拉取最新代码
# env.js 会自动保留（不会被覆盖，因为在 .gitignore 中）
```

3️⃣ **第一次在新电脑上**
- 只需要复制一次 `env.js`
- 之后每次 `git pull` 都不会影响它

---

## ⚠️ 常见问题

### Q1: 忘记备份 env.js 怎么办？
A: 可以重新创建，但需要找回三个信息：
- 云环境 ID：微信云开发控制台
- ALAPI Token：ALAPI 网站个人中心
- 管理员 OpenID：重新登录小程序查看控制台

### Q2: 多台电脑的 env.js 需要一样吗？
A: 是的！配置信息应该一样，否则会访问不同的云环境。

### Q3: project.config.json 需要备份吗？
A: 如果您已经修改了 AppID，建议备份。或者记住 AppID，换电脑时重新填写。

### Q4: 云函数需要重新部署吗？
A: 不需要！云函数部署在云端，所有电脑共享。除非您修改了云函数代码。

---

## 📱 快速恢复检查清单

换到新电脑后，检查以下项目：

- [ ] 已安装微信开发者工具
- [ ] 已安装 Git
- [ ] 已克隆/复制项目代码
- [ ] 已复制 `miniprogram/config/env.js`
- [ ] 已修改 `project.config.json` 中的 AppID（如需要）
- [ ] 打开微信开发者工具能正常编译
- [ ] 天气功能正常（验证 ALAPI Token）
- [ ] 管理员功能正常（验证 OpenID）

---

## 💡 最佳实践建议

### 1. 使用密码管理器
将 `env.js` 的内容保存在密码管理器中（如 1Password、Bitwarden）

### 2. 使用云同步服务
将配置文件备份到：
- OneDrive
- Google Drive  
- 百度网盘（加密压缩）

### 3. 定期备份
每次修改配置后，立即备份到云端

### 4. 使用 Git 私有仓库
如果是个人项目，可以考虑使用私有仓库，这样 `env.js` 也可以上传（但不推荐）

---

## 📞 需要帮助？

如果在换电脑过程中遇到问题：
1. 查看 README.md 中的"常见问题"章节
2. 查看 GIT_UPLOAD_GUIDE.md
3. 在 GitHub 仓库提交 Issue

---

**祝您在新电脑上开发顺利！⚽💻**
