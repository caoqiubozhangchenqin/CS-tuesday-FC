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

    let interestedTeams = [];
    if (user.data.length > 0) {
      // 检查并强制确保 interested_teams 是一个数组
      if (Array.isArray(user.data[0].interested_teams)) {
        interestedTeams = user.data[0].interested_teams;
      }
    }

    console.log('云函数返回的 interestedTeams:', interestedTeams);

    return {
      success: true,
      interestedTeams: interestedTeams
    }

  } catch (err) {
    console.error(err)
    return {
      success: false,
      interestedTeams: []
    }
  }
}