// cloudfunctions/saveUserInfo/index.js

const cloud = require('wx-server-sdk')

// 初始化云开发环境
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 获取数据库和存储的引用
const db = cloud.database()
const _ = db.command // 如果需要用到更复杂的数据库操作，可以保留

/**
 * 这个函数用于处理新用户的注册（保存信息）
 * event 参数支持两种方式：
 * 1) 推荐：传入 nickname + avatarFileID（前端已 uploadFile 得到）
 * 2) 兼容：传入 nickname + avatarFile（Buffer，不再建议）
 */
exports.main = async (event, context) => {
  // 1. 获取调用此云函数的用户的 openid
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  // 2. 从 event 中解构出前端传来的昵称和头像文件
  const { nickname, avatarFile, avatarFileID } = event
  
  // 健壮性检查：确保关键数据已传入
  if (!nickname || (!avatarFile && !avatarFileID)) {
    return {
      success: false,
      message: '缺少必要的参数（昵称或头像）'
    }
  }

  try {
    // 3. 获取头像的 fileID：优先使用前端上传得到的 avatarFileID
    let finalFileID = avatarFileID;
    if (!finalFileID && avatarFile) {
      // 兼容路径：如果依然传了 Buffer，则在云函数内上传
      const cloudPath = `user-avatars/${openid}-${Date.now()}.png`
      const uploadResult = await cloud.uploadFile({
        cloudPath,
        fileContent: avatarFile
      })
      finalFileID = uploadResult.fileID
    }

    // 4. 仅更新昵称与头像：若用户已存在只做字段更新，不覆盖其他数据；若不存在则创建
    const existing = await db.collection('users').where({ openid }).limit(1).get();
    if (existing.data && existing.data.length > 0) {
      const targetId = existing.data[0]._id;
      await db.collection('users').doc(targetId).update({
        data: {
          nickname: nickname,
          avatarUrl: finalFileID,
          update_time: db.serverDate()
        }
      })
    } else {
      await db.collection('users').doc(openid).set({
        data: {
          openid: openid,
          nickname: nickname,
          avatarUrl: finalFileID,
          registeredAt: new Date()
        }
      })
    }

    // 5. 成功后，将包含 FileID 的完整用户信息返回给前端
    return {
      success: true,
      message: '用户信息保存成功',
      data: {
        openid: openid,
        nickname: nickname,
        avatarUrl: finalFileID
      }
    }

  } catch (err) {
    // 6. 如果过程中任何一步（上传、写入数据库）出错，则捕获错误并返回失败信息
    console.error('保存用户信息失败:', err)
    return {
      success: false,
      message: '保存失败，请稍后重试'
    }
  }
}