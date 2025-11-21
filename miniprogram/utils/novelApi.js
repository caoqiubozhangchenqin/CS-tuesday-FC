// 小说API工具类 - 追书神器API
const config = require('../config/env.js');

// 追书神器API基础地址（多个备用）
const API_BASES = [
  'https://api.zhuishushenqi.com',
  'https://api05iye5.zhuishushenqi.com'
];

// 章节内容API
const CHAPTER_API = 'https://chapterup.zhuishushenqi.com/chapter';

// 当前使用的API地址索引
let currentApiIndex = 0;

/**
 * 获取当前API基础地址
 */
const getApiBase = () => API_BASES[currentApiIndex];

/**
 * 切换到下一个API地址
 */
const switchApiBase = () => {
  currentApiIndex = (currentApiIndex + 1) % API_BASES.length;
  console.log('切换API地址:', getApiBase());
};

/**
 * 搜索小说 - 使用追书神器API
 * @param {string} keyword - 搜索关键词
 * @returns {Promise<Array>} 小说列表
 */
const searchNovel = (keyword) => {
  return new Promise((resolve, reject) => {
    if (!keyword || !keyword.trim()) {
      return reject(new Error('搜索关键词不能为空'));
    }

    console.log('🔍 搜索小说:', keyword);

    // 使用模糊搜索接口
    wx.request({
      url: `${getApiBase()}/book/fuzzy-search`,
      data: {
        query: keyword.trim()
      },
      method: 'GET',
      success: (res) => {
        try {
          console.log('✅ 搜索响应:', res.statusCode);
          
          if (res.statusCode !== 200) {
            // 尝试切换API地址
            switchApiBase();
            return resolve([]);
          }

          const books = (res.data.books || []).map(book => ({
            id: book._id,
            name: book.title,
            author: book.author,
            intro: book.shortIntro || book.longIntro || '暂无简介',
            url: book._id, // 使用bookId作为url
            cover: book.cover ? book.cover.replace('/agent/', '') : '',
            lastChapter: book.lastChapter || '',
            tags: book.tags || [],
            wordCount: book.wordCount || 0,
            retentionRatio: book.retentionRatio || 0
          }));

          console.log(`✅ 搜索到 ${books.length} 本书`);
          resolve(books);
        } catch (error) {
          console.error('❌ 解析搜索结果失败:', error);
          reject(error);
        }
      },
      fail: (err) => {
        console.error('❌ 搜索请求失败:', err);
        // 尝试切换API地址
        switchApiBase();
        reject(new Error('网络请求失败'));
      }
    });
  });
};

/**
 * 获取章节列表 - 追书神器API
 * @param {string} bookId - 书籍ID
 * @returns {Promise<Object>} { bookInfo, chapters }
 */
const getChapterList = (bookId) => {
  return new Promise((resolve, reject) => {
    console.log('📚 获取章节列表:', bookId);
    
    // 先获取书籍信息
    wx.request({
      url: `${getApiBase()}/book/${bookId}`,
      method: 'GET',
      success: (bookRes) => {
        if (bookRes.statusCode !== 200) {
          return reject(new Error('获取书籍信息失败'));
        }

        const bookInfo = {
          name: bookRes.data.title || '未知书名',
          author: bookRes.data.author || '未知作者',
          cover: bookRes.data.cover || '',
          intro: bookRes.data.longIntro || bookRes.data.shortIntro || ''
        };

        // 获取章节列表（使用混合源）
        wx.request({
          url: `${getApiBase()}/mix-atoc/${bookId}`,
          data: {
            view: 'chapters'
          },
          method: 'GET',
          success: (chaptersRes) => {
            try {
              if (chaptersRes.statusCode !== 200) {
                return reject(new Error('获取章节列表失败'));
              }

              const mixToc = chaptersRes.data.mixToc || {};
              const chapters = (mixToc.chapters || []).map((chapter, index) => ({
                id: index,
                title: chapter.title,
                link: chapter.link,
                unreadble: chapter.unreadble || false
              }));

              console.log(`✅ 获取到 ${chapters.length} 章`);
              
              resolve({
                bookInfo,
                chapters,
                sourceId: mixToc._id // 保存源ID用于获取内容
              });
            } catch (error) {
              console.error('❌ 解析章节列表失败:', error);
              reject(error);
            }
          },
          fail: (err) => {
            console.error('❌ 获取章节列表失败:', err);
            reject(err);
          }
        });
      },
      fail: (err) => {
        console.error('❌ 获取书籍信息失败:', err);
        reject(err);
      }
    });
  });
};

/**
 * 获取章节内容 - 追书神器API
 * @param {Object} chapter - 章节对象
 * @returns {Promise<Object>} { title, content }
 */
const getChapterContent = (chapter) => {
  return new Promise((resolve, reject) => {
    console.log('📖 获取章节内容:', chapter.title);
    
    if (!chapter.link) {
      return reject(new Error('章节链接无效'));
    }

    // 使用章节内容API
    wx.request({
      url: `${CHAPTER_API}/${encodeURIComponent(chapter.link)}`,
      method: 'GET',
      success: (res) => {
        try {
          if (res.statusCode !== 200) {
            return reject(new Error('获取章节内容失败'));
          }

          const chapterData = res.data.chapter || {};
          let content = chapterData.body || chapterData.cpContent || '';

          // 格式化内容：添加段落
          if (content) {
            content = content
              .replace(/\n\s*\n/g, '\n\n')  // 规范化空行
              .split('\n')
              .map(line => line.trim())
              .filter(line => line.length > 0)
              .map(line => `    ${line}`)  // 每段前添加缩进
              .join('\n\n');
          }

          if (!content) {
            return reject(new Error('章节内容为空'));
          }

          resolve({
            title: chapterData.title || chapter.title,
            content: content
          });
        } catch (error) {
          console.error('❌ 解析章节内容失败:', error);
          reject(error);
        }
      },
      fail: (err) => {
        console.error('❌ 获取章节内容失败:', err);
        reject(err);
      }
    });
  });
};

module.exports = {
  searchNovel,
  getChapterList,
  getChapterContent
};
