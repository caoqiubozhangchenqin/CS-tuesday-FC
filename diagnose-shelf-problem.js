// 🔍 书架不显示书籍 - 完整诊断脚本
// 在微信开发者工具的 Console 中执行

console.log('=== 开始诊断书架问题 ===\n');

const db = wx.cloud.database();

// 1. 检查数据库中的书籍
console.log('[步骤1] 检查数据库中的《我 中国队长》...');
db.collection('novels')
  .where({ name: '我 中国队长' })
  .get()
  .then(res => {
    if (res.data.length > 0) {
      console.log('✅ 数据库中找到书籍:', res.data[0]);
      console.log('   书籍ID:', res.data[0]._id);
      console.log('   上传者 openid:', res.data[0]._openid);
      console.log('   fileID:', res.data[0].fileID);
      
      // 保存书籍ID供后续使用
      window.testBookId = res.data[0]._id;
    } else {
      console.log('❌ 数据库中没有找到书籍！');
    }
  });

// 2. 检查能否读取所有书籍（测试权限）
console.log('\n[步骤2] 检查 novels 集合权限...');
db.collection('novels')
  .limit(100)
  .get()
  .then(res => {
    console.log('✅ 可以读取 novels 集合，共', res.data.length, '本书');
    console.log('   所有书籍:', res.data.map(b => b.name));
    
    const targetBook = res.data.find(b => b.name === '我 中国队长');
    if (targetBook) {
      console.log('✅ 在列表中找到《我 中国队长》');
    } else {
      console.log('❌ 列表中没有《我 中国队长》');
    }
  })
  .catch(err => {
    console.log('❌ 读取失败:', err);
    if (err.errCode === -502003) {
      console.log('   问题：没有读取权限');
      console.log('   解决：将 novels 集合权限改为 {"read": true, ...}');
    }
  });

// 3. 检查 uploadTime 字段
console.log('\n[步骤3] 检查 uploadTime 排序...');
db.collection('novels')
  .orderBy('uploadTime', 'desc')
  .limit(10)
  .get()
  .then(res => {
    console.log('✅ 按 uploadTime 排序的前10本书:');
    res.data.forEach((book, index) => {
      console.log(`   ${index + 1}. ${book.name} (uploadTime: ${book.uploadTime})`);
    });
    
    const targetBook = res.data.find(b => b.name === '我 中国队长');
    if (targetBook) {
      console.log('✅ 《我 中国队长》在排序后的列表中');
    } else {
      console.log('⚠️ 《我 中国队长》不在前10本，可能 uploadTime 太旧');
    }
  })
  .catch(err => {
    console.log('❌ 排序查询失败:', err);
  });

// 4. 模拟书架页面的加载逻辑
console.log('\n[步骤4] 模拟书架 loadCloudBooks() 方法...');
db.collection('novels')
  .orderBy('uploadTime', 'desc')
  .limit(100)
  .get()
  .then(result => {
    console.log('✅ 模拟加载成功，共', result.data.length, '本书');
    
    const bookList = result.data.map(book => ({
      id: book._id,
      name: book.name,
      author: book.author,
      intro: book.intro || '暂无简介',
      category: book.category || '未分类',
      format: book.format,
      fileID: book.fileID,
      cloudPath: book.cloudPath,
      cover: book.cover || '',
      size: book.size,
      sizeText: book.sizeText,
      uploadTime: book.uploadTime
    }));
    
    console.log('   格式化后的书籍列表:', bookList.map(b => b.name));
    
    const targetBook = bookList.find(b => b.name === '我 中国队长');
    if (targetBook) {
      console.log('✅ 《我 中国队长》在最终列表中！');
      console.log('   书籍信息:', targetBook);
    } else {
      console.log('❌ 《我 中国队长》不在最终列表中');
    }
  })
  .catch(error => {
    console.log('❌ 模拟加载失败:', error);
  });

// 5. 检查当前页面是否是书架页面
console.log('\n[步骤5] 检查当前页面...');
const pages = getCurrentPages();
const currentPage = pages[pages.length - 1];
console.log('   当前页面路由:', currentPage.route);
if (currentPage.route === 'pages/novel/shelf/shelf') {
  console.log('✅ 当前在书架页面');
  console.log('   页面数据 bookList:', currentPage.data.bookList.map(b => b.name));
  console.log('   总书籍数:', currentPage.data.totalBooks);
  
  const targetBook = currentPage.data.bookList.find(b => b.name === '我 中国队长');
  if (targetBook) {
    console.log('✅ 页面数据中有《我 中国队长》');
  } else {
    console.log('❌ 页面数据中没有《我 中国队长》');
    console.log('   可能原因：页面没有刷新或数据加载失败');
  }
} else {
  console.log('⚠️ 当前不在书架页面，请先进入书架页面再运行诊断');
}

// 6. 强制刷新书架页面
console.log('\n[步骤6] 提供刷新方案...');
console.log('如果以上检查都通过，但还是看不到，执行以下代码强制刷新：');
console.log('\n// 方法1：重新加载书架页面');
console.log('wx.reLaunch({ url: "/pages/novel/shelf/shelf" });');
console.log('\n// 方法2：手动调用加载方法');
console.log('getCurrentPages()[getCurrentPages().length-1].loadCloudBooks();');

console.log('\n=== 诊断完成 ===');
console.log('请查看上方输出，找到 ❌ 标记的问题');
