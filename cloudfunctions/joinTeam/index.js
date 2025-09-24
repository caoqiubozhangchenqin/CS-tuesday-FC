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
    
  const interestedTeams = Array.isArray(player.data[0].interested_teams) ? player.data[0].interested_teams : [];

    // 2. 检查是否已达到意向报名的上限（2个）
    if (interestedTeams.length >= 1) {
      return {
        success: false,
        message: '最多只能意向加入1个球队！'
      };
    }

    // 3. 检查是否已经意向加入该球队
    if (interestedTeams.includes(teamId)) {
        return {
            success: false,
            message: '您已意向加入该球队，请勿重复操作！'
        }
    }

    // 4. 更新数据库：将新的球队ID添加到感兴趣的球队数组中
    const updateRes = await db.collection('users').doc(player.data[0]._id).update({
      data: {
        // 明确以数组形式 push，兼容性更好
        interested_teams: _.push([teamId])
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