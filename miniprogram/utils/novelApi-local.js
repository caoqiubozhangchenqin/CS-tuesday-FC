// 小说API工具类 - 本地演示模式
// 由于追书神器API已失效，使用本地数据演示

// 本地演示书库（20本精选小说）
const LOCAL_BOOKS = [
  { id: 1, name: '斗破苍穹', author: '天蚕土豆', intro: '三十年河东，三十年河西，莫欺少年穷！萧炎，萧家废物少年，在经历退婚耻辱后，得到药老相助，踏上修炼之路...', cover: 'https://via.placeholder.com/300x400?text=斗破苍穹', tags: ['玄幻', '热血', '逆袭'] },
  { id: 2, name: '斗罗大陆', author: '唐家三少', intro: '唐门外门弟子唐三，因偷学内门绝学为唐门所不容，跳崖明志时却来到了另一个世界，一个属于武魂的世界...', cover: 'https://via.placeholder.com/300x400?text=斗罗大陆', tags: ['玄幻', '魂师', '经典'] },
  { id: 3, name: '遮天', author: '辰东', intro: '冰冷与黑暗并存的宇宙深处，九具庞大的龙尸拉着一口青铜古棺，亘古长存。这是太空探测器在枯寂的宇宙中捕捉到的震撼画面...', cover: 'https://via.placeholder.com/300x400?text=遮天', tags: ['玄幻', '经典', '热血'] },
  { id: 4, name: '完美世界', author: '辰东', intro: '一粒尘可填海，一根草斩尽日月星辰，弹指间天翻地覆。群雄并起，万族林立，诸圣争霸，乱天动地...', cover: 'https://via.placeholder.com/300x400?text=完美世界', tags: ['玄幻', '热血'] },
  { id: 5, name: '武动乾坤', author: '天蚕土豆', intro: '修炼一途，乃窃阴阳，夺造化，转涅盘，握生死，掌轮回。武之极，破苍穹，动乾坤！', cover: 'https://via.placeholder.com/300x400?text=武动乾坤', tags: ['玄幻', '修炼'] },
  { id: 6, name: '三体', author: '刘慈欣', intro: '地球往事三部曲，科幻巨著。文化大革命如火如荼进行的同时，军方探寻外星文明的绝秘计划"红岸工程"取得了突破性进展...', cover: 'https://via.placeholder.com/300x400?text=三体', tags: ['科幻', '硬核', '经典'] },
  { id: 7, name: '凡人修仙传', author: '忘语', intro: '一个普通山村穷小子，偶然之下，跨入到一个江湖小门派，虽然资质平庸，但依靠自身努力和合理算计最后修炼成仙的故事...', cover: 'https://via.placeholder.com/300x400?text=凡人修仙传', tags: ['修仙', '凡人流'] },
  { id: 8, name: '盘龙', author: '我吃西红柿', intro: '热血沸腾的盘龙世界，众多强者林立。一个拥有盘龙戒指的少年，他的梦想是超越那无敌的父亲...', cover: 'https://via.placeholder.com/300x400?text=盘龙', tags: ['玄幻', '经典'] },
  { id: 9, name: '全职高手', author: '蝴蝶蓝', intro: '网游荣耀中被誉为教科书级别的顶尖高手叶修，因为种种原因遭到俱乐部的驱逐。离开职业圈的他，寄身于一家网吧成了一个小小的网管...', cover: 'https://via.placeholder.com/300x400?text=全职高手', tags: ['都市', '电竞', '经典'] },
  { id: 10, name: '择天记', author: '猫腻', intro: '太始元年，有神石自太空飞来，散落人间，其中有一块落在了东土大陆。太始之后数千年，人妖魔三族并立...', cover: 'https://via.placeholder.com/300x400?text=择天记', tags: ['仙侠', '猫腻'] },
  { id: 11, name: '雪中悍刀行', author: '烽火戏诸侯', intro: '江湖是一张珠帘，大人物小人物，是珠子，大故事小故事，是串线。情义二字，是珠帘之眼...', cover: 'https://via.placeholder.com/300x400?text=雪中悍刀行', tags: ['武侠', '江湖'] },
  { id: 12, name: '一念永恒', author: '耳根', intro: '一念成沧海，一念化桑田。一念斩千魔，一念诛万仙。唯我念...永恒...', cover: 'https://via.placeholder.com/300x400?text=一念永恒', tags: ['仙侠', '耳根'] },
  { id: 13, name: '我欲封天', author: '耳根', intro: '我若要有，天不可无！我若要无，天不可有！这是耳根继《仙逆》之后的第二部长篇小说...', cover: 'https://via.placeholder.com/300x400?text=我欲封天', tags: ['仙侠', '经典'] },
  { id: 14, name: '仙逆', author: '耳根', intro: '顺为凡，逆则仙，只在心中一念间。王林，一个平凡的少年，踏入仙途，历经坎坷...', cover: 'https://via.placeholder.com/300x400?text=仙逆', tags: ['仙侠', '逆天'] },
  { id: 15, name: '诡秘之主', author: '爱潜水的乌贼', intro: '蒸汽与机械的时代，魔药与非凡的世界。是荣耀，是狡诈，是堕落，亦或是疯狂...', cover: 'https://via.placeholder.com/300x400?text=诡秘之主', tags: ['科幻', '克苏鲁'] },
  { id: 16, name: '何以笙箫默', author: '顾漫', intro: '如果那时我没有放开你的手，多年以后我们还会在一起吗？一段刻骨铭心的爱情故事...', cover: 'https://via.placeholder.com/300x400?text=何以笙箫默', tags: ['言情', '经典', '甜'] },
  { id: 17, name: '微微一笑很倾城', author: '顾漫', intro: '一场游戏中的相遇，一段现实与虚拟交织的爱情。清新甜蜜的校园爱情故事...', cover: 'https://via.placeholder.com/300x400?text=微微一笑很倾城', tags: ['言情', '游戏', '甜'] },
  { id: 18, name: '大主宰', author: '天蚕土豆', intro: '大千世界，位面交汇，万族林立，群雄荟萃。一位位来自下位面的天之至尊，在这无尽世界，演绎着令人向往的传奇...', cover: 'https://via.placeholder.com/300x400?text=大主宰', tags: ['玄幻', '热血'] },
  { id: 19, name: '元尊', author: '天蚕土豆', intro: '吾有一口玄黄气，可吞天地日月星！彼岸宗圣子周元，身负无上气运，却遭人算计...', cover: 'https://via.placeholder.com/300x400?text=元尊', tags: ['玄幻', '逆袭'] },
  { id: 20, name: '超神机械师', author: '齐佩甲', intro: '带着游戏面板穿越到星际时代，成为一名超神机械师。科技改变宇宙，机械铸就辉煌...', cover: 'https://via.placeholder.com/300x400?text=超神机械师', tags: ['科幻', '游戏'] }
];

