// pages/novel/reader/reader.js
const novelApi = require('../../../utils/novelApi.js');

Page({
  data: {
    bookId: '',
    bookName: '',
    bookUrl: '',
    isCloud: false,  // 是否从云端读取
    chapters: [],
    totalChapters: 0,
    currentChapterIndex: 0,
    chapterTitle: '正在加载...',
    chapterContent: ' ',  // 设置一个空格，避免显示失败页面
    isLoading: true,
    showHeader: true,
    showMenu: false,
    showChapterDrawer: false,
    fontSize: 18,
    themeClass: 'theme-white',
    scrollTop: 0,
    lastScrollTop: 0,  // 记录滚动位置
    pullDownRefreshing: false,  // 下拉刷新状态
    // 新增：书签功能
    bookmarks: [],
    showBookmarkModal: false,
    bookmarkNote: ''
  },

  onLoad(options) {
    const { bookId, bookName, isCloud } = options;
    
    if (!bookId || !bookName) {
      wx.showModal({
        title: '错误',
        content: '书籍信息不完整',
        showCancel: false,
        success: () => {
          wx.navigateBack();
        }
      });
      return;
    }

    this.setData({
      bookId,
      bookName: decodeURIComponent(bookName),
      isCloud: isCloud === 'true'  // 标记是否从云端读取
    });

    // 加载阅读设置
    this.loadReadSettings();
    
    // 加载书签
    this.loadBookmarks();
    
    // 根据来源加载书籍
    if (this.data.isCloud) {
      this.loadCloudBook();  // 从云数据库加载
    } else {
      this.loadBookInfo();   // 从本地加载
    }
  },

  onUnload() {
    // 页面卸载时保存阅读进度
    this.saveProgress();
  },

  onHide() {
    // 页面隐藏时保存阅读进度
    this.saveProgress();
  },

  /**
   * 加载书籍信息
   */
  loadBookInfo() {
    try {
      const shelf = wx.getStorageSync('novel_shelf') || [];
      const book = shelf.find(b => b.id === this.data.bookId);
      
      if (!book) {
        wx.showToast({
          title: '书籍不存在',
          icon: 'none'
        });
        return;
      }

      this.setData({ bookUrl: book.url });

      // 获取章节列表
      this.loadChapterList(book.url, book.currentChapter || 0);
    } catch (error) {
      console.error('加载书籍信息失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }
  },

  /**
   * 从云数据库加载书籍
   */
  async loadCloudBook() {
    wx.showLoading({ title: '加载章节...' });

    try {
      const db = wx.cloud.database();
      const _ = db.command;

      // 先查询总章节数
      const countResult = await db.collection('novel_chapters')
        .where({
          novelId: this.data.bookId
        })
        .count();
      
      console.log(`📚 数据库中共有 ${countResult.total} 章节`);

  // 查询该书的所有章节（分批获取）
  const MAX_LIMIT = 20; // 云开发前端 get 接口单次最多 20 条
      let allChapters = [];
      let hasMore = true;
      let skip = 0;

      while (hasMore) {
        const result = await db.collection('novel_chapters')
          .where({
            novelId: this.data.bookId
          })
          .orderBy('chapterId', 'asc')
          .field({
            chapterId: true,
            title: true,
            _id: true
          })
          .limit(MAX_LIMIT)
          .skip(skip)
          .get();

        console.log(`📖 分批加载章节 skip=${skip}, limit=${MAX_LIMIT}, 获取到 ${result.data.length} 章`);
        allChapters = allChapters.concat(result.data);
        
        if (result.data.length < MAX_LIMIT) {
          hasMore = false;
        } else {
          skip += MAX_LIMIT;
        }
      }

      console.log(`✅ 总共加载了 ${allChapters.length} 章节`);
      wx.hideLoading();

      if (allChapters.length === 0) {
        wx.showModal({
          title: '提示',
          content: '该书籍章节数据缺失',
          showCancel: false
        });
        return;
      }

      // 保存章节列表
      this.setData({
        chapters: allChapters,
        totalChapters: allChapters.length,
        isLoading: false
      });

      // 加载云端阅读进度
      const progress = await this.loadProgress();
      const startIndex = progress ? progress.chapterIndex : 0;
      const lastScrollTop = progress ? progress.scrollTop : 0;

      this.setData({ 
        currentChapterIndex: startIndex,
        scrollTop: lastScrollTop
      });

      // 显示当前章节
      this.loadChapter(startIndex);

      // 提示用户
      if (progress) {
        wx.showToast({
          title: `继续阅读第${startIndex + 1}章`,
          icon: 'none',
          duration: 2000
        });
      }

    } catch (error) {
      wx.hideLoading();
      console.error('加载云端章节失败:', error);
      wx.showModal({
        title: '加载失败',
        content: error.errMsg || '无法加载章节数据',
        showCancel: false
      });
    }
  },

  /**
   * 加载指定章节（云端）
   */
  loadChapter(index) {
    const chapters = this.data.chapters;

    if (!chapters || !chapters[index]) {
      wx.showToast({
        title: '章节不存在',
        icon: 'none'
      });
      return;
    }
    const chapterMeta = chapters[index];
    const hasCachedContent = !!chapterMeta.content;

    this.setData({
      currentChapterIndex: index,
      chapterTitle: chapterMeta.title,
      chapterContent: hasCachedContent ? chapterMeta.content : '',
      isLoading: !hasCachedContent,
      scrollTop: 0
    });

    if (hasCachedContent) {
      this.saveProgress();
      return;
    }

    // 添加重试机制
    this.fetchCloudChapterContent(chapterMeta, index, 0);
  },

  async fetchCloudChapterContent(chapterMeta, index, retryCount = 0) {
    const maxRetries = 3;
    
    try {
      const db = wx.cloud.database();
      let result;

      if (chapterMeta._id) {
        result = await db.collection('novel_chapters')
          .doc(chapterMeta._id)
          .get();
      } else {
        const queryRes = await db.collection('novel_chapters')
          .where({
            novelId: this.data.bookId,
            chapterId: chapterMeta.chapterId
          })
          .limit(1)
          .get();

        if (!queryRes.data.length) {
          throw new Error('章节内容缺失');
        }

        result = { data: queryRes.data[0] };
      }

      const content = result.data.content || '';
      
      if (!content.trim()) {
        throw new Error('章节内容为空');
      }

      const chapterPath = `chapters[${index}].content`;

      this.setData({
        chapterContent: content,
        [chapterPath]: content,
        isLoading: false
      });

      this.saveProgress();
    } catch (error) {
      console.error(`加载章节内容失败 (尝试 ${retryCount + 1}/${maxRetries + 1}):`, error);
      
      if (retryCount < maxRetries) {
        // 延迟重试
        setTimeout(() => {
          this.fetchCloudChapterContent(chapterMeta, index, retryCount + 1);
        }, 1000 * (retryCount + 1)); // 递增延迟
        
        wx.showToast({
          title: `加载失败，正在重试 (${retryCount + 1}/${maxRetries})`,
          icon: 'loading',
          duration: 1000
        });
      } else {
        this.setData({ isLoading: false });
        
        // 提供用户友好的错误提示
        let errorMessage = '章节内容加载失败';
        if (error.message.includes('网络')) {
          errorMessage = '网络连接失败，请检查网络后重试';
        } else if (error.message.includes('权限')) {
          errorMessage = '权限不足，无法访问章节内容';
        } else if (error.message.includes('缺失')) {
          errorMessage = '章节数据不存在，可能已被删除';
        }

        wx.showModal({
          title: '加载失败',
          content: `${errorMessage}\n\n错误详情：${error.message}`,
          confirmText: '重试',
          cancelText: '返回',
          success: (res) => {
            if (res.confirm) {
              this.fetchCloudChapterContent(chapterMeta, index, 0);
            } else {
              wx.navigateBack();
            }
          }
        });
      }
    }
  },

  /**
   * 加载章节列表
   */
  loadChapterList(bookUrl, startChapterIndex = 0) {
    wx.showLoading({ title: '加载中...' });

    novelApi.getChapterList(bookUrl)
      .then(result => {
        wx.hideLoading();
        
        const { chapters } = result;
        
        if (!chapters || chapters.length === 0) {
          wx.showModal({
            title: '提示',
            content: '该书籍暂无章节',
            showCancel: false
          });
          return;
        }

        this.setData({
          chapters,
          totalChapters: chapters.length,
          currentChapterIndex: Math.min(startChapterIndex, chapters.length - 1)
        });

        // 加载当前章节内容
        this.loadCurrentChapter();
      })
      .catch(error => {
        wx.hideLoading();
        console.error('加载章节列表失败:', error);
        wx.showModal({
          title: '加载失败',
          content: error.message || '无法获取章节列表',
          confirmText: '重试',
          success: (res) => {
            if (res.confirm) {
              this.loadChapterList(bookUrl, startChapterIndex);
            } else {
              wx.navigateBack();
            }
          }
        });
      });
  },

  /**
   * 加载当前章节
   */
  loadCurrentChapter() {
    const { chapters, currentChapterIndex } = this.data;
    
    if (!chapters || !chapters[currentChapterIndex]) {
      return;
    }

    const chapter = chapters[currentChapterIndex];
    
    this.setData({
      isLoading: true,
      chapterTitle: chapter.title,
      chapterContent: '',
      scrollTop: 0
    });

    // 传递完整章节对象和书名
    novelApi.getChapterContent(chapter, this.data.bookName)
      .then(result => {
        this.setData({
          chapterTitle: result.title || chapter.title,
          chapterContent: result.content,
          isLoading: false
        });

        // 保存阅读进度
        this.saveProgress();
      })
      .catch(error => {
        console.error('加载章节内容失败:', error);
        this.setData({
          isLoading: false,
          chapterContent: ''
        });
        wx.showToast({
          title: error.message || '加载失败',
          icon: 'none'
        });
      });
  },

  /**
   * 重试加载
   */
  retryLoad() {
    this.loadCurrentChapter();
  },

  /**
   * 上一章
   */
  previousChapter() {
    if (this.data.currentChapterIndex <= 0) {
      wx.showToast({
        title: '已是第一章',
        icon: 'none'
      });
      return;
    }

    this.setData({
      currentChapterIndex: this.data.currentChapterIndex - 1
    });

    // 根据来源选择加载方式
    if (this.data.isCloud) {
      this.loadChapter(this.data.currentChapterIndex);
    } else {
      this.loadCurrentChapter();
    }
  },

  /**
   * 下一章
   */
  nextChapter() {
    if (this.data.currentChapterIndex >= this.data.totalChapters - 1) {
      wx.showToast({
        title: '已是最后一章',
        icon: 'none'
      });
      return;
    }

    this.setData({
      currentChapterIndex: this.data.currentChapterIndex + 1
    });

    // 根据来源选择加载方式
    if (this.data.isCloud) {
      this.loadChapter(this.data.currentChapterIndex);
    } else {
      this.loadCurrentChapter();
    }
  },

  /**
   * 切换章节（通过进度条）
   */
  onChapterChange(e) {
    const index = parseInt(e.detail.value);
    this.setData({
      currentChapterIndex: index
    });
    
    // 根据来源选择加载方式
    if (this.data.isCloud) {
      this.loadChapter(index);
    } else {
      this.loadCurrentChapter();
    }
  },

  /**
   * 选择章节（从目录）
   */
  selectChapter(e) {
    const index = parseInt(e.currentTarget.dataset.index);
    this.setData({
      currentChapterIndex: index,
      showChapterDrawer: false
    });
    
    // 根据来源选择加载方式
    if (this.data.isCloud) {
      this.loadChapter(index);
    } else {
      this.loadCurrentChapter();
    }
  },

  /**
   * 切换顶部栏
   */
  toggleHeader() {
    this.setData({
      showHeader: !this.data.showHeader,
      showMenu: false
    });
  },

  /**
   * 切换底部菜单
   */
  toggleMenu() {
    this.setData({
      showMenu: !this.data.showMenu
    });
  },

  /**
   * 显示章节列表
   */
  showChapterList() {
    this.setData({
      showChapterDrawer: true
    });
  },

  /**
   * 关闭章节列表
   */
  closeChapterList() {
    this.setData({
      showChapterDrawer: false
    });
  },

  /**
   * 增大字号
   */
  increaseFontSize() {
    if (this.data.fontSize >= 24) {
      wx.showToast({
        title: '字号已最大',
        icon: 'none'
      });
      return;
    }
    
    const newSize = this.data.fontSize + 2;
    this.setData({ fontSize: newSize });
    this.saveReadSettings();
  },

  /**
   * 减小字号
   */
  decreaseFontSize() {
    if (this.data.fontSize <= 14) {
      wx.showToast({
        title: '字号已最小',
        icon: 'none'
      });
      return;
    }
    
    const newSize = this.data.fontSize - 2;
    this.setData({ fontSize: newSize });
    this.saveReadSettings();
  },

  /**
   * 切换夜间模式
   */
  toggleNightMode() {
    const isNight = this.data.themeClass === 'theme-night';
    this.setData({
      themeClass: isNight ? 'theme-white' : 'theme-night'
    });
    
    this.saveReadSettings();
    
    wx.showToast({
      title: isNight ? '已切换到日间模式' : '已切换到夜间模式',
      icon: 'none',
      duration: 1500
    });
  },

  /**
   * 切换主题（保留旧方法以兼容）
   */
  toggleTheme() {
    const themes = ['theme-white', 'theme-green', 'theme-paper', 'theme-night'];
    const currentIndex = themes.indexOf(this.data.themeClass);
    const nextIndex = (currentIndex + 1) % themes.length;
    
    this.setData({
      themeClass: themes[nextIndex]
    });
    
    this.saveReadSettings();
  },

  /**
   * 保存阅读设置
   */
  saveReadSettings() {
    try {
      wx.setStorageSync('novel_read_settings', {
        fontSize: this.data.fontSize,
        themeClass: this.data.themeClass
      });
    } catch (error) {
      console.error('保存阅读设置失败:', error);
    }
  },

  /**
   * 加载阅读设置
   */
  loadReadSettings() {
    try {
      const settings = wx.getStorageSync('novel_read_settings');
      if (settings) {
        this.setData({
          fontSize: settings.fontSize || 18,
          themeClass: settings.themeClass || 'theme-white'
        });
      }
    } catch (error) {
      console.error('加载阅读设置失败:', error);
    }
  },

  /**
   * 保存阅读进度（保存到独立的 reading_progress 集合）
   */
  async saveProgress() {
    try {
      if (!this.data.isCloud) {
        // 本地书籍使用原有方式
        const shelf = wx.getStorageSync('novel_shelf') || [];
        const bookIndex = shelf.findIndex(b => b.id === this.data.bookId);
        
        if (bookIndex !== -1) {
          shelf[bookIndex].currentChapter = this.data.currentChapterIndex;
          wx.setStorageSync('novel_shelf', shelf);
        }
        return;
      }

      // 云端书籍保存到 reading_progress 集合
      const db = wx.cloud.database();
      const _ = db.command;
      
      // 获取用户 openid
      let openid = wx.getStorageSync('userOpenid');
      if (!openid) {
        const res = await wx.cloud.callFunction({ name: 'login' });
        openid = res.result.openid;
        wx.setStorageSync('userOpenid', openid);
      }

      // 准备阅读进度数据
      const progressData = {
        _openid: openid,
        novelId: this.data.bookId,
        chapterIndex: this.data.currentChapterIndex,
        chapterTitle: this.data.chapterTitle,
        scrollTop: this.data.lastScrollTop,
        updateTime: new Date().getTime()
      };

      // 查询是否已有该书的进度记录
      const existResult = await db.collection('reading_progress')
        .where({
          _openid: openid,
          novelId: this.data.bookId
        })
        .get();

      if (existResult.data.length > 0) {
        // 更新现有记录
        await db.collection('reading_progress')
          .doc(existResult.data[0]._id)
          .update({
            data: {
              chapterIndex: progressData.chapterIndex,
              chapterTitle: progressData.chapterTitle,
              scrollTop: progressData.scrollTop,
              updateTime: progressData.updateTime
            }
          });
      } else {
        // 创建新记录
        await db.collection('reading_progress')
          .add({
            data: progressData
          });
      }

      console.log('阅读进度已保存');
    } catch (error) {
      console.error('保存阅读进度失败:', error);
    }
  },

  /**
   * 加载阅读进度（从 reading_progress 集合读取）
   */
  async loadProgress() {
    try {
      if (!this.data.isCloud) return null;

      const db = wx.cloud.database();
      let openid = wx.getStorageSync('userOpenid');
      if (!openid) {
        const res = await wx.cloud.callFunction({ name: 'login' });
        openid = res.result.openid;
        wx.setStorageSync('userOpenid', openid);
      }

      // 从 reading_progress 集合读取阅读进度
      const result = await db.collection('reading_progress')
        .where({
          _openid: openid,
          novelId: this.data.bookId
        })
        .get();

      if (result.data.length > 0) {
        const progress = result.data[0];
        return {
          chapterIndex: progress.chapterIndex || 0,
          scrollTop: progress.scrollTop || 0
        };
      }
      return null;
    } catch (error) {
      console.error('加载阅读进度失败:', error);
      return null;
    }
  },

  /**
   * 滚动监听
   */
  onScroll(e) {
    this.setData({
      lastScrollTop: e.detail.scrollTop
    });
  },

  /**
   * 滚动到顶部（下拉加载上一章）
   */
  onScrollToUpper() {
    console.log('滚动到顶部');
    
    // 禁用自动加载，改为需要用户主动触发
    // 不再自动加载上一章
  },

  /**
   * 滚动到底部（不自动加载下一章）
   */
  onScrollToLower() {
    console.log('滚动到底部');
    
    // 禁用自动加载，用户需要手动下拉刷新才能切换
    // 不再自动加载下一章
  },

  /**
   * 下拉刷新加载上一章
   */
  onPullDownRefresh() {
    if (this.data.pullDownRefreshing) {
      return; // 防止重复触发
    }

    if (this.data.currentChapterIndex <= 0) {
      wx.showToast({
        title: '已是第一章',
        icon: 'none'
      });
      return;
    }

    this.setData({ pullDownRefreshing: true });
    
    wx.showToast({
      title: '加载上一章...',
      icon: 'loading',
      duration: 1000
    });

    setTimeout(() => {
      this.previousChapter();
      this.setData({ pullDownRefreshing: false });
    }, 500);
  },

  /**
   * 上拉加载下一章
   */
  onReachBottom() {
    // 预留方法，可用于上拉加载下一章
  },

  /**
   * 返回书架
   */
  backToShelf() {
    // 保存进度
    this.saveProgress();
    
    // 返回到书架页面
    wx.reLaunch({
      url: '/pages/novel/shelf/shelf'
    });
  },

  /**
   * 显示搜索弹窗
   */
  showSearchModal() {
    this.setData({
      showSearchModal: true,
      searchKeyword: '',
      searchResults: [],
      showMenu: false
    });
  },

  /**
   * 关闭搜索弹窗
   */
  closeSearchModal() {
    this.setData({
      showSearchModal: false,
      searchKeyword: '',
      searchResults: []
    });
  },

  /**
   * 搜索输入
   */
  onSearchInput(e) {
    this.setData({
      searchKeyword: e.detail.value
    });
  },

  /**
   * 执行搜索
   */
  performSearch() {
    const keyword = this.data.searchKeyword.trim();
    if (!keyword) {
      wx.showToast({
        title: '请输入搜索关键词',
        icon: 'none'
      });
      return;
    }

    const results = [];
    this.data.chapters.forEach((chapter, index) => {
      if (chapter.title && chapter.title.includes(keyword)) {
        results.push({
          index,
          title: chapter.title,
          snippet: chapter.title
        });
      }
    });

    this.setData({
      searchResults: results
    });

    if (results.length === 0) {
      wx.showToast({
        title: '未找到相关章节',
        icon: 'none'
      });
    }
  },

  /**
   * 跳转到搜索结果章节
   */
  jumpToSearchResult(e) {
    const index = parseInt(e.currentTarget.dataset.index);
    this.setData({
      currentChapterIndex: index,
      showSearchModal: false,
      searchKeyword: '',
      searchResults: [],
      scrollTop: 0
    });

    // 根据来源选择加载方式
    if (this.data.isCloud) {
      this.loadChapter(index);
    } else {
      this.loadCurrentChapter();
    }

    wx.showToast({
      title: `已跳转到第${index + 1}章`,
      icon: 'success'
    });
  },

  /**
   * 添加书签
   */
  addBookmark() {
    this.setData({
      showBookmarkModal: true,
      bookmarkNote: '',
      showMenu: false
    });
  },

  /**
   * 关闭书签弹窗
   */
  closeBookmarkModal() {
    this.setData({
      showBookmarkModal: false,
      bookmarkNote: ''
    });
  },

  /**
   * 书签备注输入
   */
  onBookmarkInput(e) {
    this.setData({
      bookmarkNote: e.detail.value
    });
  },

  /**
   * 保存书签
   */
  saveBookmark() {
    const bookmark = {
      chapterIndex: this.data.currentChapterIndex,
      chapterTitle: this.data.chapterTitle,
      note: this.data.bookmarkNote.trim(),
      scrollTop: this.data.lastScrollTop,
      createTime: new Date().getTime()
    };

    const bookmarks = [...this.data.bookmarks, bookmark];
    
    // 限制书签数量
    if (bookmarks.length > 50) {
      bookmarks.shift(); // 移除最旧的书签
    }

    this.setData({
      bookmarks,
      showBookmarkModal: false,
      bookmarkNote: ''
    });

    // 保存到本地存储
    try {
      wx.setStorageSync(`bookmarks_${this.data.bookId}`, bookmarks);
    } catch (error) {
      console.error('保存书签失败:', error);
    }

    wx.showToast({
      title: '书签已保存',
      icon: 'success'
    });
  },

  /**
   * 删除书签
   */
  deleteBookmark(e) {
    const index = parseInt(e.currentTarget.dataset.index);
    const bookmarks = [...this.data.bookmarks];
    bookmarks.splice(index, 1);

    this.setData({ bookmarks });

    // 保存到本地存储
    try {
      wx.setStorageSync(`bookmarks_${this.data.bookId}`, bookmarks);
    } catch (error) {
      console.error('删除书签失败:', error);
    }

    wx.showToast({
      title: '书签已删除',
      icon: 'success'
    });
  },

  /**
   * 跳转到书签
   */
  jumpToBookmark(e) {
    const index = parseInt(e.currentTarget.dataset.index);
    const bookmark = this.data.bookmarks[index];
    
    this.setData({
      currentChapterIndex: bookmark.chapterIndex,
      scrollTop: bookmark.scrollTop,
      showMenu: false
    });

    // 根据来源选择加载方式
    if (this.data.isCloud) {
      this.loadChapter(bookmark.chapterIndex);
    } else {
      this.loadCurrentChapter();
    }

    wx.showToast({
      title: `已跳转到书签：${bookmark.chapterTitle}`,
      icon: 'success'
    });
  },

  /**
   * 加载书签
   */
  loadBookmarks() {
    try {
      const bookmarks = wx.getStorageSync(`bookmarks_${this.data.bookId}`) || [];
      this.setData({ bookmarks });
    } catch (error) {
      console.error('加载书签失败:', error);
    }
  }
});
