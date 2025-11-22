// 云函数：解析小说文件（TXT/EPUB）
const cloud = require('wx-server-sdk');
const iconv = require('iconv-lite');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const numberPattern = '[零〇一二三四五六七八九十百千万0-9]+';
const suffixPattern = '(章|节|卷|回)';
const separatorPattern = '[\\s、:：—·•　-]{1,3}';
const leadingWhitespacePattern = '[\\s\t\u3000\u00A0\uFEFF]*';
const buildPattern = (body, flags = 'g') => new RegExp(`(?:^|\n)${leadingWhitespacePattern}(${body})`, flags);

const chapterPatterns = [
  // 格式：第XXX卷 第XXX章/节/回 标题
  buildPattern(`第${numberPattern}卷\\s*第${numberPattern}${suffixPattern}(?:${separatorPattern}.{0,50})?`),
  // 格式：第XXX卷 标题
  buildPattern(`第${numberPattern}卷(?:${separatorPattern}.{0,50})?`),
  // 格式：第XXX章/节/回 标题
  buildPattern(`第${numberPattern}${suffixPattern}(?:${separatorPattern}.{0,50})?`),
  // 格式：第XXX：标题（无章/节字样）
  buildPattern(`第${numberPattern}[：:].{0,50}`),
  // 英文格式
  buildPattern('Chapter\\s*\\d+[^\\n]{0,50}', 'gi'),
  buildPattern('Volume\\s*\\d+[^\\n]{0,50}', 'gi')
];

const detectEncodingByBOM = buffer => {
  if (buffer.length >= 2) {
    const b0 = buffer[0];
    const b1 = buffer[1];

    if (b0 === 0xFE && b1 === 0xFF) {
      return 'utf16be';
    }

    if (b0 === 0xFF && b1 === 0xFE) {
      return 'utf16le';
    }
  }

  if (buffer.length >= 3) {
    if (buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
      return 'utf8';
    }
  }

  return null;
};