/**
 * 搜索小说 - 本地演示模式
 * @param {string} keyword - 搜索关键词
 * @returns {Promise<Array>} 小说列表
 */
const searchNovel = (keyword) => {
  return new Promise((resolve) => {
    console.log('📚 [本地模式] 搜索小说:', keyword);
    
    // 模拟网络延迟
    setTimeout(() => {
      // 模糊搜索
      const results = LOCAL_BOOKS.filter(book => 
        book.name.includes(keyword) || 
        book.author.includes(keyword) ||
        book.tags.some(tag => tag.includes(keyword))
      );

      console.log(`✅ [本地模式] 找到 ${results.length} 本书`);
      
      // 返回格式化数据
      resolve(results.map(book => ({
        ...book,
        url: book.id.toString(),
        wordCount: Math.floor(Math.random() * 500) + 100, // 100-600万字
        lastChapter: `第${Math.floor(Math.random() * 1000) + 500}章`
      })));
    }, 300);
  });
};

/**
 * 生成章节内容
 */
const generateChapterContent = (bookName, chapterTitle, chapterIndex) => {
  const paragraphs = [
    `${bookName}，${chapterTitle}。`,
    `这是一段精彩的故事情节，主角在这一章经历了重要的转折。`,
    `经过不懈的努力，他终于突破了当前的境界，实力大增。`,
    `然而，新的挑战也随之而来，更强大的敌人出现在了他的面前。`,
    `"我绝不会放弃！"主角心中暗暗发誓，眼神变得无比坚定。`,
    `这一战，将决定他未来的命运...`,
    ``,
    `（本章为演示内容，实际章节需要从真实API获取）`,
    ``,
    `章节序号：第${chapterIndex + 1}章`,
    `书名：${bookName}`,
    `章节标题：${chapterTitle}`
  ];

  return paragraphs.map(p => `    ${p}`).join('\n\n');
};

/**
 * 获取章节列表 - 本地演示模式
 * @param {string} bookId - 书籍ID
 * @returns {Promise<Object>} { bookInfo, chapters }
 */
const getChapterList = (bookId) => {
  return new Promise((resolve, reject) => {
    console.log('📖 [本地模式] 获取章节列表:', bookId);
    
    // 查找书籍
    const book = LOCAL_BOOKS.find(b => b.id.toString() === bookId.toString());
    
    if (!book) {
      return reject(new Error('书籍不存在'));
    }

    // 生成100章演示章节
    const chapterCount = 100;
    const chapters = [];
    
    for (let i = 0; i < chapterCount; i++) {
      chapters.push({
        id: i,
        title: `第${i + 1}章 ${['修炼', '突破', '战斗', '奇遇', '历练', '悟道'][i % 6]}之路`,
        link: `${bookId}_${i}`,
        unreadble: false
      });
    }

    setTimeout(() => {
      console.log(`✅ [本地模式] 生成 ${chapters.length} 章`);
      
      resolve({
        bookInfo: {
          name: book.name,
          author: book.author,
          cover: book.cover,
          intro: book.intro
        },
        chapters,
        sourceId: 'local-demo'
      });
    }, 200);
  });
};

/**
 * 获取章节内容 - 本地演示模式
 * @param {Object} chapter - 章节对象
 * @param {string} bookName - 书名
 * @returns {Promise<Object>} { title, content }
 */
const getChapterContent = (chapter, bookName = '未知书名') => {
  return new Promise((resolve) => {
    console.log('📄 [本地模式] 获取章节内容:', chapter.title);
    
    setTimeout(() => {
      const content = generateChapterContent(bookName, chapter.title, chapter.id);
      
      console.log(`✅ [本地模式] 内容长度: ${content.length} 字`);
      
      resolve({
        title: chapter.title,
        content
      });
    }, 150);
  });
};

module.exports = {
  searchNovel,
  getChapterList,
  getChapterContent
};
