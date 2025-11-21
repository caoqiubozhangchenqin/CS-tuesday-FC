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
 * 搜索小说 - 使用追书神器API（更稳定）
 * @param {string} keyword - 搜索关键词
 * @returns {Promise<Array>} 小说列表
 */
const searchNovel = (keyword) => {
  return new Promise((resolve, reject) => {
    if (!keyword || !keyword.trim()) {
      return reject(new Error('搜索关键词不能为空'));
    }

    // 使用追书神器API
    wx.request({
      url: 'http://api.zhuishushenqi.com/book/fuzzy-search',
      data: {
        query: keyword.trim()
      },
      method: 'GET',
      success: (res) => {
        try {
          console.log('搜索API响应:', res);
          
          if (!res.data || !res.data.books) {
            return resolve([]);
          }
          
          const books = res.data.books.map((book, index) => ({
            id: book._id || `book_${Date.now()}_${index}`,
            name: book.title || book.name || '未知书名',
            author: book.author || '未知作者',
            intro: (book.shortIntro || book.intro || '暂无简介').substring(0, 100),
            url: book._id, // 存储bookId，后续用于获取章节
            cover: book.cover || '',
            lastChapter: book.lastChapter || ''
          }));
          
          console.log('解析后的书籍列表:', books);
          resolve(books);
        } catch (error) {
          console.error('解析搜索结果失败:', error);
          reject(new Error('解析搜索结果失败: ' + error.message));
        }
      },
      fail: (err) => {
        console.error('搜索请求失败:', err);
        // 如果追书神器API失败，降级使用笔趣阁
        searchNovelFromBiquge(keyword).then(resolve).catch(reject);
      }
    });
  });
};

/**
 * 备用方案：笔趣阁搜索（简化版）
 */
const searchNovelFromBiquge = (keyword) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${config.novelApiBase}/s.php`,
      data: {
        s: 1,
        q: keyword.trim()
      },
      method: 'GET',
      success: (res) => {
        try {
          console.log('笔趣阁搜索响应:', res);
          const html = res.data;
          const books = [];
          
          // 更通用的匹配规则
          // 匹配所有包含书籍链接的a标签
          const linkRegex = /<a[^>]*href=["']([^"']*(?:book|read)[^"']*)["'][^>]*>([^<]+)<\/a>/gi;
          let match;
          const bookSet = new Set(); // 去重
          
          while ((match = linkRegex.exec(html)) !== null && books.length < 20) {
            const url = match[1];
            const name = stripHtml(match[2]);
            
            // 过滤掉太短或明显不是书名的内容
            if (name.length < 2 || name.length > 50) continue;
            if (bookSet.has(name)) continue;
            
            bookSet.add(name);
            books.push({
              id: `book_${Date.now()}_${books.length}`,
              name: name,
              author: '未知作者',
              intro: '点击查看详情',
              url: url.startsWith('http') ? url : `${config.novelApiBase}${url}`,
              cover: ''
            });
          }
          
          console.log('笔趣阁解析结果:', books);
          resolve(books);
        } catch (error) {
          console.error('笔趣阁解析失败:', error);
          reject(new Error('解析失败: ' + error.message));
        }
      },
      fail: (err) => {
        console.error('笔趣阁请求失败:', err);
        reject(new Error('网络请求失败，请检查网络连接'));
      }
    });
  });
};

/**
 * 获取小说章节列表
 * @param {string} bookIdOrUrl - 书籍ID（追书神器）或URL（笔趣阁）
 * @returns {Promise<Object>} { bookInfo, chapters }
 */
const getChapterList = (bookIdOrUrl) => {
  return new Promise((resolve, reject) => {
    // 判断是bookId还是URL
    const isUrl = bookIdOrUrl.startsWith('http');
    
    if (!isUrl) {
      // 使用追书神器API获取章节
      getChapterListFromZhuishu(bookIdOrUrl).then(resolve).catch(() => {
        // 降级到笔趣阁
        reject(new Error('无法获取章节列表，请尝试其他书籍'));
      });
    } else {
      // 使用笔趣阁HTML解析
      getChapterListFromBiquge(bookIdOrUrl).then(resolve).catch(reject);
    }
  });
};

/**
 * 从追书神器获取章节列表
 */
const getChapterListFromZhuishu = (bookId) => {
  return new Promise((resolve, reject) => {
    // 先获取书源
    wx.request({
      url: `http://api.zhuishushenqi.com/atoc`,
      data: {
        view: 'summary',
        book: bookId
      },
      method: 'GET',
      success: (res) => {
        console.log('书源响应:', res);
        
        if (!res.data || res.data.length === 0) {
          return reject(new Error('未找到书源'));
        }
        
        // 使用第一个书源
        const source = res.data[0];
        
        // 获取章节列表
        wx.request({
          url: `http://api.zhuishushenqi.com/atoc/${source._id}`,
          data: { view: 'chapters' },
          method: 'GET',
          success: (chapterRes) => {
            console.log('章节列表响应:', chapterRes);
            
            if (!chapterRes.data || !chapterRes.data.chapters) {
              return reject(new Error('章节列表为空'));
            }
            
            const chapters = chapterRes.data.chapters.map((chapter, index) => ({
              id: index,
              title: chapter.title,
              link: chapter.link, // 章节链接（用于获取内容）
              chapterId: chapter.id || chapter._id
            }));
            
            resolve({
              bookInfo: {
                name: chapterRes.data.name || '未知书名',
                author: chapterRes.data.author || '未知作者'
              },
              chapters
            });
          },
          fail: () => reject(new Error('获取章节列表失败'))
        });
      },
      fail: () => reject(new Error('获取书源失败'))
    });
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
 * @param {Object} chapter - 章节对象（包含url或link）
 * @returns {Promise<Object>} { title, content }
 */
const getChapterContent = (chapter) => {
  return new Promise((resolve, reject) => {
    // 判断是追书神器还是笔趣阁
    const url = chapter.link || chapter.url;
    const isZhuishu = chapter.link && chapter.chapterId;
    
    if (isZhuishu) {
      // 使用追书神器章节API
      wx.request({
        url: `http://chapter2.zhuishushenqi.com/chapter/${encodeURIComponent(chapter.link)}`,
        method: 'GET',
        success: (res) => {
          console.log('追书神器章节内容响应:', res);
          
          if (res.data && res.data.chapter) {
            const content = res.data.chapter.body || res.data.chapter.cpContent || '';
            resolve({
              title: res.data.chapter.title || chapter.title,
              content: content.replace(/\n/g, '\n\n').trim()
            });
          } else {
            reject(new Error('章节内容为空'));
          }
        },
        fail: () => {
          reject(new Error('获取章节内容失败'));
        }
      });
    } else {
      // 使用笔趣阁HTML解析
      getChapterContentFromBiquge(url).then(resolve).catch(reject);
    }
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
