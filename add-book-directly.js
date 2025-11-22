// 🚀 直接添加《我 中国队长》到数据库（不使用云函数）
// 在微信开发者工具控制台执行

console.log('开始添加书籍...');

const db = wx.cloud.database();

db.collection('novels').add({
  data: {
    name: '我 中国队长',
    author: '未知作者',
    intro: '一本超过10MB的大型小说，讲述中国队长的故事。',
    category: '未分类',
    format: 'TXT',
    fileID: 'cloud://cloud1-3ge5gomsffe800a7.636c-cloud1-3ge5gomsffe800a7-1373366709/小说/我 中国队长.txt',
    cloudPath: '小说/我 中国队长.txt',
    cover: '',
    size: 10485760,
    sizeText: '> 10 MB',
    uploadTime: Date.now()
  }
})
.then(res => {
  console.log('✅ 添加成功！');
  console.log('书籍ID:', res._id);
  wx.showToast({
    title: '已添加到书架',
    icon: 'success'
  });
  
  // 验证是否添加成功
  db.collection('novels').doc(res._id).get().then(result => {
    console.log('✅ 验证成功，书籍信息:', result.data);
  });
})
.catch(err => {
  console.error('❌ 添加失败:', err);
  console.error('错误代码:', err.errCode);
  console.error('错误信息:', err.errMsg);
  
  // 根据错误给出建议
  if (err.errCode === -502005) {
    console.log('🔧 解决方案：novels 集合不存在');
    console.log('   请在云开发控制台创建 novels 集合');
  } else if (err.errCode === -502003) {
    console.log('🔧 解决方案：没有写入权限');
    console.log('   请检查 novels 集合的权限设置');
    console.log('   应该设置为：仅创建者可读写');
  } else {
    console.log('🔧 其他错误，请检查网络和数据库状态');
  }
});
