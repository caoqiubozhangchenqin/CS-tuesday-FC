const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  try {
    const teams = await db.collection('teams').get()
    
    return {
      success: true,
      data: teams.data
    }
  } catch (err) {
    console.error('获取球队列表失败:', err)
    return {
      success: false,
      message: '获取球队列表失败',
      error: err
    }
  }
}