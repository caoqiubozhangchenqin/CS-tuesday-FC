const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command
const $ = _.aggregate

exports.main = async (event, context) => {
  try {
    const ranking = await db.collection('users')
      .aggregate()
      .match({
        total_value: db.command.exists(true)
      })
      // 关联teams集合，获取球队名称信息
      .lookup({
        from: 'teams',
        let: { team_id: '$selectedTeam' },
        pipeline: $.pipeline()
          .match({
            $expr: {
              $eq: ['$_id', '$$team_id']
            }
          })
          .project({
            _id: 0,
            name: 1
          })
          .done(),
        as: 'teamInfo'
      })
      // 添加球队名称字段和排序权重
      .addFields({
        teamName: {
          $cond: {
            if: { $and: [{ $ne: ['$selectedTeam', ''] }, { $ne: ['$selectedTeam', null] }] },
            then: { $ifNull: [{ $arrayElemAt: ['$teamInfo.name', 0] }, ''] },
            else: '自由球员'
          }
        }
      })
      // 移除teamInfo数组，只保留需要的字段
      .project({
        teamInfo: 0
      })
      .sort({
        total_value: -1 // 按身价降序排列，所有球员都参与排名
      })
      .end()

    return {
      success: true,
      data: ranking.list
    }
  } catch (err) {
    console.error('获取排名失败:', err)
    return {
      success: false,
      message: '获取排名失败'
    }
  }
}