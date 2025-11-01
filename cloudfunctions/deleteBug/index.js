const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const { bugId, adminOpenid } = event

  // 验证管理员权限
  const adminOpenidRequired = 'oVAxOvrDAY9Q0qG8WBnRxO3_m1nw' // 管理员OpenID

  if (adminOpenid !== adminOpenidRequired) {
    return {
      success: false,
      message: '权限不足，只有管理员可以删除bug记录'
    }
  }

  // 验证输入参数
  if (!bugId) {
    return {
      success: false,
      message: '缺少必要参数'
    }
  }

  try {
    // 删除bug记录
    const result = await db.collection('bugs').doc(bugId).remove()

    if (result.stats.removed > 0) {
      return {
        success: true,
        message: 'bug记录删除成功'
      }
    } else {
      return {
        success: false,
        message: 'bug不存在或删除失败'
      }
    }
  } catch (error) {
    console.error('删除bug记录失败:', error)
    return {
      success: false,
      message: '删除失败，请重试',
      error: error.message
    }
  }
}