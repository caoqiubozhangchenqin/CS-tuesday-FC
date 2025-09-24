// 云函数：calculateStandings/index.js

const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command // 获取数据库查询指令

// 云函数主函数
exports.main = async (event, context) => {
  try {
    // 1. 获取所有状态为“已结束”的比赛
    const matchesRes = await db.collection('schedules').where({
      status: '已结束'
    }).limit(500).get()

    const matches = matchesRes.data;

    // 2. 初始化一个对象来存储每支球队的统计数据
    const stats = {};

    // 3. 遍历每一场比赛，计算统计数据
    for (const match of matches) {
      // 安全检查，确保比分是数字
      if (typeof match.homeScore !== 'number' || typeof match.awayScore !== 'number') {
        continue; // 如果比分不是数字，跳过这场比赛
      }
      
      const homeTeam = match.homeTeam;
      const awayTeam = match.awayTeam;
      const homeScore = match.homeScore;
      const awayScore = match.awayScore;

      if (!stats[homeTeam]) {
        stats[homeTeam] = { teamName: homeTeam, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 };
      }
      if (!stats[awayTeam]) {
        stats[awayTeam] = { teamName: awayTeam, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 };
      }

      stats[homeTeam].played++;
      stats[awayTeam].played++;
      stats[homeTeam].goalsFor += homeScore;
      stats[awayTeam].goalsFor += awayScore;
      stats[homeTeam].goalsAgainst += awayScore;
      stats[awayTeam].goalsAgainst += homeScore;

      if (homeScore > awayScore) {
        stats[homeTeam].won++;
        stats[awayTeam].lost++;
        stats[homeTeam].points += 3;
      } else if (homeScore < awayScore) {
        stats[awayTeam].won++;
        stats[homeTeam].lost++;
        stats[awayTeam].points += 3;
      } else {
        stats[homeTeam].drawn++;
        stats[awayTeam].drawn++;
        stats[homeTeam].points += 1;
        stats[awayTeam].points += 1;
      }
    }

    // 4. 将stats对象转换为数组，并计算净胜球
    let standingsArray = Object.values(stats);
    for (const team of standingsArray) {
      team.goalDifference = team.goalsFor - team.goalsAgainst;
    }

    // 5. 按照足球规则对积分榜进行排序
    standingsArray.sort((a, b) => {
      if (a.points !== b.points) return b.points - a.points;
      if (a.goalDifference !== b.goalDifference) return b.goalDifference - a.goalDifference;
      return b.goalsFor - a.goalsFor;
    });

    // 6. 将计算好的积分榜存入 standings 集合
    await db.collection('standings').where({ _id: _.exists(true) }).remove();
    
    if (standingsArray.length > 0) {
      const promises = standingsArray.map(team => db.collection('standings').add({ data: team }));
      await Promise.all(promises);
    }
    
    return {
      success: true,
      message: '积分榜计算并更新成功！',
      data: standingsArray
    };

  } catch (e) {
    console.error(e);
    return {
      success: false,
      message: '计算积分榜时发生错误',
      error: e
    };
  }
}