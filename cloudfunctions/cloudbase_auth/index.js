// 云函数：cloudbase_auth/index.js
// 这是在小程序A（资源方）中创建的云函数

const cloud = require('wx-server-sdk')

// 初始化 cloud
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 云函数入口函数
exports.main = async (event, context) => {
  
  // 授权小程序AppID列表
  // 这里已经填入了你的小程序B的AppID
  const authorizedAppidList = [
    'wxe483fdffc0125104' 
  ]

  // 从函数上下文的 header 中获取来源小程序的 AppID
  const {
    WX_APPID
  } = cloud.getWXContext()

  // 判断来源小程序的 AppID 是否在授权列表中
  if (authorizedAppidList.indexOf(WX_APPID) > -1) {
    // 如果是授权的小程序，则返回 isAuthorized: true
    return {
      isAuthorized: true
    }
  } else {
    // 如果不是授权的小程序，则返回 isAuthorized: false
    return {
      isAuthorized: false
    }
  }
}