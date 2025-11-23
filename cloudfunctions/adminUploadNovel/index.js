const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const fs = require('fs');
const path = require('path');
const https = require('https');
const iconv = require('iconv-lite');

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
      'oVAxOvrDAY9Q0qG8WBnRxO3_m1nw',  // 替换为你的 openid
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

  let finalFileID = fileID;

  if (fileID && !content) {
      try {
        console.log('开始获取文件:', fileID);
        
        // 方法1：先尝试 getTempFileURL
        const tempFileResult = await cloud.getTempFileURL({
          fileList: [fileID]
        });

        console.log('获取临时链接结果:', JSON.stringify(tempFileResult));

        if (!tempFileResult.fileList || tempFileResult.fileList.length === 0) {
          return {
            success: false,
            error: '获取文件临时链接失败',
            code: 'GET_TEMP_URL_FAILED'
          };
        }

        const tempFileURL = tempFileResult.fileList[0].tempFileURL;
        console.log('临时下载链接:', tempFileURL);

        // 方法2：通过 HTTPS 下载文件内容（支持多种编码）
        fullContent = await new Promise((resolve, reject) => {
          https.get(tempFileURL, (res) => {
            const chunks = [];
            
            // 不设置编码，接收原始二进制数据
            res.on('data', (chunk) => {
              chunks.push(chunk);
            });
            
            res.on('end', () => {
              // 合并所有数据块
              const buffer = Buffer.concat(chunks);
              console.log('文件下载完成，大小:', buffer.length, '字节');
              
              // 尝试检测编码并转换
              let text = '';
              
              // 尝试UTF-8
              try {
                text = buffer.toString('utf8');
                // 检查是否有乱码（UTF-8解码失败的标志）
                if (text.includes('�') || text.includes('\ufffd')) {
                  console.log('UTF-8检测到乱码，尝试GBK');
                  text = iconv.decode(buffer, 'gbk');
                  console.log('使用GBK编码解析');
                } else {
                  console.log('使用UTF-8编码解析');
                }
              } catch (err) {
                // UTF-8失败，尝试GBK
                console.log('UTF-8解析失败，使用GBK');
                text = iconv.decode(buffer, 'gbk');
              }
              
              resolve(text);
            });
            
            res.on('error', (err) => {
              console.error('下载流错误:', err);
              reject(err);
            });
          }).on('error', (err) => {
            console.error('HTTPS请求错误:', err);
            reject(err);
          });
        });

        fileSize = Buffer.byteLength(fullContent, 'utf8');
        console.log('文件大小:', fileSize, '字节');

        // 将解析后的 UTF-8 内容重新上传，替换原始文件
        const safeTitle = title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_');
        const utf8FileName = `${safeTitle}_${Date.now()}_utf8.txt`;
        const utf8CloudPath = `novels/${utf8FileName}`;

        const uploadUtf8Res = await cloud.uploadFile({
          cloudPath: utf8CloudPath,
          fileContent: Buffer.from(fullContent, 'utf8')
        });

        console.log('UTF-8 文件已上传:', uploadUtf8Res.fileID);
        finalFileID = uploadUtf8Res.fileID;

        // 清理原始上传文件，节省存储
        try {
          await cloud.deleteFile({ fileList: [fileID] });
          console.log('已删除原始上传文件:', fileID);
        } catch (deleteErr) {
          console.warn('删除原始文件失败，可忽略:', deleteErr.message);
        }
        
      } catch (error) {
        console.error('文件处理异常:', error);
        return {
          success: false,
          error: `文件处理失败: ${error.message}`,
          code: 'FILE_PROCESS_ERROR',
          stack: error.stack
        };
      }
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
