// 云函数：添加书籍到书架
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event, context) => {
  const db = cloud.database();
  const wxContext = cloud.getWXContext();
  
  const { 
    name, 
    author, 
    intro, 
    category, 
    format, 
    fileID, 
    cloudPath, 
    size, 
    sizeText 
  } = event;
  
  try {
    // 添加书籍到 novels 集合
    const result = await db.collection('novels').add({
      data: {
        name: name || '未命名书籍',
        author: author || '未知',
        intro: intro || '暂无简介',
        category: category || '未分类',
        format: format || 'TXT',
        fileID: fileID,
        cloudPath: cloudPath || '',
        size: size || 0,
        sizeText: sizeText || '未知大小',
        uploadTime: Date.now(),
        _openid: wxContext.OPENID
      }
    });
    
    return {
      success: true,
      message: '书籍添加成功',
      bookId: result._id,
      bookName: name
    };
  } catch (error) {
    console.error('添加书籍失败:', error);
    return {
      success: false,
      message: error.message || '添加失败'
    };
  }
};
