const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  try {
    const { page = 1, pageSize = 50 } = event;

    // 获取所有数据（微信云数据库最多返回100条，需要分批获取）
    const MAX_LIMIT = 100;
    let allUsers = [];
    let hasMore = true;
    let skip = 0;

    // 分批获取所有已选择球队的用户
    while (hasMore && allUsers.length < 1000) { // 最多获取1000条
      const result = await db.collection('users')
        .where({
          selectedTeam: db.command.neq('')
        })
        .orderBy('total_value', 'desc')
        .skip(skip)
        .limit(MAX_LIMIT)
        .get();

      allUsers = allUsers.concat(result.data);
      
      if (result.data.length < MAX_LIMIT) {
        hasMore = false;
      } else {
        skip += MAX_LIMIT;
      }
    }

    // 计算分页
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedUsers = allUsers.slice(startIndex, endIndex);

    // 为每个用户添加队伍名称
    const usersWithTeamNames = await Promise.all(paginatedUsers.map(async (user) => {
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
      data: usersWithTeamNames,
      totalCount: allUsers.length,
      currentPage: page,
      pageSize: pageSize,
      hasMore: endIndex < allUsers.length
    };
  } catch (err) {
    console.error(err)
    return {
      success: false,
      message: '获取排名失败'
    }
  }
}