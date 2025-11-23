// 检查书架数据和数据库结构
// 在微信开发者工具调试器控制台运行

console.log('=== 检查书架数据 ===\n');

// 1. 查询数据库中的小说
wx.cloud.database().collection('novels')
  .orderBy('uploadTime', 'desc')
  .limit(10)
  .get()
  .then(res => {
    console.log('📚 数据库中的小说数量:', res.data.length);
    
    if (res.data.length === 0) {
      console.log('❌ 数据库为空！');
      return;
    }
    
    console.log('\n📖 第一本书的数据结构:');
    const firstBook = res.data[0];
    console.log('完整数据:', firstBook);
    
    console.log('\n🔍 字段检查:');
    console.log('✅ _id:', firstBook._id);
    console.log('📌 title (新):', firstBook.title);
    console.log('📌 name (旧):', firstBook.name);
    console.log('👤 author:', firstBook.author);
    console.log('📝 description (新):', firstBook.description);
    console.log('📝 intro (旧):', firstBook.intro);
    console.log('📁 fileID:', firstBook.fileID);
    console.log('💾 fileSize (新):', firstBook.fileSize);
    console.log('💾 size (旧):', firstBook.size);
    console.log('📄 totalPages:', firstBook.totalPages);
    console.log('🔤 totalChars:', firstBook.totalChars);
    console.log('⏰ uploadTime:', firstBook.uploadTime);
    
    console.log('\n✨ 所有字段:');
    Object.keys(firstBook).forEach(key => {
      console.log(`  - ${key}: ${typeof firstBook[key]}`);
    });
    
    // 2. 检查书架页面数据
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    
    if (currentPage.route === 'pages/novel/shelf/shelf') {
      console.log('\n📱 书架页面数据:');
      console.log('bookList 长度:', currentPage.data.bookList?.length || 0);
      if (currentPage.data.bookList?.length > 0) {
        console.log('第一本书显示名称:', currentPage.data.bookList[0].name);
        console.log('完整数据:', currentPage.data.bookList[0]);
      }
    }
  })
  .catch(err => {
    console.error('❌ 查询失败:', err);
    
    if (err.errCode === -502005) {
      console.log('\n💡 数据库集合 novels 不存在！');
      console.log('请在云开发控制台创建 novels 集合');
    }
  });

console.log('\n⏳ 查询中，请稍候...\n');
