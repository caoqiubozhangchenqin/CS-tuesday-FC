const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  try {
    // 获取用户信息
    const userRes = await db.collection('users').where({ openid }).get();

    if (userRes.data.length === 0) {
      return {
        success: false,
        message: '用户不存在，请先注册'
      };
    }

    const user = userRes.data[0];
    const today = new Date().toISOString().split('T')[0]; // 获取当前日期（格式：YYYY-MM-DD）

    // 检查是否已经签到
    if (user.lastSignInDate === today) {
      return {
        success: false,
        message: '今天已经签到过了'
      };
    }

    // 更新用户身价和签到日期
    await db.collection('users').doc(user._id).update({
      data: {
        total_value: db.command.inc(1), // 增加1（数据库单位是万欧）
        lastSignInDate: today // 更新签到日期
      }
    });

    return {
      success: true,
      message: '签到成功，身价增加1万欧元',
      newValue: (user.total_value || 0) + 1 // 返回新的身价值
    };
  } catch (error) {
    console.error('签到失败:', error);
    return {
      success: false,
      message: '签到失败，请稍后重试',
      error: error.message
    };
  }
};