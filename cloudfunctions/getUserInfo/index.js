const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  try {
    const user = await db.collection('users').where({
      openid: openid
    }).get()

    if (user.data.length > 0) {
      return {
        success: true,
        data: user.data[0]
      }
    } else {
      return {
        success: false,
        message: '用户数据不存在'
      }
    }

  } catch (err) {
    console.error(err)
    return {
      success: false,
      message: '查询失败'
    }
  }
}