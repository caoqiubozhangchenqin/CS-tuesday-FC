const cloud = require('wx-server-sdk');
cloud.init();
const db = cloud.database();
const _ = db.command;

// 留言集合
const MESSAGES_COLLECTION = 'communityMessages';

// 处理消息体长度
const truncateMessage = (message, maxLength = 500) => {
  if (typeof message !== 'string') return '';
  return message.length > maxLength ? message.substring(0, maxLength) + '...' : message;
};

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const { OPENID } = wxContext;
  const { action, data } = event;
  
  try {
    switch (action) {
      case 'getMessages':
        return await getMessages(data, OPENID);
      case 'submitMessage':
        return await submitMessage(data, OPENID);
      case 'toggleLike':
        return await toggleLike(data, OPENID);
      case 'submitReply':
        return await submitReply(data, OPENID);
      case 'deleteMessage':
        return await deleteMessage(data, OPENID);
      default:
        return { success: false, message: '未知的操作类型' };
    }
  } catch (error) {
    console.error('处理社区留言时出错:', error);
    return { success: false, message: error.message || '服务器内部错误' };
  }
};

// 获取留言列表
async function getMessages(data, openid) {
  const { sortBy = 'time', skip = 0, limit = 50 } = data || {};
  
  try {
    // 构建查询
    let query = db.collection(MESSAGES_COLLECTION);
    
    // 排序
    if (sortBy === 'likes') {
      query = query.orderBy('likeCount', 'desc').orderBy('createTime', 'desc');
    } else {
      query = query.orderBy('createTime', 'desc');
    }
    
    // 分页
    query = query.skip(skip).limit(limit);
    
    // 执行查询
    const result = await query.get();
    
    // 获取用户是否点赞过的信息
    const messages = result.data.map(msg => {
      const isLiked = msg.likedUsers && msg.likedUsers.includes(openid);
      return {
        ...msg,
        isLiked,
        // 移除点赞用户列表，返回前端不需要这个字段
        likedUsers: undefined
      };
    });
    
    return { success: true, data: messages };
  } catch (error) {
    console.error('获取留言列表失败:', error);
    throw new Error('获取留言列表失败');
  }
}

// 提交新留言
async function submitMessage(data, openid) {
  const { content, userInfo, userValue, selectedTeam } = data;
  
  // 验证必填字段
  if (!content || !content.trim()) {
    return { success: false, message: '留言内容不能为空' };
  }
  
  if (!userInfo || !userValue || !selectedTeam) {
    return { success: false, message: '用户信息不完整' };
  }
  
  try {
    const newMessage = {
      content: truncateMessage(content),
      userInfo: {
        nickname: userInfo.nickname,
        avatarUrl: userInfo.avatarUrl
      },
      userValue,
      selectedTeam,
      openid,
      likeCount: 0,
      likedUsers: [],
      replies: [],
      createTime: db.serverDate(),
      updateTime: db.serverDate()
    };
    
    const result = await db.collection(MESSAGES_COLLECTION).add({
      data: newMessage
    });
    
    return {
      success: true,
      data: {
        ...newMessage,
        _id: result._id,
        id: result._id, // 兼容前端使用id字段
        isLiked: false
      }
    };
  } catch (error) {
    console.error('提交留言失败:', error);
    throw new Error('提交留言失败');
  }
}

// 切换点赞状态
async function toggleLike(data, openid) {
  const { messageId } = data;
  
  if (!messageId) {
    return { success: false, message: '留言ID不能为空' };
  }
  
  try {
    const message = await db.collection(MESSAGES_COLLECTION).doc(messageId).get();
    const isLiked = message.data.likedUsers && message.data.likedUsers.includes(openid);
    
    let updateData;
    if (isLiked) {
      // 取消点赞
      updateData = {
        likeCount: _.inc(-1),
        likedUsers: _.pull(openid),
        updateTime: db.serverDate()
      };
    } else {
      // 添加点赞
      updateData = {
        likeCount: _.inc(1),
        likedUsers: _.addToSet(openid),
        updateTime: db.serverDate()
      };
    }
    
    await db.collection(MESSAGES_COLLECTION).doc(messageId).update({
      data: updateData
    });
    
    return {
      success: true,
      data: {
        isLiked: !isLiked,
        likeCount: isLiked ? message.data.likeCount - 1 : message.data.likeCount + 1
      }
    };
  } catch (error) {
    console.error('切换点赞状态失败:', error);
    throw new Error('切换点赞状态失败');
  }
}

// 提交回复
async function submitReply(data, openid) {
  const { messageId, content, userInfo } = data;
  
  if (!messageId || !content || !content.trim() || !userInfo) {
    return { success: false, message: '参数不完整' };
  }
  
  try {
    const newReply = {
      _id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content: truncateMessage(content, 200),
      userInfo: {
        nickname: userInfo.nickname,
        avatarUrl: userInfo.avatarUrl
      },
      openid,
      createTime: db.serverDate()
    };
    
    await db.collection(MESSAGES_COLLECTION).doc(messageId).update({
      data: {
        replies: _.push(newReply),
        updateTime: db.serverDate()
      }
    });
    
    return {
      success: true,
      data: newReply
    };
  } catch (error) {
    console.error('提交回复失败:', error);
    throw new Error('提交回复失败');
  }
}

// 删除留言
async function deleteMessage(data, openid) {
  const { messageId } = data;
  
  if (!messageId) {
    return { success: false, message: '留言ID不能为空' };
  }
  
  try {
    // 获取留言信息，检查权限
    const message = await db.collection(MESSAGES_COLLECTION).doc(messageId).get();
    
    // 检查是否是留言作者
    if (message.data.openid !== openid) {
      // 检查是否是管理员
      const adminResult = await db.collection('adminUsers').where({
        openid: openid
      }).count();
      
      if (adminResult.total === 0) {
        return { success: false, message: '无权限删除该留言' };
      }
    }
    
    // 执行删除
    await db.collection(MESSAGES_COLLECTION).doc(messageId).remove();
    
    return { success: true, message: '删除成功' };
  } catch (error) {
    console.error('删除留言失败:', error);
    throw new Error('删除留言失败');
  }
}