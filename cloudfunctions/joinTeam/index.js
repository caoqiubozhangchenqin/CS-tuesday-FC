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
    // 0. 校验 teamId 是否存在
    if (!teamId) {
      return { success: false, message: '缺少球队ID' };
    }
    const teamDoc = await db.collection('teams').doc(teamId).get().catch(() => null);
    if (!teamDoc || !teamDoc.data) {
      return { success: false, message: '球队不存在或已被删除' };
    }

    // 1. 获取当前用户的信息
    const player = await db.collection('users').where({
      openid: openid
    }).get();

    if (player.data.length === 0 || !player.data[0].total_value) {
      return {
        success: false,
        message: '请先完成身价评估！'
      };
    }
    
    // 2. 检查是否重复选择同一球队
    if (player.data[0].selectedTeam === teamId) {
      return {
        success: false,
        message: '您已选择该球队，请勿重复操作！'
      };
    }

    // 3. 更新数据库：设置用户选择的球队
    const updateRes = await db.collection('users').doc(player.data[0]._id).update({
      data: {
        selectedTeam: teamId
      }
    });

    if (!updateRes.stats || updateRes.stats.updated < 1) {
      return { success: false, message: '报名失败，请重试' };
    }

    return {
      success: true,
      message: '意向报名成功！'
    };

  } catch (err) {
    console.error(err)
    return {
      success: false,
      message: '报名失败，请重试'
    };
  }
}