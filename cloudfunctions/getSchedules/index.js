// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    // 查询schedules集合，并按比赛日期升序排序
    const res = await db.collection('schedules')
      .orderBy('round', 'asc')
      .orderBy('matchDate', 'asc')
      .get()
      
    // 返回查询到的数据
    return res.data
  } catch (e) {
    console.error(e)
    return [] // 如果出错，返回一个空数组
  }
}