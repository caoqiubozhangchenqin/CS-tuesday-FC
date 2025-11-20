# 🚀 CSFC 小程序 - 快速参考卡

## 📍 您的配置文件位置
```
F:\CSFC\miniprogram\config\env.js
```
**⚠️ 这个文件不会上传到 Git，换电脑时需要手动备份！**

---

## 🔑 您的项目信息

### GitHub 仓库
```
https://github.com/caoqiubozhangchenqin/CS-tuesday-FC
```

### 分支
```
yesterday-snapshot
```

### 小程序 AppID（真实的，不要公开）
```
wxb0112230d1040cf5
```

---

## 💻 换电脑步骤（5分钟搞定）

### 方式 1：从 Git 克隆（推荐）

```powershell
# 1. 克隆项目
git clone https://github.com/caoqiubozhangchenqin/CS-tuesday-FC.git
cd CS-tuesday-FC

# 2. 切换到您的分支
git checkout yesterday-snapshot

# 3. 复制配置文件（从旧电脑或备份）
# 将 env.js 放到：miniprogram/config/env.js

# 4. 修改 project.config.json
# 将 "appid": "wxYOUR_APPID_HERE" 改为 "wxb0112230d1040cf5"

# 5. 打开微信开发者工具，选择 CS-tuesday-FC 文件夹
# 完成！
```

### 方式 2：直接复制（最简单）

```powershell
# 1. 打包整个项目文件夹
Compress-Archive -Path F:\CSFC -DestinationPath F:\CSFC_backup.zip

# 2. 复制到新电脑（U盘/网盘）

# 3. 在新电脑解压即可使用
```

---

## 📝 env.js 内容备份（妥善保管）

```javascript
// miniprogram/config/env.js
module.exports = {
  cloudEnvId: 'cloud1-3ge5gomsffe800a7',
  alapiToken: 'vkomdiv5oewmjg2jfqyxbjxjsrggdr',
  adminOpenId: 'oVAxOvrDAY9Q0qG8WBnRxO3_m1nw',
};
```

**建议**：
- 保存到密码管理器
- 备份到云盘（加密）
- 打印一份纸质备份

---

## 🔄 日常 Git 操作

### 提交更改
```powershell
cd F:\CSFC
git add .
git commit -m "描述您的修改"
git push
```

### 在新电脑上拉取更新
```powershell
cd 项目目录
git pull
# env.js 会保留，不用担心被覆盖
```

---

## 🆘 紧急找回配置

### 如果忘记了 env.js 内容：

1. **cloudEnvId（云环境ID）**
   - 登录：https://console.cloud.tencent.com/tcb
   - 查看环境列表

2. **alapiToken（天气API）**
   - 登录：https://alapi.cn/
   - 个人中心 → API Token

3. **adminOpenId（管理员ID）**
   - 在小程序中登录
   - 打开微信开发者工具控制台
   - 查看打印的 openid

---

## 📚 完整文档

- **项目说明**：README.md
- **Git 上传指南**：GIT_UPLOAD_GUIDE.md
- **换电脑详细步骤**：SWITCH_COMPUTER_GUIDE.md
- **云函数配置**：CLOUD_FUNCTIONS_CONFIG.md

---

## ✅ 检查清单

### 上传前检查
```powershell
.\pre-upload-check.ps1
```

### 换电脑后检查
- [ ] 已复制 env.js
- [ ] 已修改 AppID
- [ ] 能正常编译
- [ ] 天气功能正常
- [ ] 管理员功能正常

---

## 📞 快速联系

- **GitHub 仓库 Issues**：https://github.com/caoqiubozhangchenqin/CS-tuesday-FC/issues
- **小程序内 Bug 提交功能**

---

**💡 提示**：将此文件保存到云盘或打印出来，方便随时查看！
