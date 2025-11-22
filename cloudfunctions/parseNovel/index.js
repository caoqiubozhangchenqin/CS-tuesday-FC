// 云函数：解析小说文件（TXT/EPUB）
const cloud = require('wx-server-sdk');
const iconv = require('iconv-lite');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const numberPattern = '[零〇一二三四五六七八九十百千万0-9]+';
const suffixPattern = '(章|节|回|卷|集|部|篇|话)';
const separatorPattern = '[\\s、:：—·•　-]{1,3}';
const leadingWhitespacePattern = '[\\s\t\u3000\u00A0\uFEFF]*';
const buildPattern = (body, flags = 'g') => new RegExp(`(?:^|\n)${leadingWhitespacePattern}(${body})`, flags);

// 改进的章节识别模式 - 优先识别最常见的格式
const chapterPatterns = [
  // 最优先：单独的章节标记（第一章、第1章等）
  buildPattern(`^第${numberPattern}[章节回](?![卷])`, 'gm'),
  // 卷+章节组合格式
  buildPattern(`第${numberPattern}卷\\s*第${numberPattern}[章节回]`, 'gm'),
  // 独立的卷标记（但要确保后面没有紧跟章节）
  buildPattern(`^第${numberPattern}卷(?!\\s*第)`, 'gm'),
  // 带标题的章节
  buildPattern(`第${numberPattern}[章节回]${separatorPattern}.{1,50}`, 'gm'),
  // 纯数字章节（如：1、2、3 或 1. 2. 3.）
  buildPattern(`^\\s*\\d+[.、]\\s*.{0,50}`, 'gm'),
  // 中文数字章节（如：一、二、三）
  buildPattern(`^[一二三四五六七八九十百千]+[、.]\\s*.{0,50}`, 'gm'),
  // 序号+标题格式（如：1 疯狂年代、2 沉默的大多数）
  buildPattern(`^\\d+\\s+[\\u4e00-\\u9fa5].{0,50}`, 'gm'),
  // 英文格式
  buildPattern('Chapter\\s*\\d+[^\\n]{0,50}', 'gi'),
  buildPattern('Volume\\s*\\d+[^\\n]{0,50}', 'gi'),
  // 纯标题格式（用于《三体》等书籍，如：疯狂年代、沉默的大多数）
  // 特征：单独一行，长度在2-30字之间，不包含常见非标题词
  buildPattern(`^[\\u4e00-\\u9fa5]{2,30}(?![\\u4e00-\\u9fa5]{10,})`, 'gm')
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
    const encodings = ['utf8', 'utf16le', 'utf16be', 'gb18030', 'gbk', 'gb2312', 'big5', 'shift_jis', 'euc-kr'];
    let maxScore = -Infinity;

    for (const encoding of encodings) {
      try {
        const content = encoding === 'utf8'
          ? buffer.toString('utf8')
          : iconv.decode(buffer, encoding);

        // 改进的评分算法
        const chineseChars = (content.match(/[\u4e00-\u9fa5]/g) || []).length;
        const japaneseChars = (content.match(/[\u3040-\u309f\u30a0-\u30ff]/g) || []).length;
        const koreanChars = (content.match(/[\uac00-\ud7af]/g) || []).length;
        const englishChars = (content.match(/[a-zA-Z]/g) || []).length;
        const numbers = (content.match(/[0-9]/g) || []).length;
        const punctuation = (content.match(/[,.!?;:'"()[\]{}]/g) || []).length;
        const invalidChars = (content.match(/�/g) || []).length;
        const controlChars = (content.match(/[\x00-\x1F\x7F-\x9F]/g) || []).length;
        
        // 计算可读字符比例
        const totalChars = content.length;
        const readableChars = chineseChars + japaneseChars + koreanChars + englishChars + numbers + punctuation;
        const readability = totalChars > 0 ? readableChars / totalChars : 0;
        
        // 综合评分
        const score = chineseChars * 3 + japaneseChars * 2 + koreanChars * 2 + 
                     englishChars * 1 + numbers * 1 + punctuation * 0.5 + 
                     readability * 100 - invalidChars * 20 - controlChars * 5;

        console.log(`尝试 ${encoding} 编码: 中文=${chineseChars}, 日文=${japaneseChars}, 韩文=${koreanChars}, 英文=${englishChars}, 数字=${numbers}, 标点=${punctuation}, 乱码=${invalidChars}, 控制=${controlChars}, 可读性=${(readability * 100).toFixed(1)}%, 得分=${score.toFixed(1)}`);

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

  // 改进的文本清洗
  return bestContent
    .replace(/\uFEFF/g, '')  // 移除 BOM
    .replace(/\r\n/g, '\n')  // 统一换行符
    .replace(/\r/g, '\n')
    .replace(/\t/g, '  ')   // 制表符转空格
    .replace(/[\u2000-\u200F\u2028-\u202F\u205F-\u206F]/g, ' ') // 特殊空白字符转普通空格
    .replace(/[ ]{2,}/g, ' ')  // 多个空格合并
    .replace(/\n{4,}/g, '\n\n\n')  // 过多换行合并
    .replace(/^\s+|\s+$/gm, '')   // 移除行首尾空白
    .replace(/^\s*$/gm, '')       // 移除空行
    .replace(/\n\s*\n/g, '\n\n')  // 清理多余空行
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

    // 尝试所有模式，记录匹配结果
    for (let p = 0; p < chapterPatterns.length; p++) {
      const pattern = chapterPatterns[p];
      const matches = [...content.matchAll(pattern)];
      
      console.log(`尝试模式 ${p + 1}/${chapterPatterns.length}: 找到 ${matches.length} 个匹配`);
      
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

          // 改进过滤逻辑：只过滤明显的非章节内容
          // 过滤包含"回合"、"回复"、"回答"的情况
          if (item.text.includes('回合') || item.text.includes('回复') || item.text.includes('回答')) {
            return false;
          }

          // 过滤过短的匹配（可能是误匹配）- 但保留中文短标题
          if (item.text.length < 2) {
            return false;
          }

          // 如果是纯中文且长度合理，可能是标题，保留
          if (/^[\u4e00-\u9fa5]{2,30}$/.test(item.text)) {
            return true;
          }

          // 过滤只包含数字且过长的匹配
          if (/^\d+$/.test(item.text) && item.text.length > 3) {
            return false;
          }

          // 过滤明显的非章节内容（包含过多标点符号）
          const punctuationRatio = (item.text.match(/[，。！？、；：""''（）《》【】]/g) || []).length / item.text.length;
          if (punctuationRatio > 0.3) {
            return false;
          }

          return true;
        });

      if (normalized.length > 0) {
        console.log(`✅ 模式 ${p + 1} 有效匹配: ${normalized.length} 个章节`);
        console.log(`前3个章节示例:`, normalized.slice(0, 3).map(n => n.text));
        chapterMatches = normalized;
        break;
      }
    }

    if (chapterMatches.length) {
      // 限制单章内容长度（避免写入超限）
      const maxChapterContentLength = 80 * 1024; // 80KB
      
      // 对章节进行排序，确保按在文本中的出现顺序
      chapterMatches.sort((a, b) => a.index - b.index);
      
      for (let i = 0; i < chapterMatches.length; i++) {
        const match = chapterMatches[i];
        let title = match.text;

        // 智能提取标题：去除多余的标点和空格
        title = title
          .replace(/^[第章节节回卷集部篇话\s\d零〇一二三四五六七八九十百千万]+/g, '') // 去除章节前缀
          .replace(/^[.、:：—·•\s-]+/g, '') // 去除分隔符
          .replace(/[.、:：—·•\s-]+$/g, '') // 去除末尾分隔符
          .trim();

        // 如果标题为空，使用默认格式
        if (!title) {
          title = `第${i + 1}章`;
        }

        // 限制标题长度
        if (title.length > 100) {
          title = title.substring(0, 100) + '...';
        }

        const titleStartIndex = match.index;
        const nextLineBreak = content.indexOf('\n', titleStartIndex);
        const safeEnd = nextLineBreak === -1 ? content.length : nextLineBreak;
        const titleEndIndex = Math.min(safeEnd, titleStartIndex + 200); // 扩大搜索范围

        // 尝试在标题行中找到更完整的标题
        if (titleEndIndex > titleStartIndex) {
          const fullTitleLine = content.substring(titleStartIndex, titleEndIndex).trim();
          // 如果整行更长且包含中文，可能是更完整的标题
          if (fullTitleLine.length > title.length && /[\u4e00-\u9fa5]/.test(fullTitleLine)) {
            const cleanTitle = fullTitleLine
              .replace(/^[第章节节回卷集部篇话\s\d零〇一二三四五六七八九十百千万.、:：—·•-]+/g, '')
              .replace(/[.、:：—·•\s-]+$/g, '')
              .trim();
            if (cleanTitle && cleanTitle.length <= 100) {
              title = cleanTitle;
            }
          }
        }

        const startIndex = match.index;
        const endIndex = i < chapterMatches.length - 1
          ? chapterMatches[i + 1].index
          : content.length;
        let chapterContent = content.substring(startIndex, endIndex).trim();
        
        // 移除章节标题行（避免重复显示）
        const firstLineBreak = chapterContent.indexOf('\n');
        if (firstLineBreak !== -1) {
          const firstLine = chapterContent.substring(0, firstLineBreak).trim();
          // 如果第一行看起来像标题，则移除
          if (firstLine.includes(title) || title.includes(firstLine) || firstLine.length < 50) {
            chapterContent = chapterContent.substring(firstLineBreak + 1).trim();
          }
        }
        
        // 截断超长章节
        if (chapterContent.length > maxChapterContentLength) {
          chapterContent = chapterContent.substring(0, maxChapterContentLength) + '\n\n（本章内容过长，已截断）';
        }

        // 跳过空章节
        if (chapterContent.length < 10) {
          continue;
        }

        chapters.push({
          id: i,
          title,
          content: chapterContent,
          link: `chapter_${i}`
        });
      }
    } else {
      // fallback 按段落分章（改进版：智能分段）
      const paragraphs = content.split(/\n\s*\n+/).filter(p => p.trim().length > 0);
      
      if (paragraphs.length === 0) {
        throw new Error('文件内容为空或无法解析');
      }

      // 根据内容长度动态调整分章策略
      let chunkSize;
      if (paragraphs.length <= 50) {
        // 短文，按每5段分章
        chunkSize = 5;
      } else if (paragraphs.length <= 200) {
        // 中等长度，按每10段分章
        chunkSize = 10;
      } else {
        // 长文，按每20段分章
        chunkSize = 20;
      }

      const maxChapterContentLength = 80 * 1024; // 80KB

      for (let i = 0; i < Math.min(100, paragraphs.length); i += chunkSize) {
        const start = i;
        const end = Math.min(i + chunkSize, paragraphs.length);
        let chapterContent = paragraphs.slice(start, end).join('\n\n').trim();
        
        // 截断超长章节
        if (chapterContent.length > maxChapterContentLength) {
          chapterContent = chapterContent.substring(0, maxChapterContentLength) + '\n\n（本章内容过长，已截断）';
        }

        // 生成智能标题
        let title;
        const firstPara = paragraphs[start].trim();
        
        if (firstPara.length < 30 && /[\u4e00-\u9fa5]/.test(firstPara)) {
          // 如果第一段较短且包含中文，可能是标题
          title = firstPara;
        } else {
          // 使用默认标题
          title = `第${Math.floor(i / chunkSize) + 1}章`;
        }

        if (chapterContent.length > 0) {
          chapters.push({
            id: Math.floor(i / chunkSize),
            title,
            content: chapterContent,
            link: `chapter_${Math.floor(i / chunkSize)}`
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

  console.log('解析文件:', { fileID, format, novelId });

  // 参数验证
  if (!fileID || !format || !novelId) {
    return {
      success: false,
      message: '参数不完整：缺少 fileID、format 或 novelId'
    };
  }

  if (!['TXT', 'EPUB'].includes(format.toUpperCase())) {
    return {
      success: false,
      message: '不支持的文件格式，仅支持 TXT 和 EPUB'
    };
  }

  try {
    let result;

    if (format.toUpperCase() === 'TXT') {
      result = await parseTXT(fileID);
    } else if (format.toUpperCase() === 'EPUB') {
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
    let savedCount = 0;
    let failedCount = 0;

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
        }).then(() => {
          savedCount++;
          return { success: true };
        }).catch(err => {
          console.error(`保存章节 ${chapter.id} 失败:`, err);
          failedCount++;
          return { success: false, error: err };
        });
      });

      await Promise.all(promises);
      console.log(`已保存章节 ${i + 1} - ${Math.min(i + batchSize, chaptersToSave.length)}`);
    }

    // 返回详细的处理结果
    const message = chaptersToSave.length < chapters.length 
      ? `已保存前 ${maxChapters} 章（共 ${chapters.length} 章）` 
      : `成功保存所有 ${chaptersToSave.length} 章`;

    if (failedCount > 0) {
      return {
        success: true,
        chapterCount: savedCount,
        message: `${message}，但有 ${failedCount} 章保存失败`,
        warning: `部分章节保存失败，请重试或联系管理员`
      };
    }

    // 🎯 只返回元数据，不返回章节内容
    return {
      success: true,
      chapterCount: savedCount,
      message: message
    };

  } catch (error) {
    console.error('解析失败:', error);
    
    // 详细的错误分类
    let errorMessage = '解析失败';
    if (error.message.includes('文件下载失败')) {
      errorMessage = '文件下载失败，请检查文件是否存在或网络连接';
    } else if (error.message.includes('文件内容为空')) {
      errorMessage = '文件内容为空，请检查文件是否损坏';
    } else if (error.message.includes('无效的EPUB文件')) {
      errorMessage = 'EPUB文件格式错误，请检查文件是否完整';
    } else if (error.message.includes('编码')) {
      errorMessage = '文件编码识别失败，建议使用UTF-8编码保存';
    } else if (error.message.includes('数据库')) {
      errorMessage = '数据保存失败，请重试或联系管理员';
    }

    return {
      success: false,
      message: errorMessage,
      error: error.message
    };
  }
};
