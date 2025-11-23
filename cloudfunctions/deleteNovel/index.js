const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

/**
 * 删除小说云函数
 * 功能：
 * 1. 验证管理员权限
 * 2. 删除小说数据库记录
 * 3. 删除云存储文件
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { novelId } = event

  // 验证管理员权限
  const ADMIN_LIST = [
    'oVAxOvrDAY9Q0qG8WBnRxO3_m1nw',  // 管理员 openid
  ]

  if (!ADMIN_LIST.includes(wxContext.OPENID)) {
    return {
      success: false,
      message: '权限不足，只有管理员可以删除小说'
    }
  }

  // 验证输入参数
  if (!novelId) {
    return {
      success: false,
      message: '缺少小说ID参数'
    }
  }

  try {
    // 1. 先获取小说信息（需要fileID来删除云存储文件）
    const novelDoc = await db.collection('novels').doc(novelId).get()
    
    if (!novelDoc.data) {
      return {
        success: false,
        message: '小说不存在'
      }
    }

    const novel = novelDoc.data
    const fileID = novel.fileID

    // 2. 删除数据库记录
    await db.collection('novels').doc(novelId).remove()
    console.log('数据库记录已删除:', novelId)

    // 3. 删除云存储文件（如果存在）
    if (fileID) {
      try {
        await cloud.deleteFile({
          fileList: [fileID]
        })
        console.log('云存储文件已删除:', fileID)
      } catch (fileError) {
        console.warn('删除云存储文件失败（可能已不存在）:', fileError)
        // 文件删除失败不影响整体删除结果
      }
    }

    // 4. 删除相关的阅读进度记录（可选）
    try {
      const progressResult = await db.collection('reading_progress')
        .where({
          novelId: novelId
        })
        .remove()
      console.log('已删除相关阅读进度记录:', progressResult.stats.removed, '条')
    } catch (progressError) {
      console.warn('删除阅读进度记录失败:', progressError)
      // 阅读进度删除失败不影响整体删除结果
    }

    return {
      success: true,
      message: `《${novel.title || '未知'}》删除成功`,
      data: {
        novelId: novelId,
        title: novel.title,
        deletedFile: !!fileID
      }
    }

  } catch (error) {
    console.error('删除小说失败:', error)
    return {
      success: false,
      message: '删除失败：' + error.message,
      error: error.message
    }
  }
}
