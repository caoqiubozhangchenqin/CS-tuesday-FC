const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { teamId } = event

  try {
    // 清空用户的已选球队
    await db.collection('users').where({
      openid: openid
    }).update({
      data: {
        selectedTeam: '' // 清空用户的已选球队
      }
    });

    return {
      success: true,
      message: '取消报名成功！'
    };

  } catch (err) {
    console.error(err);
    return {
      success: false,
      message: '取消报名失败，请重试'
    };
  }
}