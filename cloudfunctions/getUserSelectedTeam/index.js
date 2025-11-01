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
      console.log('用户数据:', user.data[0]);
      console.log('selectedTeam 字段值:', user.data[0].selectedTeam);
    } else {
      console.log('未找到用户数据');
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
      selectedTeam: ''
    }
  }
}