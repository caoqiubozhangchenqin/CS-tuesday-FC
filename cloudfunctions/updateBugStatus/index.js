const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const { bugId, status, adminOpenid } = event

  // 验证管理员权限
  const adminOpenidRequired = 'oVAxOvrDAY9Q0qG8WBnRxO3_m1nw' // 管理员OpenID

  if (adminOpenid !== adminOpenidRequired) {
    return {
      success: false,
      message: '权限不足，只有管理员可以更新bug状态'
    }
  }

  // 验证输入参数
  if (!bugId || !status) {
    return {
      success: false,
      message: '缺少必要参数'
    }
  }

  // 验证状态值
  const validStatuses = ['open', 'in-progress', 'resolved']
  if (!validStatuses.includes(status)) {
    return {
      success: false,
      message: '无效的状态值'
    }
  }

  try {
    // 更新bug状态
    const result = await db.collection('bugs').doc(bugId).update({
      data: {
        status: status,
        statusText: status === 'resolved' ? '已解决' :
                   status === 'in-progress' ? '处理中' : '待处理',
        updateTime: new Date()
      }
    })

    if (result.stats.updated > 0) {
      return {
        success: true,
        message: 'bug状态更新成功'
      }
    } else {
      return {
        success: false,
        message: 'bug不存在或更新失败'
      }
    }
  } catch (error) {
    console.error('更新bug状态失败:', error)
    return {
      success: false,
      message: '更新失败，请重试',
      error: error.message
    }
  }
}