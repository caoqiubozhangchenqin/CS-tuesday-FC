// 云函数：sendMatchReminders
// 发送比赛开始提醒推送

const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    console.log('开始执行比赛提醒推送任务');

    // 获取即将开始的比赛（未来30分钟内）
    const upcomingMatches = await getUpcomingMatches();

    if (upcomingMatches.length === 0) {
      console.log('没有即将开始的比赛');
      return {
        success: true,
        message: '没有需要提醒的比赛',
        sentCount: 0
      };
    }

    console.log(`找到 ${upcomingMatches.length} 场即将开始的比赛`);

    let totalSent = 0;

    // 为每场比赛发送提醒
    for (const match of upcomingMatches) {
      const sentCount = await sendRemindersForMatch(match);
      totalSent += sentCount;
      console.log(`比赛 ${match.id} 发送了 ${sentCount} 个提醒`);
    }

    return {
      success: true,
      message: `成功发送 ${totalSent} 个比赛提醒`,
      sentCount: totalSent,
      matchesProcessed: upcomingMatches.length
    };

  } catch (error) {
    console.error('发送比赛提醒失败:', error);
    return {
      success: false,
      message: error.message || '发送提醒失败'
    };
  }
};

// 获取即将开始的比赛（未来30分钟内）
async function getUpcomingMatches() {
  // 调用Football-Data.org API获取最新比赛数据
  const apiKey = 'c4906718aabe4287b5963a412e4c81ce';

  // 获取当前时间和未来30分钟的时间
  const now = new Date();
  const thirtyMinutesLater = new Date(now.getTime() + 30 * 60 * 1000);

  const dateFrom = formatDate(now);
  const dateTo = formatDate(thirtyMinutesLater);

  // 调用API获取比赛数据
  const response = await new Promise((resolve) => {
    wx.request({
      url: `https://api.football-data.org/v4/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`,
      method: 'GET',
      header: {
        'X-Auth-Token': apiKey
      },
      success: (res) => {
        if (res.statusCode === 200 && res.data.matches) {
          resolve(res.data.matches);
        } else {
          resolve([]);
        }
      },
      fail: () => resolve([])
    });
  });

  return response;
}

// 格式化日期
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 为指定比赛发送提醒
async function sendRemindersForMatch(match) {
  try {
    // 获取设置了该场比赛提醒的用户
    const reminders = await db.collection('match_reminders')
      .where({
        matchId: match.id.toString(),
        status: 'active'
      })
      .get();

    if (!reminders.data || reminders.data.length === 0) {
      return 0;
    }

    console.log(`比赛 ${match.id} 有 ${reminders.data.length} 个用户设置了提醒`);

    let sentCount = 0;

    // 为每个用户发送提醒
    for (const reminder of reminders.data) {
      try {
        const success = await sendReminderToUser(reminder.userId, match);
        if (success) {
          sentCount++;
        }
      } catch (error) {
        console.error(`发送提醒失败，用户: ${reminder.userId}, 错误:`, error);
      }
    }

    return sentCount;

  } catch (error) {
    console.error(`获取比赛 ${match.id} 的提醒设置失败:`, error);
    return 0;
  }
}

// 向指定用户发送提醒
async function sendReminderToUser(userId, match) {
  try {
    // 格式化比赛信息
    const matchTime = new Date(match.utcDate);
    const timeString = matchTime.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });

    const matchInfo = `${match.homeTeam.name} vs ${match.awayTeam.name}`;
    const message = `⏰ 比赛提醒：${matchInfo} 即将开始 (${timeString})`;

    // 使用微信小程序推送API发送提醒
    // 注意：这需要小程序有推送权限配置
    const result = await cloud.openapi.subscribeMessage.send({
      touser: userId,
      templateId: '0PFvm78xmA-RfbVH0wnq9HgciavwO9dmYr7X65TTnC8', // 实际模板ID
      data: {
        thing1: {
          value: matchInfo.substring(0, 20) // 限制长度
        },
        time2: {
          value: timeString
        },
        thing3: {
          value: '点击查看比赛详情'
        }
      }
    });

    console.log(`成功向用户 ${userId} 发送提醒:`, result);
    return true;

  } catch (error) {
    console.error(`向用户 ${userId} 发送提醒失败:`, error);

    // 如果推送失败，可以考虑其他提醒方式
    // 比如发送模板消息或客服消息

    return false;
  }
}