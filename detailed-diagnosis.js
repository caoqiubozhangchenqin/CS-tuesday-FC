// 🔍 详细诊断 - 为什么权限修复后还是看不到书
// 在微信开发者工具 Console 中执行

console.log('=== 详细诊断开始 ===\n');

const db = wx.cloud.database();

// 1. 验证权限是否真的修复了
console.log('[检查1] 验证权限是否修复...');
db.collection('novels').count()
  .then(res => {
    console.log('✅ 权限已修复，数据库中共有', res.total, '本书');
  })
  .catch(err => {
    console.log('❌ 权限仍有问题:', err.errCode, err.errMsg);
    console.log('请确认已在云开发控制台修改权限并保存！');
  });

// 2. 查询《我 中国队长》的完整信息
console.log('\n[检查2] 查询《我 中国队长》详细信息...');
db.collection('novels')
  .where({ name: '我 中国队长' })
  .get()
  .then(res => {
    if (res.data.length > 0) {
      const book = res.data[0];
      console.log('✅ 找到书籍！完整信息如下：');
      console.log('   _id:', book._id);
      console.log('   name:', book.name);
      console.log('   author:', book.author);
      console.log('   format:', book.format);
      console.log('   fileID:', book.fileID);
      console.log('   uploadTime:', book.uploadTime, '→', new Date(book.uploadTime));
      console.log('   size:', book.size);
      console.log('   sizeText:', book.sizeText);
      
      // 检查关键字段
      if (!book.uploadTime) {
        console.log('⚠️ 缺少 uploadTime 字段！');
      }
      if (book.uploadTime && book.uploadTime < Date.now() - 30*24*60*60*1000) {
        console.log('⚠️ uploadTime 超过30天，可能被排在很后面');
      }
    } else {
      console.log('❌ 数据库中没有这本书！');
    }
  });

// 3. 模拟书架的查询（完全按照 shelf.js 的逻辑）
console.log('\n[检查3] 模拟书架查询逻辑...');
db.collection('novels')
  .orderBy('uploadTime', 'desc')
  .limit(100)
  .get()
  .then(result => {
    console.log('✅ 查询成功，共', result.data.length, '本书');
    console.log('前10本书（按 uploadTime 排序）:');
    result.data.slice(0, 10).forEach((book, i) => {
      console.log(`   ${i+1}. ${book.name} (${new Date(book.uploadTime).toLocaleString()})`);
    });
    
    const targetIndex = result.data.findIndex(b => b.name === '我 中国队长');
    if (targetIndex >= 0) {
      console.log(`\n✅ 《我 中国队长》在第 ${targetIndex + 1} 位`);
      if (targetIndex >= 10) {
        console.log('⚠️ 排名较后，可能需要滚动才能看到');
      }
    } else {
      console.log('\n❌ 《我 中国队长》不在查询结果中！');
    }
  })
  .catch(err => {
    console.log('❌ 查询失败:', err);
  });

// 4. 检查当前页面状态
console.log('\n[检查4] 检查当前页面数据...');
const pages = getCurrentPages();
if (pages.length > 0) {
  const currentPage = pages[pages.length - 1];
  console.log('当前页面:', currentPage.route);
  
  if (currentPage.route === 'pages/novel/shelf/shelf') {
    console.log('✅ 在书架页面');
    console.log('页面显示的书籍数量:', currentPage.data.totalBooks);
    console.log('页面书籍列表:', currentPage.data.bookList.map(b => b.name));
    
    const hasBook = currentPage.data.bookList.find(b => b.name === '我 中国队长');
    if (hasBook) {
      console.log('✅ 页面数据中有《我 中国队长》！');
    } else {
      console.log('❌ 页面数据中没有《我 中国队长》');
      console.log('问题：页面数据未刷新');
    }
  } else {
    console.log('⚠️ 不在书架页面，请先进入书架');
  }
}

// 5. 提供解决方案
console.log('\n[解决方案]');
console.log('如果上面显示"❌ 页面数据中没有"，执行以下代码刷新：');
console.log('\n// 强制刷新书架页面');
console.log('wx.reLaunch({ url: "/pages/novel/shelf/shelf" });');
console.log('\n// 或手动调用加载方法');
console.log('getCurrentPages()[getCurrentPages().length-1].loadCloudBooks();');

console.log('\n=== 诊断完成 ===');
