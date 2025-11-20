// 环境配置文件示例
// 使用方法：
// 1. 复制此文件为 env.js
// 2. 填入您自己的配置信息
// 3. env.js 已在 .gitignore 中，不会被上传到 Git

module.exports = {
  // 微信云开发环境 ID
  // 获取方式：在微信开发者工具 -> 云开发控制台 -> 设置 -> 环境 ID
  cloudEnvId: 'cloud1-xxxxxxxxx',

  // ALAPI 天气接口 Token
  // 获取方式：https://alapi.cn/ 注册并在个人中心获取
  alapiToken: 'your_alapi_token_here',

  // 管理员 OpenID
  // 获取方式：在小程序中登录后，在控制台查看或从数据库获取
  adminOpenId: 'your_admin_openid_here',

  // 其他 API 配置可以在这里添加
  // 例如：天行数据 API Key 等
};
