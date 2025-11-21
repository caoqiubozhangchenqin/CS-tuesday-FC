// 小说API工具类 - 本地演示模式
const config = require('../config/env.js');

/**
 * 搜索小说 - 使用本地推荐数据
 * @param {string} keyword - 搜索关键词
 * @returns {Promise<Array>} 小说列表
 */
const searchNovel = (keyword) => {
  return new Promise((resolve, reject) => {
    if (!keyword || !keyword.trim()) {
      return reject(new Error('搜索关键词不能为空'));
    }

    console.log('🔍 开始搜索:', keyword);

    // 本地推荐书库（演示模式）
    const localBooks = [
      { name: '斗破苍穹', author: '天蚕土豆', intro: '三十年河东，三十年河西，莫欺少年穷！', tags: ['玄幻', '热血', '爽文'] },
      { name: '遮天', author: '辰东', intro: '冰冷与黑暗并存的宇宙深处，九具庞大的龙尸拉着一口青铜古棺...', tags: ['玄幻', '经典'] },
      { name: '完美世界', author: '辰东', intro: '一粒尘可填海，一根草斩尽日月星辰，弹指间天翻地覆。', tags: ['玄幻', '热血'] },
      { name: '武动乾坤', author: '天蚕土豆', intro: '修炼一途，乃窃阴阳，夺造化，转涅盘，握生死...', tags: ['玄幻', '修炼'] },
      { name: '大主宰', author: '天蚕土豆', intro: '大千世界，位面交汇，万族林立，群雄荟萃...', tags: ['玄幻', '热血'] },
      { name: '元尊', author: '天蚕土豆', intro: '吾有一口玄黄气，可吞天地日月星！', tags: ['玄幻', '逆袭'] },
      { name: '凡人修仙传', author: '忘语', intro: '一个普通山村穷小子，偶然之下，跨入到一个江湖小门派...', tags: ['修仙', '凡人流'] },
      { name: '斗罗大陆', author: '唐家三少', intro: '唐门外门弟子唐三，因偷学内门绝学为唐门所不容...', tags: ['玄幻', '魂师'] },
      { name: '三体', author: '刘慈欣', intro: '地球往事三部曲，科幻巨著！', tags: ['科幻', '硬核'] },
      { name: '全职高手', author: '蝴蝶蓝', intro: '网游荣耀中被誉为教科书级别的顶尖高手叶修...', tags: ['都市', '电竞'] },
      { name: '盘龙', author: '我吃西红柿', intro: '热血沸腾的盘龙世界，众多强者林立...', tags: ['玄幻', '经典'] },
      { name: '一念永恒', author: '耳根', intro: '一念成沧海，一念化桑田。一念斩千魔，一念诛万仙。', tags: ['仙侠', '耳根'] },
      { name: '我欲封天', author: '耳根', intro: '我若要有，天不可无！我若要无，天不可有！', tags: ['仙侠', '经典'] },
      { name: '仙逆', author: '耳根', intro: '顺为凡，逆则仙，只在心中一念间...', tags: ['仙侠', '逆天'] },
      { name: '择天记', author: '猫腻', intro: '太始元年，有神石自太空飞来，散落人间...', tags: ['仙侠', '猫腻'] },
      { name: '雪中悍刀行', author: '烽火戏诸侯', intro: '江湖是一张珠帘...', tags: ['武侠', '江湖'] },
      { name: '超神机械师', author: '齐佩甲', intro: '带着游戏面板穿越到星际时代...', tags: ['科幻', '游戏'] },
      { name: '诡秘之主', author: '爱潜水的乌贼', intro: '蒸汽与机械的时代...', tags: ['科幻', '克苏鲁'] },
      { name: '何以笙箫默', author: '顾漫', intro: '如果那时我没有放开你的手...', tags: ['言情', '经典'] },
      { name: '微微一笑很倾城', author: '顾漫', intro: '一场游戏中的相遇...', tags: ['言情', '游戏'] }
    ];

    // 模糊搜索
    const keywordLower = keyword.trim().toLowerCase();
    const results = localBooks.filter(book => {
      return book.name.toLowerCase().includes(keywordLower) || 
             book.author.toLowerCase().includes(keywordLower) ||
             book.intro.toLowerCase().includes(keywordLower);
    });

    // 格式化结果
    const books = results.map((book, index) => ({
      id: `book_${Date.now()}_${index}`,
      name: book.name,
      author: book.author,
      intro: book.intro,
      url: `https://demo.com/book/${encodeURIComponent(book.name)}`,
      cover: '',
      tags: book.tags
    }));

    console.log(`✅ 本地搜索到 ${books.length} 本书`);

    // 如果没有结果，返回推荐列表
    if (books.length === 0) {
      const recommendations = localBooks.slice(0, 5).map((book, index) => ({
        id: `book_${Date.now()}_${index}`,
        name: book.name,
        author: book.author,
        intro: book.intro,
        url: `https://demo.com/book/${encodeURIComponent(book.name)}`,
        cover: ''
      }));
      
      console.log('💡 未找到匹配结果，返回推荐书籍');
      resolve(recommendations);
    } else {
      resolve(books);
    }
  });
};

