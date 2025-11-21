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
 * 搜索小说 - 直接使用笔趣阁（更可靠）
 * @param {string} keyword - 搜索关键词
 * @returns {Promise<Array>} 小说列表
 */
const searchNovel = (keyword) => {
  return new Promise((resolve, reject) => {
    if (!keyword || !keyword.trim()) {
      return reject(new Error('搜索关键词不能为空'));
    }

    console.log('开始搜索:', keyword);

    // 直接使用笔趣阁搜索（追书神器API已失效）
    wx.request({
      url: `${config.novelApiBase}/modules/article/search.php`,
      data: {
        searchkey: keyword.trim()
      },
      method: 'GET',
      header: {
        'content-type': 'application/x-www-form-urlencoded'
      },
      success: (res) => {
        try {
          console.log('笔趣阁搜索响应状态:', res.statusCode);
          console.log('响应数据类型:', typeof res.data);
          
          if (typeof res.data !== 'string') {
            console.error('返回数据不是HTML字符串');
            return resolve([]);
          }
          
          const html = res.data;
          const books = [];
          
          // 笔趣阁搜索结果多种解析策略
          console.log('开始解析HTML，长度:', html.length);
          
          // 策略1: 搜索结果列表项
          const listItemRegex = /<tr[^>]*>[\s\S]*?<td[^>]*class="odd"[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([^<]+)<\/a>[\s\S]*?<td[^>]*>([^<]*)<\/td>[\s\S]*?<td[^>]*>([^<]*)<\/td>[\s\S]*?<\/tr>/gi;
          let match;
          
          while ((match = listItemRegex.exec(html)) !== null && books.length < 20) {
            const url = match[1];
            const name = stripHtml(match[2]).trim();
            const author = stripHtml(match[3]).trim();
            const lastChapter = stripHtml(match[4]).trim();
            
            if (name && name.length > 1) {
              books.push({
                id: `book_${Date.now()}_${books.length}`,
                name: name,
                author: author || '未知作者',
                intro: lastChapter ? `最新章节: ${lastChapter}` : '暂无简介',
                url: url.startsWith('http') ? url : `${config.novelApiBase}${url}`,
                cover: '',
                lastChapter: lastChapter
              });
            }
          }
          
          console.log('策略1解析结果数量:', books.length);
          
          // 策略2: 如果策略1没结果，尝试更通用的链接匹配
          if (books.length === 0) {
            const linkRegex = /<a[^>]*href=["']([^"']*\/\d+_\d+\/[^"']*)["'][^>]*>([^<]+)<\/a>/gi;
            const bookSet = new Set();
            
            while ((match = linkRegex.exec(html)) !== null && books.length < 20) {
              const url = match[1];
              const name = stripHtml(match[2]).trim();
              
              if (name.length > 2 && name.length < 50 && !bookSet.has(name)) {
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
            }
            
            console.log('策略2解析结果数量:', books.length);
          }
          
          // 策略3: 最宽松的匹配
          if (books.length === 0) {
            const anyLinkRegex = /<a[^>]*href=["']([^"']*book[^"']*)["'][^>]*>([^<]+)<\/a>/gi;
            const bookSet = new Set();
            
            while ((match = anyLinkRegex.exec(html)) !== null && books.length < 15) {
              const url = match[1];
              const name = stripHtml(match[2]).trim();
              
              if (name.length > 2 && name.length < 50 && !bookSet.has(name)) {
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
            }
            
            console.log('策略3解析结果数量:', books.length);
          }
          
          console.log('最终解析到的书籍数量:', books.length);
          console.log('书籍列表:', books);
          
          resolve(books);
        } catch (error) {
          console.error('解析搜索结果失败:', error);
          reject(new Error('解析搜索结果失败: ' + error.message));
        }
      },
      fail: (err) => {
        console.error('搜索请求失败:', err);
        reject(new Error('网络请求失败，请检查网络连接'));
      }
    });
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
