// 云函数入口文件
const cloud = require('wx-server-sdk');
cloud.init();
const db = cloud.database();
const _ = db.command;

// 配置常量
const COLLECTION_NAME = 'messageBoard';
const MAX_PAGE_SIZE = 50;
const DEFAULT_PAGE_SIZE = 20;

// 简化的集合检查函数 - 因为用户已手动创建集合
async function checkCollectionExists(collectionName) {
  try {
    // 简单查询以验证集合可访问性
    await db.collection(collectionName).limit(1).get();
    return true;
  } catch (error) {
    console.error('集合访问失败:', error);
    return false;
  }
}

// 云开发环境上下文缓存
let environmentCached = false;
let cloudEnv = '';

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    // 数据库初始化检查
    if (!db) {
      throw new Error('数据库初始化失败');
    }
    
    // 缓存环境信息以优化性能
    const wxContext = cloud.getWXContext();
    if (!environmentCached) {
      cloudEnv = wxContext.ENV || cloud.getWXContext().ENV;
      environmentCached = true;
      console.log('环境信息缓存完成:', cloudEnv);
    }
    
    const action = event.action;
    const data = event.data || {};
    
    // 参数验证
    if (!action) {
      throw new Error('请求参数错误：缺少操作类型');
    }
    
    // 记录请求日志（优化日志记录格式）
    console.log(`请求处理: ${action}`, { 
      action, 
      skip: data.skip || 0, 
      limit: data.limit || DEFAULT_PAGE_SIZE 
    });
    
      // 检查集合可访问性
    try {
      const collectionExists = await checkCollectionExists(COLLECTION_NAME);
      if (!collectionExists) {
        console.warn(`⚠️ 数据库集合 ${COLLECTION_NAME} 可能不存在，尝试创建...`);
        // 注意：在云函数中无法直接创建集合，需要在云开发控制台创建
        // 这里添加明确的错误提示，指导开发者在控制台创建集合
        throw new Error(`⚠️ 数据库集合 ${COLLECTION_NAME} 不存在，请在云开发控制台创建该集合并设置正确权限`);
      }
    } catch (error) {
      console.error('❌ 集合访问检查失败:', error);
      // 如果是权限问题，提供更明确的错误信息
      if (error.errCode === -502005) {
        throw new Error(`⚠️ 数据库权限错误：请在云开发控制台检查 ${COLLECTION_NAME} 集合的读写权限设置`);
      }
      throw error;
    }
    
    // 支持的操作类型处理
    const actionHandlers = {
      saveMessage: () => saveMessage(data, wxContext),
      getMessages: () => getMessages(data),
      updateLike: () => updateLike(data, wxContext) // 新增点赞功能
    };
    
    // 调用对应的处理函数
    const handler = actionHandlers[action];
    if (!handler) {
      throw new Error(`未知的操作类型: ${action}`);
    }
    
    return await handler();
  } catch (error) {
    console.error('云函数执行错误:', error);
    
    // 统一错误处理
    let errorMessage = '服务器内部错误';
    let errorCode = -1;
    
    if (error.errCode) {
      errorCode = error.errCode;
      if (error.errCode === -502005) {
        errorMessage = '数据库集合无法访问，请确认已创建并设置正确权限';
      } else {
        errorMessage = `数据库操作错误: ${error.errMsg}`;
      }
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return {
      success: false,
      message: errorMessage,
      errorCode,
      timestamp: Date.now()
    };
  }
};

// 更新点赞状态的新函数
async function updateLike(data, wxContext) {
  const { messageId, isLiked } = data;
  const openid = wxContext.OPENID;
  
  // 参数校验
  if (!messageId) {
    throw new Error('缺少必要的留言ID参数');
  }
  if (typeof isLiked !== 'boolean') {
    throw new Error('点赞状态参数类型错误');
  }
  
  try {
    // 原子操作更新点赞状态和计数
    const updateData = isLiked ? {
      // 添加点赞
      $addToSet: { likedUsers: openid },
      $inc: { likeCount: 1 }
    } : {
      // 取消点赞
      $pull: { likedUsers: openid },
      $inc: { likeCount: -1 }
    };
    
    const result = await db.collection(COLLECTION_NAME).doc(messageId).update({
      data: updateData
    });
    
    console.log('点赞状态更新成功:', {
      messageId,
      isLiked,
      updated: result.stats.updated
    });
    
    return {
      success: true,
      message: isLiked ? '点赞成功' : '取消点赞成功',
      messageId
    };
  } catch (error) {
    console.error('点赞状态更新失败:', error);
    throw new Error('点赞操作失败，请重试');
  }
};

// 保存留言 - 优化版本
async function saveMessage(data, wxContext) {
  const content = data.content;
  const openid = wxContext.OPENID;
  
  // 严格参数校验
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    throw new Error('留言内容不能为空');
  }
  
  if (content.length > 200) {
    throw new Error('留言内容不能超过200个字符');
  }
  
  if (!openid) {
    throw new Error('用户身份验证失败');
  }
  
  // 创建结构化的留言记录
  const messageData = {
    content: content.trim(),
    userId: openid,
    createTime: db.serverDate(),
    likeCount: 0,
    likedUsers: [],
    updateTime: db.serverDate(),
    // 添加额外的元数据用于后续分析
    meta: {
      env: cloudEnv,
      createdBy: 'wx_user'
    }
  };
  
  try {
    // 直接保存到数据库（集合已验证存在）
    const result = await db.collection(COLLECTION_NAME).add({
      data: messageData
    });
    
    console.log(`留言保存成功: ${result._id} by ${openid.substring(0, 8)}...`);
    
    return {
      success: true,
      message: '留言成功',
      messageId: result._id,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('留言保存失败:', error);
    throw new Error('留言保存失败，请重试');
  }
}

// 获取留言列表 - 优化版本
async function getMessages(data) {
  // 参数规范化处理
  const skip = Math.max(0, parseInt(data.skip) || 0);
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(data.limit) || DEFAULT_PAGE_SIZE));
  
  console.log(`查询留言列表: skip=${skip}, limit=${limit}`);
  
  try {
    // 执行数据库查询，添加索引优化（假设createTime已创建索引）
    const result = await db.collection(COLLECTION_NAME)
      .orderBy('createTime', 'desc') // 按创建时间倒序
      .skip(skip)
      .limit(limit)
      // 只获取必要的字段，减少数据传输量
      .field({
        content: true,
        userId: true,
        createTime: true,
        likeCount: true,
        likedUsers: true
      })
      .get();
    
    // 数据处理和格式化
    const messages = result.data.map(msg => ({
      _id: msg._id,
      content: msg.content,
      userId: msg.userId,
      createTime: msg.createTime,
      likeCount: msg.likeCount || 0,
      likedUsers: msg.likedUsers || [],
      // 添加格式化后的时间戳便于前端使用
      formattedDate: new Date(msg.createTime).toISOString()
    }));
    
    console.log(`查询完成: 返回${messages.length}条留言`);
    
    return {
      success: true,
      data: messages,
      pagination: {
        total: messages.length,
        skip,
        limit,
        hasMore: messages.length === limit
      },
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('获取留言列表失败:', error);
    // 如果是数据库查询错误，返回空数据而不是失败，确保前端体验
    if (error.errCode) {
      console.warn('数据库查询出错，返回空列表以维持前端功能');
      return {
        success: true,
        data: [],
        pagination: {
          total: 0,
          skip,
          limit,
          hasMore: false
        },
        warning: '暂时无法获取留言列表，请稍后再试',
        timestamp: Date.now()
      };
    }
    throw new Error('获取留言列表失败，请重试');
  }
}