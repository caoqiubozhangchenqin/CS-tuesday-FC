const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const fs = require('fs');
const path = require('path');

/**
 * 管理员上传小说到公共库
 * 
 * 功能：
 * 1. 验证管理员权限
 * 2. 接收 TXT 文件内容
 * 3. 计算统计信息（总字数、总页数）
 * 4. 保存到 novels 集合
 */
exports.main = async (event, context) => {
  try {
    const wxContext = cloud.getWXContext();
    const { OPENID } = wxContext;

    // ==================== 1. 验证管理员权限 ====================
    // ⚠️ 重要：请替换为实际的管理员 openid
    const ADMIN_LIST = [
      'oXXXX-your-admin-openid-1',  // 替换为你的 openid
      'oXXXX-your-admin-openid-2'   // 可以添加多个管理员
    ];

    if (!ADMIN_LIST.includes(OPENID)) {
      return {
        success: false,
        error: '权限不足：您不是管理员',
        code: 'NO_PERMISSION'
      };
    }

    // ==================== 2. 接收参数 ====================
    const {
      title,          // 小说标题
      author,         // 作者
      category,       // 分类
      tags,           // 标签数组
      description,    // 简介
      coverUrl,       // 封面URL（可选）
      fileID,         // 云存储文件ID（TXT已上传）
      content,        // 或直接传内容（二选一）
      charsPerPage = 500  // 每页字数（默认500）
    } = event;

    // ==================== 3. 参数验证 ====================
    if (!title || !author) {
      return {
        success: false,
        error: '缺少必要参数：title 或 author',
        code: 'MISSING_PARAMS'
      };
    }

    if (!fileID && !content) {
      return {
        success: false,
        error: '必须提供 fileID 或 content 之一',
        code: 'MISSING_CONTENT'
      };
    }

    // ==================== 4. 获取文本内容 ====================
    let fullContent = content;
    let fileSize = 0;

    if (fileID && !content) {
      // 从云存储下载文件
      const downloadRes = await cloud.downloadFile({
        fileID: fileID
      });

      const tempFilePath = downloadRes.tempFilePath;
      fullContent = fs.readFileSync(tempFilePath, 'utf8');
      fileSize = fs.statSync(tempFilePath).size;
    } else if (content) {
      fileSize = Buffer.byteLength(content, 'utf8');
    }

    // ==================== 5. 计算统计信息 ====================
    const totalChars = fullContent.length;
    const totalPages = Math.ceil(totalChars / charsPerPage);

    console.log('小说统计信息:', {
      title,
      totalChars,
      totalPages,
      charsPerPage,
      fileSize
    });

    // ==================== 6. 如果没有 fileID，上传到云存储 ====================
    let finalFileID = fileID;
    
    if (!fileID && content) {
      // 生成文件名
      const fileName = `${title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}_${Date.now()}.txt`;
      const cloudPath = `novels/${fileName}`;

      // 创建临时文件
      const tempDir = '/tmp';
      const tempFilePath = path.join(tempDir, fileName);
      fs.writeFileSync(tempFilePath, content, 'utf8');

      // 上传到云存储
      const uploadRes = await cloud.uploadFile({
        cloudPath: cloudPath,
        fileContent: fs.createReadStream(tempFilePath)
      });

      finalFileID = uploadRes.fileID;
      console.log('文件已上传到云存储:', finalFileID);

      // 删除临时文件
      fs.unlinkSync(tempFilePath);
    }

    // ==================== 7. 保存到数据库 ====================
    const novelData = {
      title,
      author,
      category: category || '未分类',
      tags: tags || [],
      description: description || '',
      cover: coverUrl || '',
      
      fileID: finalFileID,
      fileSize,
      totalChars,
      totalPages,
      charsPerPage,
      
      viewCount: 0,
      favoriteCount: 0,
      
      uploadTime: Date.now(),
      updateTime: Date.now(),
      status: 'published',
      isRecommended: false
    };

    const result = await db.collection('novels').add({
      data: novelData
    });

    console.log('小说已保存到数据库:', result._id);

    // ==================== 8. 返回成功 ====================
    return {
      success: true,
      novelId: result._id,
      data: {
        title,
        totalPages,
        totalChars,
        fileID: finalFileID
      }
    };

  } catch (error) {
    console.error('上传小说失败:', error);
    return {
      success: false,
      error: error.message,
      code: 'UPLOAD_FAILED'
    };
  }
};
