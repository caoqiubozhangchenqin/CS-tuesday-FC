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
 * 搜索小说
 * @param {string} keyword - 搜索关键词
 * @returns {Promise<Array>} 小说列表
 */
const searchNovel = (keyword) => {
  return new Promise((resolve, reject) => {
    if (!keyword || !keyword.trim()) {
      return reject(new Error('搜索关键词不能为空'));
    }

    wx.request({
      url: `${config.novelApiBase}/search.php`,
      data: {
        q: keyword.trim()
      },
      method: 'GET',
      success: (res) => {
        try {
          const html = res.data;
          const books = [];
          
          // 使用正则匹配书籍信息
          // 笔趣阁搜索结果格式: <div class="result-item">...</div>
          const itemRegex = /<div class="result-item[^"]*">[\s\S]*?<\/div>/g;
          const matches = html.match(itemRegex) || [];
          
          matches.forEach((item, index) => {
            // 提取书名和链接
            const nameMatch = item.match(/<a[^>]*href="([^"]*)"[^>]*>([^<]+)<\/a>/);
            // 提取作者
            const authorMatch = item.match(/作者[：:]\s*([^<\s]+)/);
            // 提取简介
            const introMatch = item.match(/简介[：:]\s*([^<]+)/);
            
            if (nameMatch) {
              books.push({
                id: `book_${Date.now()}_${index}`,
                name: stripHtml(nameMatch[2]),
                author: authorMatch ? stripHtml(authorMatch[1]) : '未知作者',
                intro: introMatch ? stripHtml(introMatch[1]).substring(0, 100) : '暂无简介',
                url: nameMatch[1].startsWith('http') ? nameMatch[1] : `${config.novelApiBase}${nameMatch[1]}`,
                cover: '' // 笔趣阁通常没有封面
              });
            }
          });
          
          // 如果正则匹配失败，尝试简化版匹配
          if (books.length === 0) {
            const simpleRegex = /<a[^>]*href="([^"]*book[^"]*)"[^>]*>([^<]+)<\/a>/g;
            let match;
            let count = 0;
            while ((match = simpleRegex.exec(html)) !== null && count < 10) {
              books.push({
                id: `book_${Date.now()}_${count}`,
                name: stripHtml(match[2]),
                author: '未知作者',
                intro: '点击查看详情',
                url: match[1].startsWith('http') ? match[1] : `${config.novelApiBase}${match[1]}`,
                cover: ''
              });
              count++;
            }
          }
          
          resolve(books);
        } catch (error) {
          reject(new Error('解析搜索结果失败'));
        }
      },
      fail: (err) => {
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
    wx.request({
      url: bookUrl,
      method: 'GET',
      success: (res) => {
        try {
          const html = res.data;
          const chapters = [];
          
          // 提取章节列表
          const chapterRegex = /<dd><a href="([^"]+)">([^<]+)<\/a><\/dd>/g;
          let match;
          let index = 0;
          
          while ((match = chapterRegex.exec(html)) !== null) {
            chapters.push({
              id: index++,
              title: stripHtml(match[2]),
              url: match[1].startsWith('http') ? match[1] : `${config.novelApiBase}${match[1]}`
            });
          }
          
          // 提取书籍信息
          const nameMatch = html.match(/<h1>([^<]+)<\/h1>/);
          const authorMatch = html.match(/作者[：:]\s*([^<\s]+)/);
          
          resolve({
            bookInfo: {
              name: nameMatch ? stripHtml(nameMatch[1]) : '未知书名',
              author: authorMatch ? stripHtml(authorMatch[1]) : '未知作者'
            },
            chapters
          });
        } catch (error) {
          reject(new Error('解析章节列表失败'));
        }
      },
      fail: (err) => {
        reject(new Error('获取章节列表失败'));
      }
    });
  });
};

/**
 * 获取章节内容
 * @param {string} chapterUrl - 章节URL
 * @returns {Promise<Object>} { title, content }
 */
const getChapterContent = (chapterUrl) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: chapterUrl,
      method: 'GET',
      success: (res) => {
        try {
          const html = res.data;
          
          // 提取章节标题
          const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
          const title = titleMatch ? stripHtml(titleMatch[1]) : '正文';
          
          // 提取章节内容 - 笔趣阁内容通常在 <div id="content">
          let content = extractText(html, '<div id="content">', '</div>');
          
          // 如果没找到，尝试其他常见格式
          if (!content) {
            content = extractText(html, '<div class="content">', '</div>');
          }
          
          // 清理内容
          content = stripHtml(content)
            .replace(/\s+/g, ' ') // 合并多余空格
            .replace(/。/g, '。\n\n') // 句号后换行
            .trim();
          
          if (!content) {
            return reject(new Error('无法获取章节内容'));
          }
          
          resolve({
            title,
            content
          });
        } catch (error) {
          reject(new Error('解析章节内容失败'));
        }
      },
      fail: (err) => {
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
