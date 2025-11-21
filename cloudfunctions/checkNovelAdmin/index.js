// 云函数：检查小说管理员权限
const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

// 管理员 OpenID 列表（可以有多个管理员）
const ADMIN_OPENIDS = [
  'oVAxOvrDAY9Q0qG8WBnRxO3_m1nw' // 主管理员
  // 可以添加更多管理员的 openid
];

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const userOpenid = wxContext.OPENID;

  console.log('检查权限 - 用户:', userOpenid);

  // 检查是否为管理员
  const isAdmin = ADMIN_OPENIDS.includes(userOpenid);

  return {
    isAdmin: isAdmin,
    openid: userOpenid
  };
};
