// 云函数：解析小说文件（TXT/EPUB）
const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

/**
 * 解析TXT文件
 */
async function parseTXT(fileID) {
  try {
    // 下载文件
    const result = await cloud.downloadFile({
      fileID: fileID
    });

    // 读取文件内容
    const buffer = result.fileContent;
    let content = buffer.toString('utf-8');

    // 如果是乱码，尝试GBK编码
    if (content.includes('�')) {
      const iconv = require('iconv-lite');
      content = iconv.decode(buffer, 'gbk');
    }

    // 按章节分割
    const chapters = [];
    
    // 尝试多种章节分割方式（优先匹配更具体的格式）
    // ⚠️ 使用(?:^|\n) 确保章节标记在行首，避免误匹配正文中的词语
    // ⚠️ 不支持"回"格式，避免与"回合"等词混淆
    const patterns = [
      // 格式：第XXX卷 XXX章 标题（必须在行首）
      /(?:^|\n)(第[零〇一二三四五六七八九十百千万0-9]+卷\s*第[零〇一二三四五六七八九十百千万0-9]+[章节][\s:：].{0,50})/g,
      // 格式：第XXX卷 标题（必须在行首）
      /(?:^|\n)(第[零〇一二三四五六七八九十百千万0-9]+卷[\s:：].{0,50})/g,
      // 格式：第XXX章 标题 或 第XXX节 标题（必须在行首）
      /(?:^|\n)(第[零〇一二三四五六七八九十百千万0-9]+[章节][\s:：].{0,50})/g,
      // 格式：第XXX卷（必须在行首）
      /(?:^|\n)(第[零〇一二三四五六七八九十百千万0-9]+卷)/g,
      // 格式：第XXX章 或 第XXX节（必须在行首）
      /(?:^|\n)(第[零〇一二三四五六七八九十百千万0-9]+[章节])/g,
      // 格式：第XXX: 标题（有些书用半角冒号，必须在行首）
      /(?:^|\n)(第[0-9]+[:：].{0,50})/g,
      // 格式：纯数字章节（必须在行首）
      /(?:^|\n)(第[0-9]+章)/g,
      // 英文格式（必须在行首）
      /(?:^|\n)(Chapter\s*[0-9]+)/gi,
      /(?:^|\n)(Volume\s*[0-9]+)/gi
    ];

    let chapterMatches = [];
    for (const pattern of patterns) {
      const matches = [...content.matchAll(pattern)];
      if (matches.length > 0) {
        // 过滤掉匹配结果，移除捕获组中的换行符
        chapterMatches = matches.map(match => {
          // match[1] 是实际的章节标题（不包含前面的\n）
          return {
            ...match,
            0: match[1] || match[0], // 使用捕获组的内容
            index: match.index + (match[0].startsWith('\n') ? 1 : 0) // 调整索引，跳过换行符
          };
        });
        break;
      }
    }

    if (chapterMatches.length > 0) {
      // 找到章节标记
      for (let i = 0; i < chapterMatches.length; i++) {
        const match = chapterMatches[i];
        let title = match[0].trim();
        
        // 清理标题：去掉多余空格和标点
        title = title.replace(/\s+/g, ' ').trim();
        
        // 提取更完整的标题（向后查找到换行符或一定长度）
        const titleStartIndex = match.index;
        const titleEndIndex = Math.min(
          content.indexOf('\n', titleStartIndex),
          titleStartIndex + 100
        );
        
        if (titleEndIndex > titleStartIndex) {
          const fullTitle = content.substring(titleStartIndex, titleEndIndex).trim();
          // 如果完整标题比匹配到的长，且不超过100字符，使用完整标题
          if (fullTitle.length > title.length && fullTitle.length <= 100) {
            title = fullTitle;
          }
        }
        
        const startIndex = match.index;
        const endIndex = i < chapterMatches.length - 1 
          ? chapterMatches[i + 1].index 
          : content.length;

        const chapterContent = content.substring(startIndex, endIndex).trim();

        chapters.push({
          id: i,
          title: title,
          content: chapterContent,
          link: `chapter_${i}`
        });
      }
    } else {
      // 没有找到章节标记，按空行分段
      const paragraphs = content.split(/\n\s*\n+/);
      const chunkSize = Math.ceil(paragraphs.length / 100); // 分成约100章

      for (let i = 0; i < Math.min(100, paragraphs.length); i++) {
        const start = i * chunkSize;
        const end = Math.min((i + 1) * chunkSize, paragraphs.length);
        const chapterContent = paragraphs.slice(start, end).join('\n\n').trim();

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
      chapters: chapters,
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

    // 批量保存到数据库（每次最多20条）
    const batchSize = 20;
    for (let i = 0; i < chaptersToSave.length; i += batchSize) {
      const batch = chaptersToSave.slice(i, i + batchSize);
      
      const promises = batch.map(chapter => {
        return db.collection('novel_chapters').add({
          data: {
            novelId: novelId,
            chapterId: chapter.id,
            title: chapter.title,
            content: chapter.content,
            link: chapter.link,
            createTime: db.serverDate()
          }
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
