// cloudfunctions/getAdminDetails/index.js
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;
const $ = _.aggregate;

exports.main = async (event, context) => {
  try {
    const aggregateResult = await db.collection('teams').aggregate()
      .lookup({
        from: 'users',
        let: { team_id: '$_id' },
        pipeline: $.pipeline()
          .match({
            $expr: {
              $eq: ['$selectedTeam', { $toString: '$$team_id' }]
            }
          })
          .project({
            _id: 0,
            // 为未设置昵称的用户提供默认显示
            nickname: { $ifNull: ['$nickname', '未设置昵称'] },
            avatarUrl: { $ifNull: ['$avatarUrl', ''] },
            total_value: { $ifNull: ['$total_value', 0] }
          })
          .done(),
        as: 'interestedUserObjects'
      })
      .project({
        _id: 1,
        teamName: '$name',
        interestedUsers: '$interestedUserObjects.nickname',
        interestedUsersWithAvatar: '$interestedUserObjects',
        totalTeamValue: $.sum('$interestedUserObjects.total_value')
      })
      .end();

    console.log("聚合查询最终返回给前端的数据:", JSON.stringify(aggregateResult.list, null, 2));

    return {
      success: true,
      data: aggregateResult.list,
      message: '获取成功'
    };

  } catch (e) {
    console.error('getAdminDetails 聚合查询失败', e);
    return {
      success: false,
      data: [],
      error: e,
      message: '获取失败'
    };
  }
};