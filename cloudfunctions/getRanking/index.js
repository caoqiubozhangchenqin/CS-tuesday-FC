const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  try {
    const ranking = await db.collection('users')
      .orderBy('total_value', 'desc')
      .get()

    return {
      success: true,
      data: ranking.data
    }
  } catch (err) {
    console.error(err)
    return {
      success: false,
      message: '获取排名失败'
    }
  }
}