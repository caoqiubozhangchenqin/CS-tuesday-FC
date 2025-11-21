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
    
    // 尝试多种章节分割方式
    const patterns = [
      /第[零〇一二三四五六七八九十百千万0-9]+[章节回]/g,
      /第[0-9]+章/g,
      /Chapter\s*[0-9]+/gi
    ];

    let chapterMatches = [];
    for (const pattern of patterns) {
      const matches = [...content.matchAll(pattern)];
      if (matches.length > 0) {
        chapterMatches = matches;
        break;
      }
    }

    if (chapterMatches.length > 0) {
      // 找到章节标记
      for (let i = 0; i < chapterMatches.length; i++) {
        const match = chapterMatches[i];
        const title = match[0];
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
    
    for (let i = 0; i < spine.length; i++) {
      const idref = spine[i].$.idref;
      const manifestItem = manifest.find(item => item.$.id === idref);
      
      if (!manifestItem) continue;

      const href = manifestItem.$.href;
      
      // 读取章节内容
      const chapterEntry = zipEntries.find(entry => 
        entry.entryName.endsWith(href)
      );

      if (chapterEntry) {
        let html = chapterEntry.getData().toString('utf8');
        
        // 简单提取文本（去掉HTML标签）
        html = html
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<[^>]+>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&')
          .replace(/\s+/g, ' ')
          .trim();

        // 提取标题（通常是第一行）
        const lines = html.split('\n').filter(line => line.trim());
        const title = lines[0] || `第${i + 1}章`;
        const content = lines.slice(1).join('\n\n');

        chapters.push({
          id: i,
          title: title,
          content: content || html,
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
  const { fileID, format } = event;

  console.log('解析文件:', fileID, format);

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

    return result;

  } catch (error) {
    console.error('解析失败:', error);
    return {
      success: false,
      message: error.message
    };
  }
};
