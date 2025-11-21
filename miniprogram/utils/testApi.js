// 测试追书神器API
const novelApi = require('./novelApi.js');

/**
 * 测试搜索功能
 */
const testSearch = () => {
  console.log('\n========== 测试搜索API ==========');
  
  const testKeywords = ['斗破苍穹', '三体', '遮天'];
  
  testKeywords.forEach(keyword => {
    console.log(`\n测试搜索: ${keyword}`);
    
    novelApi.searchNovel(keyword)
      .then(books => {
        console.log(`✅ 成功！找到 ${books.length} 本书`);
        if (books.length > 0) {
          console.log('第一本:', books[0].name, 'by', books[0].author);
          console.log('ID:', books[0].id);
          console.log('封面:', books[0].cover);
        }
      })
      .catch(error => {
        console.error(`❌ 失败:`, error.message);
      });
  });
};

/**
 * 测试获取章节列表
 */
const testChapterList = (bookId = '5816b415b06d1d32157790b1') => {
  console.log('\n========== 测试章节列表API ==========');
  console.log('书籍ID:', bookId);
  
  novelApi.getChapterList(bookId)
    .then(result => {
      console.log('✅ 成功！');
      console.log('书名:', result.bookInfo.name);
      console.log('作者:', result.bookInfo.author);
      console.log('章节数:', result.chapters.length);
      if (result.chapters.length > 0) {
        console.log('第一章:', result.chapters[0].title);
        console.log('章节链接:', result.chapters[0].link);
      }
    })
    .catch(error => {
      console.error('❌ 失败:', error.message);
    });
};

/**
 * 测试获取章节内容
 */
const testChapterContent = (chapter) => {
  console.log('\n========== 测试章节内容API ==========');
  
  if (!chapter) {
    console.error('❌ 需要提供章节对象');
    return;
  }
  
  novelApi.getChapterContent(chapter)
    .then(result => {
      console.log('✅ 成功！');
      console.log('标题:', result.title);
      console.log('内容长度:', result.content.length);
      console.log('内容预览:', result.content.substring(0, 100) + '...');
    })
    .catch(error => {
      console.error('❌ 失败:', error.message);
    });
};

module.exports = {
  testSearch,
  testChapterList,
  testChapterContent
};
