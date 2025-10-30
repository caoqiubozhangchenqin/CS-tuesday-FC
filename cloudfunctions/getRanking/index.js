const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  try {
    const ranking = await db.collection('users')
      .where({
        selectedTeam: db.command.neq('')
      })
      .orderBy('total_value', 'desc')
      .get()

    // 为每个用户添加队伍名称
    const usersWithTeamNames = await Promise.all(ranking.data.map(async (user) => {
      if (user.selectedTeam) {
        try {
          const teamDoc = await db.collection('teams').doc(user.selectedTeam).get();
          if (teamDoc.data) {
            user.teamName = teamDoc.data.name;
          }
        } catch (e) {
          console.error('获取队伍名称失败', user.selectedTeam, e);
        }
      }
      return user;
    }));

    return {
      success: true,
      data: usersWithTeamNames
    }
  } catch (err) {
    console.error(err)
    return {
      success: false,
      message: '获取排名失败'
    }
  }
}