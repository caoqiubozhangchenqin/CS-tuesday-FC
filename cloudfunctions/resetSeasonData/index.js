// 引入云开发 SDK
const cloud = require('wx-server-sdk')

// 初始化云环境
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 获取数据库引用
const db = cloud.database()
const _ = db.command
const MAX_LIMIT = 1000 // 云函数单次操作最大数量

// 管理员 OpenID 列表 (请确保这里的 OpenID 是您自己的)
const ADMIN_OPENIDS = ['oVAxOvrDAY9Q0qG8WBnRxO3_m1nw'];

/**
 * 云函数主函数
 * 功能：删除 'users' 集合中的所有文档数据。
 * 注意：这是一个高危操作，会永久删除所有用户数据。
 */
exports.main = async (event, context) => {
  // 1. 权限校验：检查调用者是否为管理员
  const { OPENID } = cloud.getWXContext();
  if (!ADMIN_OPENIDS.includes(OPENID)) {
    // 如果不是管理员，立即返回错误信息
    return {
      success: false,
      message: '无权操作，仅管理员可执行此操作。'
    };
  }

  // 2. 核心逻辑：循环删除 'users' 集合的所有文档
  try {
    let totalDeleted = 0; // 初始化已删除计数器

    // 循环开始：只要集合中还有数据，就一直执行
    while (true) {
      // 使用 limit(MAX_LIMIT) 批量获取文档，最多1000条
      const batch = await db.collection('users').limit(MAX_LIMIT).get();

      // 如果获取不到数据，说明集合已空，跳出循环
      if (batch.data.length === 0) {
        break;
      }
      
      // 从获取到的文档中提取所有 _id
      const idsToDelete = batch.data.map(doc => doc._id);

      // 根据 _id 列表，批量删除这些文档
      const deleteResult = await db.collection('users').where({
        _id: _.in(idsToDelete)
      }).remove();
      
      // 累加本次删除的文档数量
      totalDeleted += deleteResult.stats.removed;

      // 如果本次删除的数量小于单次最大限制，说明已经是最后一批，可以提前结束
      if (deleteResult.stats.removed < MAX_LIMIT) {
        break;
      }
    }

    // 3. 返回成功结果
    return {
      success: true,
      message: `操作成功，已清空 'users' 集合。`,
      deleted: totalDeleted // 返回总共删除的文档数量
    }

  } catch (err) {
    // 4. 捕获并返回异常信息
    console.error('清空 users 集合失败:', err); // 在云函数日志中打印详细错误
    return {
      success: false,
      message: '清空失败，发生未知错误。',
      error: err
    }
  }
}