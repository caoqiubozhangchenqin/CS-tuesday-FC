// pages/novel/debug/debug.js
const novelApi = require('../../../utils/novelApi.js');

Page({
  data: {
    currentApi: 'https://api.zhuishushenqi.com',
    domainCheck: false,
    testKeyword: '斗破苍穹',
    testBookId: '5816b415b06d1d32157790b1',
    isSearching: false,
    isLoadingChapters: false,
    searchResult: '',
    chapterResult: '',
    networkResult: '',
    cloudStorageInfo: '', // 云存储信息
    cloudBooksCount: 0 // 云端书籍数量
  },

  onLoad() {
    this.checkEnvironment();
  },

  /**
   * 检查环境配置
   */
  checkEnvironment() {
    // 检查是否在开发工具中
    const systemInfo = wx.getSystemInfoSync();
    console.log('系统信息:', systemInfo);
    
    this.setData({
      domainCheck: !systemInfo.platform.includes('devtools')
    });
  },

  /**
   * 输入关键词
   */
  onKeywordInput(e) {
    this.setData({
      testKeyword: e.detail.value
    });
  },

  /**
   * 输入书籍ID
   */
  onBookIdInput(e) {
    this.setData({
      testBookId: e.detail.value
    });
  },

  /**
   * 切换API地址
   */
  switchApi() {
    // 这里可以实现API地址切换逻辑
    wx.showToast({
      title: '已切换备用API',
      icon: 'success'
    });
  },

  /**
   * 测试搜索
   */
  testSearch() {
    const keyword = this.data.testKeyword.trim();
    
    if (!keyword) {
      wx.showToast({
        title: '请输入搜索关键词',
        icon: 'none'
      });
      return;
    }

    console.log('\n========== 开始测试搜索 ==========');
    console.log('关键词:', keyword);

    this.setData({
      isSearching: true,
      searchResult: '搜索中...'
    });

    novelApi.searchNovel(keyword)
      .then(books => {
        console.log('✅ 搜索成功！');
        console.log('结果数量:', books.length);
        console.log('详细数据:', books);

        let resultText = `✅ 成功！找到 ${books.length} 本书\n\n`;
        
        if (books.length > 0) {
          books.slice(0, 3).forEach((book, index) => {
            resultText += `${index + 1}. ${book.name}\n`;
            resultText += `   作者：${book.author}\n`;
            resultText += `   ID：${book.id}\n`;
            resultText += `   简介：${book.intro.substring(0, 30)}...\n\n`;
          });
        } else {
          resultText += '没有找到相关书籍';
        }

        this.setData({
          searchResult: resultText,
          isSearching: false
        });

        wx.showToast({
          title: `找到${books.length}本书`,
          icon: 'success'
        });
      })
      .catch(error => {
        console.error('❌ 搜索失败:', error);
        
        this.setData({
          searchResult: `❌ 搜索失败\n\n错误信息：${error.message}\n\n请检查：\n1. 是否勾选「不校验合法域名」\n2. 网络连接是否正常\n3. 控制台是否有详细错误信息`,
          isSearching: false
        });

        wx.showModal({
          title: '搜索失败',
          content: error.message,
          showCancel: false
        });
      });
  },

  /**
   * 测试章节列表
   */
  testChapterList() {
    const bookId = this.data.testBookId.trim();
    
    if (!bookId) {
      wx.showToast({
        title: '请输入书籍ID',
        icon: 'none'
      });
      return;
    }

    console.log('\n========== 开始测试章节列表 ==========');
    console.log('书籍ID:', bookId);

    this.setData({
      isLoadingChapters: true,
      chapterResult: '获取中...'
    });

    novelApi.getChapterList(bookId)
      .then(result => {
        console.log('✅ 获取章节列表成功！');
        console.log('书籍信息:', result.bookInfo);
        console.log('章节数量:', result.chapters.length);

        let resultText = `✅ 成功！\n\n`;
        resultText += `书名：${result.bookInfo.name}\n`;
        resultText += `作者：${result.bookInfo.author}\n`;
        resultText += `章节数：${result.chapters.length}\n\n`;
        
        if (result.chapters.length > 0) {
          resultText += `前3章：\n`;
          result.chapters.slice(0, 3).forEach((chapter, index) => {
            resultText += `${index + 1}. ${chapter.title}\n`;
          });
        }

        this.setData({
          chapterResult: resultText,
          isLoadingChapters: false
        });

        wx.showToast({
          title: `获取到${result.chapters.length}章`,
          icon: 'success'
        });
      })
      .catch(error => {
        console.error('❌ 获取章节列表失败:', error);
        
        this.setData({
          chapterResult: `❌ 获取失败\n\n错误信息：${error.message}`,
          isLoadingChapters: false
        });

        wx.showModal({
          title: '获取失败',
          content: error.message,
          showCancel: false
        });
      });
  },

  /**
   * 测试网络连接
   */
  testNetwork() {
    console.log('\n========== 测试网络连接 ==========');
    
    this.setData({
      networkResult: '测试中...'
    });

    // 测试简单的网络请求
    wx.request({
      url: 'https://api.zhuishushenqi.com/book/fuzzy-search?query=test',
      method: 'GET',
      timeout: 5000,
      success: (res) => {
        console.log('✅ 网络连接正常');
        console.log('状态码:', res.statusCode);
        console.log('响应数据:', res.data);

        this.setData({
          networkResult: `✅ 网络连接正常\n\n状态码：${res.statusCode}\nAPI可访问：是`
        });
      },
      fail: (err) => {
        console.error('❌ 网络连接失败:', err);
        
        let errorMsg = '❌ 网络连接失败\n\n';
        errorMsg += `错误信息：${err.errMsg || '未知错误'}\n\n`;
        errorMsg += '可能原因：\n';
        errorMsg += '1. 未勾选「不校验合法域名」\n';
        errorMsg += '2. 网络连接异常\n';
        errorMsg += '3. API服务不可用';

        this.setData({
          networkResult: errorMsg
        });
      }
    });
  },

  /**
   * 查询云端书籍
   */
  async queryCloudBooks() {
    console.log('\n========== 查询云端书籍 ==========');
    
    try {
      wx.showLoading({ title: '查询中...' });

      const db = wx.cloud.database();
      const result = await db.collection('novels')
        .orderBy('uploadTime', 'desc')
        .get();

      console.log('✅ 查询成功:', result);

      let infoText = `✅ 查询成功\n\n`;
      infoText += `云端书籍数量：${result.data.length} 本\n\n`;

      if (result.data.length > 0) {
        infoText += `最近上传的 3 本：\n\n`;
        result.data.slice(0, 3).forEach((book, index) => {
          infoText += `${index + 1}. ${book.name}\n`;
          infoText += `   作者：${book.author}\n`;
          infoText += `   格式：${book.format}\n`;
          infoText += `   大小：${book.sizeText}\n`;
          infoText += `   文件ID：${book.fileID.substring(0, 30)}...\n\n`;
        });

        // 计算总存储大小
        const totalSize = result.data.reduce((sum, book) => sum + (book.size || 0), 0);
        const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);
        infoText += `总存储大小：${totalSizeMB} MB\n`;
      } else {
        infoText += `还没有上传任何书籍\n\n`;
        infoText += `提示：\n`;
        infoText += `1. 点击书架的"上传"按钮\n`;
        infoText += `2. 选择 TXT 或 EPUB 文件\n`;
        infoText += `3. 填写书籍信息后上传`;
      }

      this.setData({
        cloudStorageInfo: infoText,
        cloudBooksCount: result.data.length
      });

      wx.hideLoading();
      wx.showToast({
        title: `找到${result.data.length}本书`,
        icon: 'success'
      });

    } catch (error) {
      wx.hideLoading();
      console.error('❌ 查询失败:', error);
      
      this.setData({
        cloudStorageInfo: `❌ 查询失败\n\n错误信息：${error.message}\n\n请检查：\n1. 是否创建了 novels 集合\n2. 数据库权限是否正确\n3. 云开发环境是否初始化`
      });

      wx.showModal({
        title: '查询失败',
        content: error.message,
        showCancel: false
      });
    }
  }
});