const sanitizeContent = buffer => {
  const bomEncoding = detectEncodingByBOM(buffer);
  let bestContent = '';

  if (bomEncoding) {
    try {
      console.log(`检测到 BOM，按 ${bomEncoding} 解码`);
      if (bomEncoding === 'utf8') {
        bestContent = buffer.toString('utf8');
      } else {
        bestContent = iconv.decode(buffer, bomEncoding);
      }
    } catch (e) {
      console.error(`BOM 指定编码 ${bomEncoding} 解码失败:`, e.message);
      bestContent = '';
    }
  }

  // 如果 BOM 未检出或解码失败，则尝试多种编码评分
  if (!bestContent) {
    const encodings = ['utf8', 'utf16le', 'utf16be', 'gb18030', 'gbk', 'gb2312', 'big5'];
    let maxScore = -Infinity;

    for (const encoding of encodings) {
      try {
        const content = encoding === 'utf8'
          ? buffer.toString('utf8')
          : iconv.decode(buffer, encoding);

        const chineseChars = (content.match(/[\u4e00-\u9fa5]/g) || []).length;
        const invalidChars = (content.match(/�/g) || []).length;
        const printable = (content.match(/[\u0020-\u007e\u3000-\u303f\u4e00-\u9fa5]/g) || []).length;
        const score = chineseChars * 3 + printable - invalidChars * 12;

        console.log(`尝试 ${encoding} 编码: 中文=${chineseChars}, 乱码=${invalidChars}, 可读字符=${printable}, 得分=${score}`);

        if (score > maxScore) {
          maxScore = score;
          bestContent = content;
          console.log(`✅ 当前最佳编码: ${encoding}`);
        }
      } catch (e) {
        console.error(`${encoding} 解码失败:`, e.message);
      }
    }
  }

  if (!bestContent) {
    console.error('所有编码尝试失败，使用 UTF-8 作为后备');
    bestContent = buffer.toString('utf8');
  }

  return bestContent
    .replace(/\uFEFF/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\t/g, '  ')
    .replace(/[ ]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

/**
 * 解析TXT文件
 */
async function parseTXT(fileID) {
  try {
    const result = await cloud.downloadFile({ fileID });
    if (!result || !result.fileContent) {
      throw new Error('文件下载失败');
    }

    const content = sanitizeContent(result.fileContent);
    if (!content) {
      throw new Error('文件内容为空');
    }

    const chapters = [];
    let chapterMatches = [];

    for (const pattern of chapterPatterns) {
      const matches = [...content.matchAll(pattern)];
      if (!matches.length) {
        continue;
      }

      const normalized = matches
        .map(match => {
          const matchedText = (match[1] || match[0] || '').trim();
          const prefixLength = match[0].length - (match[1] ? match[1].length : 0);
          const index = match.index + prefixLength;
          return {
            index,
            text: matchedText
          };
        })
        .filter(item => {
          if (!item.text) {
            return false;
          }

          if (item.text.includes('回')) {
            const nextChar = content[item.index + item.text.length] || '';
            if (nextChar === '合') {
              return false;
            }
          }

          return true;
        });

      if (normalized.length) {
        chapterMatches = normalized;
        break;
      }
    }

    if (chapterMatches.length) {
      // 限制单章内容长度（避免写入超限）
      const maxChapterContentLength = 80 * 1024; // 80KB
      
      for (let i = 0; i < chapterMatches.length; i++) {
        const match = chapterMatches[i];
        let title = match.text;

        title = title.replace(/\s+/g, ' ').trim();

        const titleStartIndex = match.index;
        const nextLineBreak = content.indexOf('\n', titleStartIndex);
        const safeEnd = nextLineBreak === -1 ? content.length : nextLineBreak;
        const titleEndIndex = Math.min(safeEnd, titleStartIndex + 100);

        if (titleEndIndex > titleStartIndex) {
          const fullTitle = content.substring(titleStartIndex, titleEndIndex).trim();
          if (fullTitle.length > title.length && fullTitle.length <= 100) {
            title = fullTitle;
          }
        }

        const startIndex = match.index;
        const endIndex = i < chapterMatches.length - 1
          ? chapterMatches[i + 1].index
          : content.length;
        let chapterContent = content.substring(startIndex, endIndex).trim();
        
        // 截断超长章节
        if (chapterContent.length > maxChapterContentLength) {
          chapterContent = chapterContent.substring(0, maxChapterContentLength) + '\n\n（本章内容过长，已截断）';
        }

        chapters.push({
          id: i,
          title,
          content: chapterContent,
          link: `chapter_${i}`
        });
      }
    } else {
      // fallback 按段落分章（同样限制长度）
      const paragraphs = content.split(/\n\s*\n+/);
      const chunkSize = Math.ceil(paragraphs.length / 100) || 1;
      const maxChapterContentLength = 80 * 1024; // 80KB

      for (let i = 0; i < Math.min(100, paragraphs.length); i++) {
        const start = i * chunkSize;
        const end = Math.min((i + 1) * chunkSize, paragraphs.length);
        let chapterContent = paragraphs.slice(start, end).join('\n\n').trim();
        
        // 截断超长章节
        if (chapterContent.length > maxChapterContentLength) {
          chapterContent = chapterContent.substring(0, maxChapterContentLength) + '\n\n（本章内容过长，已截断）';
        }

        if (chapterContent.length > 0) {
          chapters.push({
            id: i,
            title: `第${i + 1}章`,
            content: chapterContent,
            link: `chapter_${i}`
          });
        }
      }
    }

    return {
      success: true,
      chapters,
      chapterCount: chapters.length
    };
  } catch (error) {
    console.error('解析TXT失败:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * 解析EPUB文件
 */
async function parseEPUB(fileID) {
  try {
    const AdmZip = require('adm-zip');
    const { parseStringPromise } = require('xml2js');

    // 下载文件
    const result = await cloud.downloadFile({
      fileID: fileID
    });

    // 解压EPUB（EPUB本质是ZIP文件）
    const zip = new AdmZip(result.fileContent);
    const zipEntries = zip.getEntries();

    // 查找content.opf文件
    let contentOpf = null;
    for (const entry of zipEntries) {
      if (entry.entryName.endsWith('.opf')) {
        contentOpf = entry.getData().toString('utf8');
        break;
      }
    }

    if (!contentOpf) {
      throw new Error('无效的EPUB文件：未找到.opf文件');
    }

    // 解析OPF文件
    const opf = await parseStringPromise(contentOpf);
    const manifest = opf.package.manifest[0].item;
    const spine = opf.package.spine[0].itemref;

    // 获取章节顺序
    const chapters = [];
    const maxChapters = 500; // 限制最大章节数
    
    // 限制处理的章节数量
    const spineToProcess = spine.slice(0, maxChapters);
    
    for (let i = 0; i < spineToProcess.length; i++) {
      const idref = spineToProcess[i].$.idref;
      const manifestItem = manifest.find(item => item.$.id === idref);
      
      if (!manifestItem) continue;

      const href = manifestItem.$.href;
      
      // 读取章节内容
      const chapterEntry = zipEntries.find(entry => 
        entry.entryName.endsWith(href)
      );

      if (chapterEntry) {
        let html = chapterEntry.getData().toString('utf8');
        
        // 提取文本并保留段落结构
        html = html
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<br\s*\/?>/gi, '\n')  // br 标签转换为换行
          .replace(/<\/p>/gi, '\n\n')     // p 标签结束转换为双换行
          .replace(/<\/div>/gi, '\n')     // div 标签结束转换为换行
          .replace(/<\/h[1-6]>/gi, '\n')  // 标题标签结束转换为换行
          .replace(/<[^>]+>/g, '')        // 删除其他 HTML 标签
          .replace(/&nbsp;/g, ' ')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&')
          .replace(/&quot;/g, '"')
          .replace(/[ \t]+/g, ' ')        // 多个空格/制表符合并为一个空格
          .replace(/\n\s+\n/g, '\n\n')    // 清理空白行之间的空格
          .replace(/\n{3,}/g, '\n\n')     // 多个连续换行合并为两个
          .trim();

        // 按段落分割
        const paragraphs = html.split(/\n\n+/).filter(p => p.trim());
        
        // 第一段可能是标题（判断长度 < 50 字符且只有一行）
        let title = `第${i + 1}章`;
        let contentParagraphs = paragraphs;
        
        if (paragraphs.length > 0) {
          const firstPara = paragraphs[0].trim();
          // 如果第一段较短且不包含换行，可能是标题
          if (firstPara.length < 50 && !firstPara.includes('\n')) {
            title = firstPara;
            contentParagraphs = paragraphs.slice(1);
          }
        }
        
        // 重新组合内容，保留段落结构（每段前加两个空格缩进）
        let content = contentParagraphs
          .map(para => '  ' + para.trim())  // 每段前加两个空格缩进
          .join('\n\n');  // 段落之间空一行
        
        // 限制单章内容长度（避免超大章节）
        const maxContentLength = 50000; // 约25000字
        if (content.length > maxContentLength) {
          content = content.substring(0, maxContentLength) + '\n\n（本章内容过长，已截断）';
        }

        chapters.push({
          id: i,
          title: title,
          content: content,
          link: `chapter_${i}`
        });
      }
    }

    return {
      success: true,
      chapters: chapters,
      chapterCount: chapters.length
    };

  } catch (error) {
    console.error('解析EPUB失败:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * 主函数
 */
exports.main = async (event, context) => {
  const { fileID, format, novelId } = event;

  console.log('解析文件:', fileID, format, novelId);

  try {
    let result;

    if (format === 'TXT') {
      result = await parseTXT(fileID);
    } else if (format === 'EPUB') {
      result = await parseEPUB(fileID);
    } else {
      return {
        success: false,
        message: '不支持的文件格式'
      };
    }

    if (!result.success) {
      return result;
    }

    // 🔥 关键优化：将章节保存到数据库，而不是返回
    const db = cloud.database();
    const _ = db.command;
    const chapters = result.chapters;
    
    // 限制章节数量（避免数据库压力）
    const maxChapters = 1000;
    const chaptersToSave = chapters.slice(0, maxChapters);

    console.log(`开始保存章节到数据库，共 ${chaptersToSave.length} 章`);

    // 批量保存到数据库（每次最多10条，单章最大100KB）
    const batchSize = 10;
    const maxChapterSize = 100 * 1024; // 100KB
    
    for (let i = 0; i < chaptersToSave.length; i += batchSize) {
      const batch = chaptersToSave.slice(i, i + batchSize);
      
      const promises = batch.map(chapter => {
        // 限制单章内容长度
        let content = chapter.content || '';
        if (content.length > maxChapterSize) {
          content = content.substring(0, maxChapterSize) + '\n\n（本章内容过长，已截断）';
          console.log(`章节 ${chapter.id} 内容过长，已截断至 ${maxChapterSize} 字符`);
        }
        
        return db.collection('novel_chapters').add({
          data: {
            novelId: novelId,
            chapterId: chapter.id,
            title: chapter.title,
            content: content,
            link: chapter.link,
            createTime: db.serverDate()
          }
        }).catch(err => {
          console.error(`保存章节 ${chapter.id} 失败:`, err);
          return { success: false, error: err };
        });
      });

      await Promise.all(promises);
      console.log(`已保存章节 ${i + 1} - ${Math.min(i + batchSize, chaptersToSave.length)}`);
    }

    // 🎯 只返回元数据，不返回章节内容
    return {
      success: true,
      chapterCount: chaptersToSave.length,
      message: chaptersToSave.length < chapters.length 
        ? `已保存前 ${maxChapters} 章` 
        : '所有章节已保存'
    };

  } catch (error) {
    console.error('解析失败:', error);
    return {
      success: false,
      message: error.message
    };
  }
};
