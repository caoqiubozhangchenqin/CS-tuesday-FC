// 环境配置文件示例
// 使用方法：
// 1. 复制此文件为 env.js
// 2. 填入您自己的配置信息
// 3. env.js 已在 .gitignore 中，不会被上传到 Git

module.exports = {
  // 微信小程序 AppID
  // 获取方式：微信公众平台 -> 开发 -> 开发管理 -> 开发设置 -> AppID
  appId: 'wxYOUR_APPID_HERE',

  // 微信云开发环境 ID
  // 获取方式：在微信开发者工具 -> 云开发控制台 -> 设置 -> 环境 ID
  cloudEnvId: 'cloud1-xxxxxxxxx',

  // ALAPI 天气接口 Token
  // 获取方式：https://alapi.cn/ 注册并在个人中心获取
  alapiToken: 'your_alapi_token_here',

  // 管理员 OpenID
  // 获取方式：在小程序中登录后，在控制台查看或从数据库获取
  adminOpenId: 'your_admin_openid_here',
  
  // OpenFootball 数据源配置（多个镜像源，按优先级排序）
  openFootballSources: [
    'https://raw.githubusercontent.com/openfootball/football.json/master',
    'https://ghproxy.com/https://raw.githubusercontent.com/openfootball/football.json/master',
    'https://mirror.ghproxy.com/https://raw.githubusercontent.com/openfootball/football.json/master'
  ]
};
