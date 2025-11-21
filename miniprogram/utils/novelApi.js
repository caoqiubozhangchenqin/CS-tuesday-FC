// 小说API工具类 - 笔趣阁HTML解析
const config = require('../config/env.js');

/**
 * HTML解析辅助函数 - 提取文本内容
 */
const extractText = (html, startTag, endTag) => {
  const start = html.indexOf(startTag);
  if (start === -1) return '';
  
  const contentStart = start + startTag.length;
  const end = html.indexOf(endTag, contentStart);
  if (end === -1) return '';
  
  return html.substring(contentStart, end).trim();
};

/**
 * 移除HTML标签
 */
const stripHtml = (html) => {
  return html
    .replace(/<[^>]+>/g, '') // 移除所有标签
    .replace(/&nbsp;/g, ' ') // 替换空格
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim();
};

/**
 * 搜索小说 - 使用免费聚合API
 * @param {string} keyword - 搜索关键词
 * @returns {Promise<Array>} 小说列表
 */
const searchNovel = (keyword) => {
  return new Promise((resolve, reject) => {
    if (!keyword || !keyword.trim()) {
      return reject(new Error('搜索关键词不能为空'));
    }

    console.log('开始搜索:', keyword);

    // 使用免费的书源API（支持跨域）
    wx.request({
      url: 'https://api.xiaoshuoworld.com/search',
      data: {
        keyword: keyword.trim(),
        page: 1,
        limit: 20
      },
      method: 'GET',
      success: (res) => {
        try {
          console.log('搜索API响应:', res);
          
          if (res.statusCode !== 200) {
            console.error('API返回错误状态:', res.statusCode);
            // 降级到备用方案
            return searchNovelFromBaidu(keyword).then(resolve).catch(reject);
          }
          
          if (!res.data || !res.data.list) {
            console.log('无搜索结果，尝试备用方案');
            return searchNovelFromBaidu(keyword).then(resolve).catch(reject);
          }
          
          const books = res.data.list.map((book, index) => ({
            id: book.id || `book_${Date.now()}_${index}`,
            name: book.name || book.title || '未知书名',
            author: book.author || '未知作者',
            intro: (book.intro || book.desc || '暂无简介').substring(0, 100),
            url: book.url || book.link || '',
            cover: book.cover || book.image || '',
            lastChapter: book.lastChapter || ''
          }));
          
          console.log('解析后的书籍列表:', books);
          resolve(books);
        } catch (error) {
          console.error('解析搜索结果失败:', error);
          // 降级到备用方案
          searchNovelFromBaidu(keyword).then(resolve).catch(reject);
        }
      },
      fail: (err) => {
        console.error('搜索请求失败:', err);
        // 降级到备用方案
        searchNovelFromBaidu(keyword).then(resolve).catch(reject);
      }
    });
  });
};

/**
 * 备用方案：使用百度搜索笔趣阁
 */
const searchNovelFromBaidu = (keyword) => {
  return new Promise((resolve, reject) => {
    console.log('使用百度搜索备用方案');
    
    // 返回模拟数据供演示
    const mockBooks = [
      {
        id: 'mock_1',
        name: keyword,
        author: '示例作者',
        intro: '这是一个示例书籍。真实环境需要配置可用的小说API。请在env.js中配置可访问的笔趣阁域名。',
        url: 'https://www.example.com/book/1',
        cover: '',
        lastChapter: '第一章'
      }
    ];
    
    console.log('返回示例数据（请配置真实API）');
    wx.showModal({
      title: '提示',
      content: '当前使用演示数据。\n\n要使用真实小说数据，请：\n1. 找一个可访问的笔趣阁网站\n2. 在浏览器测试能否打开\n3. 配置到 config/env.js\n4. 添加到小程序合法域名',
      showCancel: false
    });
    
    resolve(mockBooks);
  });
};

/**
 * 获取小说章节列表
 * @param {string} bookUrl - 小说详情页URL
 * @returns {Promise<Object>} { bookInfo, chapters }
 */
const getChapterList = (bookUrl) => {
  return new Promise((resolve, reject) => {
    console.log('获取章节列表:', bookUrl);
    
    // 直接使用笔趣阁HTML解析（追书神器已失效）
    getChapterListFromBiquge(bookUrl).then(resolve).catch(reject);
  });
};

