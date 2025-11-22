// 🔍 完整诊断脚本 - 检查《我 中国队长》添加失败的原因
// 在微信开发者工具控制台执行

console.log('=== 开始诊断 ===');

// 1. 检查云函数是否存在
console.log('\n[步骤1] 检查云函数...');
wx.cloud.callFunction({
  name: 'addBookToShelf',
  data: { test: true }
})
.then(res => {
  console.log('✅ 云函数存在且可调用');
})
.catch(err => {
  console.error('❌ 云函数不存在或未部署:', err);
  console.log('🔧 解决方案：');
  console.log('   1. 找到 cloudfunctions/addBookToShelf 文件夹');
  console.log('   2. 右键 -> 上传并部署：云端安装依赖');
});

// 2. 检查数据库集合是否存在
console.log('\n[步骤2] 检查数据库集合...');
const db = wx.cloud.database();
db.collection('novels').count()
  .then(res => {
    console.log('✅ novels 集合存在，当前有', res.total, '本书');
  })
  .catch(err => {
    console.error('❌ novels 集合不存在或无权限:', err);
    console.log('🔧 解决方案：在云开发控制台创建 novels 集合');
  });

// 3. 检查是否已有《我 中国队长》
console.log('\n[步骤3] 检查《我 中国队长》是否存在...');
db.collection('novels')
  .where({ name: '我 中国队长' })
  .get()
  .then(res => {
    if (res.data.length > 0) {
      console.log('✅ 书籍已存在！');
      console.log('书籍信息:', res.data[0]);
      console.log('\n💡 如果书架上看不到：');
      console.log('   1. 检查 _openid 是否是您的（books集合权限问题）');
      console.log('   2. 刷新书架页面');
      console.log('   3. 检查书架代码是否正确加载数据');
    } else {
      console.log('❌ 书籍不存在，需要添加');
      console.log('\n🔧 执行添加操作：');
      console.log('复制以下代码到控制台执行：\n');
      console.log(`wx.cloud.callFunction({
  name: 'addBookToShelf',
  data: {
    name: '我 中国队长',
    author: '未知作者',
    intro: '一本超过10MB的大型小说',
    category: '未分类',
    format: 'TXT',
    fileID: 'cloud://cloud1-3ge5gomsffe800a7.636c-cloud1-3ge5gomsffe800a7-1373366709/小说/我 中国队长.txt',
    cloudPath: '小说/我 中国队长.txt',
    size: 10485760,
    sizeText: '> 10 MB'
  }
}).then(res => console.log('✅ 添加成功:', res));`);
    }
  })
  .catch(err => {
    console.error('❌ 查询失败:', err);
  });

// 4. 检查云存储文件是否存在
console.log('\n[步骤4] 检查云存储文件...');
wx.cloud.downloadFile({
  fileID: 'cloud://cloud1-3ge5gomsffe800a7.636c-cloud1-3ge5gomsffe800a7-1373366709/小说/我 中国队长.txt'
})
.then(res => {
  console.log('✅ 文件存在于云存储');
  console.log('临时链接:', res.tempFilePath);
})
.catch(err => {
  console.error('❌ 文件不存在或无权限:', err);
  console.log('🔧 请检查 fileID 是否正确');
});

// 5. 检查当前用户 openid
console.log('\n[步骤5] 检查用户身份...');
wx.cloud.callFunction({
  name: 'login'
})
.then(res => {
  console.log('✅ 当前用户 openid:', res.result.openid);
})
.catch(err => {
  console.error('❌ 无法获取 openid:', err);
});

console.log('\n=== 诊断完成 ===');
console.log('📝 请查看上方输出，找到带 ❌ 的错误信息');
