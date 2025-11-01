const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    // 尝试创建 bugs 集合
    await db.createCollection('bugs')
    
    // 添加一个示例 bug 记录（可选）
    await db.collection('bugs').add({
      data: {
        title: '系统初始化',
        description: 'bugs 集合已成功创建，这是系统自动添加的初始化记录。',
        userInfo: {
          nickname: '系统',
          avatarUrl: ''
        },
        status: 'resolved',
        statusText: '已解决',
        createTime: new Date(),
        updateTime: new Date()
      }
    })
    
    return {
      success: true,
      message: 'bugs 集合创建成功'
    }
  } catch (error) {
    // 如果集合已存在，这不是错误
    if (error.errCode === -1 || error.errMsg && error.errMsg.includes('already exists')) {
      return {
        success: true,
        message: 'bugs 集合已存在'
      }
    }
    
    console.error('创建 bugs 集合失败:', error)
    return {
      success: false,
      message: '创建集合失败',
      error: error
    }
  }
}