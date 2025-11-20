# 网络连接问题排查指南

## 🔴 常见错误

### ERR_CONNECTION_RESET
```
GET https://raw.githubusercontent.com/openfootball/football.json/master/2016-17/en.1.json 
net::ERR_CONNECTION_RESET
```

这个错误表示网络连接被重置，通常是因为：
1. ❌ GitHub Raw 链接在国内访问不稳定
2. ❌ 网络防火墙或代理拦截
3. ❌ DNS 解析问题

---

## ✅ 已实施的解决方案

### 1. 多数据源自动切换

小程序已配置多个数据源，会自动尝试：

```javascript
// 优先级顺序：
1. GitHub 官方源（国外访问快）
2. ghproxy.com 镜像（国内加速）
3. mirror.ghproxy.com 备用镜像
```

**工作原理**：
- 🔄 自动尝试第一个源
- ⏱️ 10秒超时后自动切换到下一个源
- ✅ 只要有一个源可用即可加载成功

### 2. 智能重试机制

- 🔄 失败后自动尝试下一个数据源
- 🔘 提供"重试"按钮手动重新加载
- 📊 控制台输出详细日志便于调试

### 3. 友好的错误提示

```
❌ 所有源都失败 → "数据加载失败，请检查网络连接或稍后重试"
⚠️ 无数据 → "该赛季暂无数据"
```

---

## 🛠️ 开发环境配置

### 微信开发者工具设置

1. **不校验合法域名**（必须）
   ```
   详情 → 本地设置 → ☑️ 不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书
   ```

2. **不校验请求域名**（必须）
   ```
   详情 → 本地设置 → ☑️ 不校验请求域名以及 TLS 版本
   ```

3. **project.config.json 配置**
   ```json
   {
     "setting": {
       "urlCheck": false
     }
   }
   ```

### 生产环境配置

上线前需要在**微信公众平台**配置服务器域名：

1. 登录 [微信公众平台](https://mp.weixin.qq.com/)
2. 开发 → 开发管理 → 开发设置 → 服务器域名
3. 添加以下域名到 **request合法域名**：
   ```
   https://raw.githubusercontent.com
   https://ghproxy.com
   https://mirror.ghproxy.com
   ```

---

## 🔧 手动排查步骤

### 步骤1：检查网络连接

在浏览器中测试数据源是否可访问：

```
https://raw.githubusercontent.com/openfootball/football.json/master/2023-24/en.1.json
```

- ✅ **可以打开** → 说明网络正常，可能是小程序配置问题
- ❌ **无法打开** → 网络问题，尝试使用代理或镜像源

### 步骤2：查看控制台日志

打开微信开发者工具的控制台（Console），查看日志：

```javascript
// 正常日志：
加载历史赛季数据，尝试多个数据源... [Array(3)]
尝试数据源 1/3: https://raw.githubusercontent.com/...
联赛数据响应: {statusCode: 200, data: {...}}
数据加载成功！积分榜: [Array(20)]

// 失败日志：
数据源 1 加载失败: {errMsg: "request:fail"}
尝试数据源 2/3: https://ghproxy.com/...
```

### 步骤3：检查配置文件

确认 `miniprogram/config/env.js` 中配置正确：

```javascript
openFootballSources: [
  'https://raw.githubusercontent.com/openfootball/football.json/master',
  'https://ghproxy.com/https://raw.githubusercontent.com/openfootball/football.json/master',
  'https://mirror.ghproxy.com/https://raw.githubusercontent.com/openfootball/football.json/master'
]
```

### 步骤4：清除缓存

有时缓存会导致问题：

```
微信开发者工具 → 清缓存 → 全部清除 → 重新编译
```

---

## 🌐 使用代理（临时方案）

如果所有镜像源都无法访问，可以临时使用代理：

### 方案1：系统代理

1. 启动科学上网工具
2. 确保系统代理已开启
3. 重启微信开发者工具

### 方案2：修改 hosts 文件

添加 GitHub 加速 DNS：

```
# 在 C:\Windows\System32\drivers\etc\hosts 添加：
185.199.108.133 raw.githubusercontent.com
185.199.109.133 raw.githubusercontent.com
185.199.110.133 raw.githubusercontent.com
185.199.111.133 raw.githubusercontent.com
```

**⚠️ 注意**：需要管理员权限编辑 hosts 文件

---

## 📊 测试数据源可用性

在控制台运行以下代码测试：

```javascript
// 测试 GitHub 官方源
wx.request({
  url: 'https://raw.githubusercontent.com/openfootball/football.json/master/2023-24/en.1.json',
  success: res => console.log('✅ GitHub 官方源可用', res.statusCode),
  fail: err => console.log('❌ GitHub 官方源不可用', err)
});

// 测试镜像源
wx.request({
  url: 'https://ghproxy.com/https://raw.githubusercontent.com/openfootball/football.json/master/2023-24/en.1.json',
  success: res => console.log('✅ ghproxy 镜像可用', res.statusCode),
  fail: err => console.log('❌ ghproxy 镜像不可用', err)
});
```

---

## 🆘 仍然无法解决？

### 1. 使用本地数据（终极方案）

如果网络始终不稳定，可以考虑：

1. **下载数据到本地**
   ```bash
   git clone https://github.com/openfootball/football.json.git
   ```

2. **将数据文件放入小程序**
   ```
   miniprogram/data/football/
     ├── 2023-24/
     │   ├── en.1.json
     │   ├── de.1.json
     │   └── ...
     └── 2022-23/
         └── ...
   ```

3. **修改代码读取本地数据**

### 2. 搭建自己的数据服务

如果经常使用，可以：

1. 搭建自己的数据API服务器
2. 定期从 GitHub 同步数据
3. 将数据托管到国内服务器（阿里云、腾讯云等）

### 3. 使用云函数代理

创建云函数来请求数据：

```javascript
// cloudfunctions/getFootballData/index.js
const cloud = require('wx-server-sdk');
const axios = require('axios');

exports.main = async (event) => {
  const { season, league } = event;
  const url = `https://raw.githubusercontent.com/.../master/${season}/${league}.json`;
  const response = await axios.get(url);
  return response.data;
};
```

**优点**：
- ✅ 云函数服务器网络更稳定
- ✅ 可以添加缓存机制
- ✅ 不受小程序域名限制

---

## 📝 更新日志

### 2025-11-20
- ✅ 添加多数据源自动切换机制
- ✅ 配置文件中管理数据源列表
- ✅ 增加10秒超时设置
- ✅ 改进错误提示和重试功能

---

## 💡 建议

1. **开发环境**：关闭域名校验，使用所有数据源
2. **测试环境**：开启域名校验，确保配置正确
3. **生产环境**：提前测试网络稳定性，必要时使用云函数

**当前实现已经能够自动处理大部分网络问题，只需等待自动重试即可！** 🎯