/**
 * 获取章节列表 - 本地生成演示数据
 * @param {string} bookUrl - 书籍URL
 * @returns {Promise<Object>} { bookInfo, chapters }
 */
const getChapterList = (bookUrl) => {
  return new Promise((resolve) => {
    console.log('📚 生成章节列表...');
    
    // 从URL提取书名
    const bookName = decodeURIComponent(bookUrl.split('/').pop());
    
    // 生成100章演示数据
    const chapters = [];
    for (let i = 1; i <= 100; i++) {
      chapters.push({
        id: i,
        title: `第${i}章 ${generateChapterTitle(i)}`,
        url: `${bookUrl}/chapter_${i}.html`
      });
    }
    
    console.log(`✅ 生成了 ${chapters.length} 章`);
    
    setTimeout(() => resolve({
      bookInfo: {
        name: bookName,
        author: '演示作者'
      },
      chapters
    }), 300);
  });
};

/**
 * 生成章节标题
 */
const generateChapterTitle = (index) => {
  const titles = [
    '初入江湖', '奇遇', '修炼', '突破', '挑战',
    '强敌', '逆袭', '成长', '危机', '转机',
    '觉醒', '蜕变', '决战', '胜利', '离别',
    '重逢', '历练', '顿悟', '飞升', '新篇章'
  ];
  return titles[(index - 1) % titles.length];
};

/**
 * 获取章节内容 - 本地生成演示内容
 * @param {Object} chapter - 章节对象
 * @returns {Promise<Object>} { title, content }
 */
const getChapterContent = (chapter) => {
  return new Promise((resolve) => {
    console.log('📖 生成章节内容...');
    
    const chapterIndex = chapter.id || 1;
    
    const content = `    这是第${chapterIndex}章的演示内容。
    
    ${generateDemoContent(chapterIndex)}
    
    ————————————
    
    【演示模式提示】
    
    当前为本地演示模式，章节内容为自动生成的示例文本。
    
    完整功能需要接入真实的小说API。由于笔趣阁等免费小说网站经常更换域名且有反爬虫机制，建议使用以下方案：
    
    💡 推荐方案：
    1. 接入正版小说API（如起点、番茄小说等）
    2. 搭建自己的小说爬虫服务器
    3. 使用开源的小说API项目（如 zhuishushenqi-api）
    
    ✅ 目前已实现的功能：
    • 书架管理（添加/删除/查看）
    • 搜索功能（本地书库20本）
    • 阅读界面（4种主题/字体调节/进度保存）
    • 推荐页面（50+热门小说分类推荐）
    • 章节导航（100章演示数据）
    
    所有数据保存在本地，不依赖外部API。`;
    
    const result = {
      title: `第${chapterIndex}章 ${generateChapterTitle(chapterIndex)}`,
      content: content.trim()
    };
    
    setTimeout(() => resolve(result), 300);
  });
};

/**
 * 生成演示内容
 */
const generateDemoContent = (chapterIndex) => {
  const paragraphs = [
    '天色渐晚，夕阳的余晖洒在大地上，给万物都镀上了一层金色的光芒。',
    '少年站在山顶，望着远方连绵起伏的群山，心中涌起一股豪情。',
    '"总有一天，我要站在这个世界的巅峰！"他握紧拳头，眼神坚定。',
    '山谷中传来阵阵兽吼，惊起无数飞鸟。一股强大的气息从深处传来。',
    '这片大陆，强者为尊，实力才是唯一的真理。弱者只能沦为他人的踏脚石。',
    '修炼之路漫漫，但他从未想过放弃。因为在他心中，有一个必须要守护的人。',
    '师父曾经说过，修炼不仅是力量的提升，更是心境的磨砺。',
    '"等我，我一定会回来的。"他转身下山，身影逐渐消失在暮色中。'
  ];
  
  // 根据章节数变化内容
  const start = ((chapterIndex - 1) * 3) % paragraphs.length;
  const selected = [];
  for (let i = 0; i < 5; i++) {
    selected.push(paragraphs[(start + i) % paragraphs.length]);
  }
  
  return selected.join('\n\n    ');
};

module.exports = {
  searchNovel,
  getChapterList,
  getChapterContent
};
