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

    let selectedTeam = '';
    if (user.data.length > 0) {
      selectedTeam = user.data[0].selectedTeam || '';
    }

    console.log('云函数返回的 selectedTeam:', selectedTeam);

    return {
      success: true,
      selectedTeam: selectedTeam
    }

  } catch (err) {
    console.error(err)
    return {
      success: false,
      interestedTeams: []
    }
  }
}