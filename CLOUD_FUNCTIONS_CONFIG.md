# ⚙️ 云函数配置说明

## 🔐 管理员权限配置

以下云函数需要验证管理员权限，部署前需要修改管理员 OpenID：

### 需要修改的文件：

1. **cloudfunctions/deleteBug/index.js**
   ```javascript
   第 13 行：const adminOpenidRequired = '您的管理员OpenID'
   ```

2. **cloudfunctions/updateBugStatus/index.js**
   ```javascript
   第 13 行：const adminOpenidRequired = '您的管理员OpenID'
   ```

3. **cloudfunctions/resetSeasonData/index.js**
   ```javascript
   第 15 行：const ADMIN_OPENIDS = ['您的管理员OpenID'];
   ```

4. **cloudfunctions/communityMessages/index.js**
   ```javascript
   第 276 行：const ADMIN_OPENID = '您的管理员OpenID';
   ```

---

## 📝 如何获取您的 OpenID

1. 在微信开发者工具中运行小程序
2. 登录您的微信账号
3. 打开控制台（Console）
4. 查找类似这样的日志：
   ```
   用户 openid: oVAxOvrxxxxxxxxxx
   ```
5. 复制这个 OpenID

---

## 🚀 部署步骤

### 1. 修改云函数中的管理员 OpenID

在每个云函数中搜索并替换：
- 查找：`oVAxOvrDAY9Q0qG8WBnRxO3_m1nw`
- 替换为：您的实际管理员 OpenID

### 2. 修改小程序配置

确保 `miniprogram/config/env.js` 中的 `adminOpenId` 与云函数中的一致：

```javascript
module.exports = {
  cloudEnvId: 'cloud1-xxxxxxxxx',
  alapiToken: 'your_alapi_token_here',
  adminOpenId: 'your_admin_openid_here', // 与云函数中保持一致
};
```

### 3. 部署云函数

在微信开发者工具中：
1. 右键点击每个云函数目录
2. 选择"上传并部署：云端安装依赖"
3. 等待部署完成

---

## ⚠️ 注意事项

### 为什么云函数需要硬编码管理员 OpenID？

- 云函数运行在服务端，无法访问小程序的配置文件
- 硬编码是确保管理员权限验证的安全方式
- 每个部署者需要使用自己的 OpenID

### 安全建议

1. **不要**将真实的管理员 OpenID 上传到公开仓库
2. 克隆项目后，立即替换为您自己的 OpenID
3. 考虑使用环境变量（云开发环境变量功能）
4. 定期更换管理员账号（如有必要）

---

## 🔄 使用云开发环境变量（推荐）

### 更安全的做法：

1. 在云开发控制台 → 设置 → 环境变量中添加：
   ```
   ADMIN_OPENID = your_admin_openid_here
   ```

2. 修改云函数代码：
   ```javascript
   const adminOpenidRequired = process.env.ADMIN_OPENID
   ```

3. 这样就不需要在代码中硬编码了！

---

## 📞 需要帮助？

如果配置过程中遇到问题，请查看：
- [微信云开发文档](https://developers.weixin.qq.com/miniprogram/dev/wxcloud/basis/getting-started.html)
- 在 GitHub 提交 Issue
- 在小程序内使用 Bug 提交功能
