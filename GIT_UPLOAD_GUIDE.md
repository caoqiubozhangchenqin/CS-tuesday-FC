# 🚀 Git 上传和分享指南

## ✅ 完成的安全配置

我们已经为您的小程序配置了以下安全措施：

1. ✅ 创建了 `.gitignore` 文件，排除敏感信息
2. ✅ 将硬编码的配置移至 `miniprogram/config/env.js`
3. ✅ 提供了配置文件模板 `env.example.js`
4. ✅ 编写了完整的 README.md 文档

---

## 📋 上传前检查清单

### 🔴 必须完成（否则会泄露敏感信息）

- [ ] 确认 `.gitignore` 文件存在
- [ ] 确认 `miniprogram/config/env.js` 不会被上传（已在 .gitignore 中）
- [ ] 修改 `project.config.json` 中的 `appid` 为占位符

### 🟡 建议完成

- [ ] 删除或忽略备份文件夹（如 `备份/`、`temp_background_files/`）
- [ ] 删除测试文件（如 `test-cloud-function.js`）
- [ ] 清理个人文件夹（翻墙、视频、我的文档等）

---

## 🎯 立即执行：修改 project.config.json

**当前问题**：`project.config.json` 包含您的真实小程序 AppID (`wxb0112230d1040cf5`)

**解决方案 1（推荐）**：使用占位符
```json
{
  "appid": "wxYOUR_APPID_HERE"
}
```

**解决方案 2**：将此文件加入 .gitignore
```bash
# 在 .gitignore 中添加
project.config.json
```
然后提供 `project.config.example.json` 模板。

---

## 📤 Git 上传步骤

### 1️⃣ 初始化 Git 仓库

```powershell
cd f:\CSFC

# 初始化 Git
git init

# 添加所有文件（.gitignore 会自动排除敏感文件）
git add .

# 提交
git commit -m "🎉 Initial commit: CSFC 足球俱乐部小程序"
```

### 2️⃣ 创建 GitHub 仓库

1. 访问 [https://github.com/new](https://github.com/new)
2. 填写仓库信息：
   - Repository name: `CSFC` 或 `CS-tuesday-FC`
   - Description: `⚽ 常熟足球俱乐部微信小程序`
   - 选择 **Public**（公开）或 **Private**（私有）
   - **不要**勾选 "Initialize with README"（我们已经有了）
3. 点击 "Create repository"

### 3️⃣ 关联远程仓库并推送

```powershell
# 添加远程仓库（替换为您的仓库地址）
git remote add origin https://github.com/您的用户名/CSFC.git

# 推送代码
git branch -M main
git push -u origin main
```

### 4️⃣ 验证上传结果

在 GitHub 上检查：
- ✅ 确认 `miniprogram/config/env.js` **没有**被上传
- ✅ 确认 `miniprogram/config/env.example.js` 已上传
- ✅ 确认 `.gitignore` 已上传
- ✅ 确认 `README.md` 显示正常

---

## 🤝 分享给朋友

### 方式 1：直接发送仓库链接

```
https://github.com/您的用户名/CSFC
```

### 方式 2：提供完整说明

发送以下信息给您的朋友：

```
【CSFC 足球俱乐部小程序】

📦 项目地址：https://github.com/您的用户名/CSFC

🚀 快速开始：
1. 克隆项目：git clone https://github.com/您的用户名/CSFC.git
2. 复制配置：cp miniprogram/config/env.example.js miniprogram/config/env.js
3. 填写配置信息（云环境ID、ALAPI Token等）
4. 修改 project.config.json 中的 appid
5. 部署云函数
6. 运行项目

📚 详细文档请查看 README.md
```

### 方式 3：邀请协作者

如果是私有仓库，需要邀请朋友：
1. 在 GitHub 仓库页面点击 "Settings"
2. 点击 "Collaborators"
3. 输入朋友的 GitHub 用户名
4. 点击 "Add collaborator"

---

## 🔧 朋友需要做的配置

您的朋友克隆项目后需要：

### 1. 创建配置文件
```powershell
cd CSFC/miniprogram/config
cp env.example.js env.js
```

### 2. 修改 `env.js`
```javascript
module.exports = {
  cloudEnvId: '他们自己的云环境ID',
  alapiToken: '他们自己的 ALAPI Token',
  adminOpenId: '他们自己的 OpenID',
};
```

### 3. 修改 `project.config.json`
```json
{
  "appid": "他们自己的小程序AppID"
}
```

### 4. 部署云函数
在微信开发者工具中，右键每个云函数 → "上传并部署"

---

## ⚠️ 安全提醒

### 给您的朋友强调：

1. **不要**将自己的 `env.js` 上传到 Git
2. **不要**在公开场合分享 API Token
3. 如果 Fork 了您的项目，同样需要配置 .gitignore
4. 定期检查 GitHub 是否泄露了敏感信息

---

## 🔍 检查是否泄露敏感信息

### 方法 1：使用 GitHub 搜索
在您的仓库中搜索：
- `vkomdiv5oewmjg2jfqyxbjxjsrggdr`（ALAPI Token）
- `cloud1-3ge5gomsffe800a7`（云环境ID）
- `wxb0112230d1040cf5`（AppID）

**如果搜索到任何结果，说明有信息泄露！**

### 方法 2：使用命令行
```powershell
# 在本地检查将要上传的文件
git ls-files | Select-String "env.js"
# 应该只显示 env.example.js，不应该有 env.js

# 检查暂存区
git status
```

---

## 🆘 如果不小心上传了敏感信息

### 立即行动：

1. **删除敏感文件**
```powershell
git rm --cached miniprogram/config/env.js
git commit -m "Remove sensitive config file"
git push
```

2. **更换所有密钥**
- 重新生成 ALAPI Token
- 考虑更换云开发环境
- 重新设置管理员权限

3. **清理历史记录（高级）**
```powershell
# 使用 BFG Repo-Cleaner 或 git filter-branch
# 这会重写整个 Git 历史
```

---

## ✅ 最终检查

在推送到 GitHub 之前，运行：

```powershell
# 查看将要上传的文件
git status

# 查看具体修改内容
git diff --cached

# 确认没有敏感信息后再推送
git push
```

---

## 📞 需要帮助？

如果遇到问题，可以：
1. 查看 README.md 中的"常见问题"
2. 在 GitHub 仓库提交 Issue
3. 在小程序内使用 Bug 提交功能

---

**祝您和朋友的开发顺利！⚽🎉**
