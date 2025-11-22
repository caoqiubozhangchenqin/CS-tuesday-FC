// 检查《我 中国队长》是否在数据库中
// 在微信开发者工具控制台执行此代码

wx.cloud.database().collection('novels')
  .where({
    name: '我 中国队长'
  })
  .get()
  .then(res => {
    console.log('📚 查询结果:', res);
    if (res.data.length > 0) {
      console.log('✅ 找到书籍:', res.data[0]);
      console.log('书籍ID:', res.data[0]._id);
      console.log('文件ID:', res.data[0].fileID);
    } else {
      console.log('❌ 数据库中没有这本书');
      console.log('需要执行添加操作');
    }
  })
  .catch(err => {
    console.error('❌ 查询失败:', err);
  });