/**
 * 从笔趣阁获取章节列表
 */
const getChapterListFromBiquge = (bookUrl) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: bookUrl,
      method: 'GET',
      success: (res) => {
        try {
          console.log('笔趣阁章节页响应');
          const html = res.data;
          const chapters = [];
          
          // 多种章节匹配规则
          const patterns = [
            /<dd><a href="([^"]+)">([^<]+)<\/a><\/dd>/g,
            /<li><a href="([^"]+)">([^<]+)<\/a><\/li>/g,
            /<a href="([^"]+\.html)"[^>]*>([^<]+)<\/a>/g
          ];
          
          for (const pattern of patterns) {
            let match;
            let index = 0;
            const tempChapters = [];
            
            while ((match = pattern.exec(html)) !== null && index < 1000) {
              tempChapters.push({
                id: index++,
                title: stripHtml(match[2]),
                url: match[1].startsWith('http') ? match[1] : `${config.novelApiBase}${match[1]}`
              });
            }
            
            if (tempChapters.length > chapters.length) {
              chapters.length = 0;
              chapters.push(...tempChapters);
            }
          }
          
          // 提取书籍信息
          const nameMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
          const authorMatch = html.match(/作者[：:]\s*([^<\s]+)/);
          
          console.log('解析到章节数:', chapters.length);
          
          if (chapters.length === 0) {
            return reject(new Error('未找到章节列表'));
          }
          
          resolve({
            bookInfo: {
              name: nameMatch ? stripHtml(nameMatch[1]) : '未知书名',
              author: authorMatch ? stripHtml(authorMatch[1]) : '未知作者'
            },
            chapters
          });
        } catch (error) {
          console.error('解析章节列表失败:', error);
          reject(new Error('解析章节列表失败: ' + error.message));
        }
      },
      fail: (err) => {
        console.error('获取章节列表失败:', err);
        reject(new Error('获取章节列表失败'));
      }
    });
  });
};

/**
 * 获取章节内容
 * @param {Object} chapter - 章节对象（包含url）
 * @returns {Promise<Object>} { title, content }
 */
const getChapterContent = (chapter) => {
  return new Promise((resolve, reject) => {
    const url = chapter.url;
    
    console.log('获取章节内容:', url);
    
    // 直接使用笔趣阁HTML解析（追书神器已失效）
    getChapterContentFromBiquge(url).then(resolve).catch(reject);
  });
};

/**
 * 从笔趣阁获取章节内容
 */
const getChapterContentFromBiquge = (chapterUrl) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: chapterUrl,
      method: 'GET',
      success: (res) => {
        try {
          console.log('笔趣阁章节内容响应');
          const html = res.data;
          
          // 提取章节标题
          const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
          const title = titleMatch ? stripHtml(titleMatch[1]) : '正文';
          
          // 提取章节内容 - 尝试多种格式
          let content = '';
          const contentPatterns = [
            { start: '<div id="content">', end: '</div>' },
            { start: '<div class="content">', end: '</div>' },
            { start: '<div class="showtxt">', end: '</div>' },
            { start: '<div id="chaptercontent">', end: '</div>' }
          ];
          
          for (const pattern of contentPatterns) {
            content = extractText(html, pattern.start, pattern.end);
            if (content) break;
          }
          
          // 清理内容
          if (content) {
            content = stripHtml(content)
              .replace(/\s+/g, ' ') // 合并多余空格
              .replace(/。/g, '。\n\n') // 句号后换行
              .replace(/！/g, '！\n\n')
              .replace(/？/g, '？\n\n')
              .trim();
          }
          
          if (!content) {
            return reject(new Error('无法获取章节内容'));
          }
          
          resolve({
            title,
            content
          });
        } catch (error) {
          console.error('解析章节内容失败:', error);
          reject(new Error('解析章节内容失败: ' + error.message));
        }
      },
      fail: (err) => {
        console.error('获取章节内容失败:', err);
        reject(new Error('获取章节内容失败'));
      }
    });
  });
};

module.exports = {
  searchNovel,
  getChapterList,
  getChapterContent
};
