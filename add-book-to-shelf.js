// 添加《我 中国队长》到书架
// 使用云开发控制台或云函数执行此脚本

const bookData = {
  name: '我 中国队长',
  author: '未知',
  intro: '超过10MB的大型小说',
  category: '未分类',
  format: 'TXT',
  fileID: 'cloud://cloud1-3ge5gomsffe800a7.636c-cloud1-3ge5gomsffe800a7-1373366709/小说/我 中国队长.txt',
  cloudPath: '小说/我 中国队长.txt',
  size: 10485760,  // 10MB以上（请根据实际大小调整）
  sizeText: '> 10 MB',
  uploadTime: Date.now(),
  _openid: '您的openid'  // 需要替换为您的实际openid
};

// 方法1：在云开发控制台执行
// 1. 打开云开发控制台 -> 数据库 -> novels 集合
// 2. 点击"添加记录"
// 3. 复制上面的 bookData 内容（不包括 _openid，系统会自动添加）
// 4. 点击"确定"

// 方法2：通过云函数添加
exports.main = async (context) => {
  const db = cloud.database();
  
  try {
    const result = await db.collection('novels').add({
      data: {
        name: '我 中国队长',
        author: '未知',
        intro: '超过10MB的大型小说',
        category: '未分类',
        format: 'TXT',
        fileID: 'cloud://cloud1-3ge5gomsffe800a7.636c-cloud1-3ge5gomsffe800a7-1373366709/小说/我 中国队长.txt',
        cloudPath: '小说/我 中国队长.txt',
        size: 10485760,
        sizeText: '> 10 MB',
        uploadTime: Date.now()
      }
    });
    
    return {
      success: true,
      message: '书籍添加成功',
      id: result._id
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
};
