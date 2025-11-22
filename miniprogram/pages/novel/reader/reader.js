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
    chapterTitle: '',
    chapterContent: '',
    isLoading: true,
    showHeader: true,
    showMenu: false,
    showChapterDrawer: false,
    showJumpModal: false,  // 跳转弹窗
    jumpChapterNumber: '',  // 跳转章节号
    fontSize: 18,
    themeClass: 'theme-white',
    scrollTop: 0,
    lastScrollTop: 0  // 记录滚动位置
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

      // 查询该书的所有章节（分批获取）
      const MAX_LIMIT = 100;
      let allChapters = [];
      let hasMore = true;
      let skip = 0;

      while (hasMore) {
        const result = await db.collection('novel_chapters')
          .where({
            novelId: this.data.bookId
          })
          .orderBy('chapterId', 'asc')
          .skip(skip)
          .limit(MAX_LIMIT)
          .get();

        allChapters = allChapters.concat(result.data);
        
        if (result.data.length < MAX_LIMIT) {
          hasMore = false;
        } else {
          skip += MAX_LIMIT;
        }
      }

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

    const chapter = chapters[index];
    
    this.setData({
      currentChapterIndex: index,
      chapterTitle: chapter.title,
      chapterContent: chapter.content,
      isLoading: false,
      scrollTop: 0
    });

    // 保存阅读进度
    this.saveProgress();
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
   * 保存阅读进度（云端）
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

      // 云端书籍保存到数据库
      const db = wx.cloud.database();
      const _ = db.command;
      
      // 获取用户 openid
      const openid = wx.getStorageSync('userOpenid');
      if (!openid) {
        const res = await wx.cloud.callFunction({ name: 'login' });
        wx.setStorageSync('userOpenid', res.result.openid);
      }

      // 保存或更新阅读进度
      const progressData = {
        novelId: this.data.bookId,
        chapterIndex: this.data.currentChapterIndex,
        scrollTop: this.data.lastScrollTop,
        updateTime: db.serverDate()
      };

      // 查询是否已有记录
      const existResult = await db.collection('reading_progress')
        .where({
          novelId: this.data.bookId,
          _openid: openid
        })
        .get();

      if (existResult.data.length > 0) {
        // 更新记录
        await db.collection('reading_progress')
          .doc(existResult.data[0]._id)
          .update({
            data: progressData
          });
      } else {
        // 新增记录
        await db.collection('reading_progress')
          .add({
            data: progressData
          });
      }

      console.log('阅读进度已保存到云端');
    } catch (error) {
      console.error('保存阅读进度失败:', error);
    }
  },

  /**
   * 加载阅读进度（云端）
   */
  async loadProgress() {
    try {
      if (!this.data.isCloud) return null;

      const db = wx.cloud.database();
      const openid = wx.getStorageSync('userOpenid');
      if (!openid) return null;

      const result = await db.collection('reading_progress')
        .where({
          novelId: this.data.bookId,
          _openid: openid
        })
        .orderBy('updateTime', 'desc')
        .limit(1)
        .get();

      if (result.data.length > 0) {
        return result.data[0];
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
   * 滚动到顶部（加载上一章）
   */
  onScrollToUpper() {
    console.log('滚动到顶部');
    
    // 如果不是第一章，自动加载上一章
    if (this.data.currentChapterIndex > 0 && !this.data.isLoading) {
      wx.showToast({
        title: '加载上一章...',
        icon: 'loading',
        duration: 1000
      });

      setTimeout(() => {
        this.previousChapter();
      }, 500);
    }
  },

  /**
   * 滚动到底部（自动加载下一章）
   */
  onScrollToLower() {
    console.log('滚动到底部');
    
    // 如果不是最后一章，自动加载下一章
    if (this.data.currentChapterIndex < this.data.totalChapters - 1 && !this.data.isLoading) {
      wx.showToast({
        title: '加载下一章...',
        icon: 'loading',
        duration: 1000
      });

      setTimeout(() => {
        this.nextChapter();
      }, 500);
    }
  },

  /**
   * 显示跳转弹窗
   */
  showJumpToPage() {
    this.setData({
      showJumpModal: true,
      jumpChapterNumber: (this.data.currentChapterIndex + 1).toString(),
      showMenu: false
    });
  },

  /**
   * 关闭跳转弹窗
   */
  closeJumpModal() {
    this.setData({
      showJumpModal: false,
      jumpChapterNumber: ''
    });
  },

  /**
   * 输入章节号
   */
  onJumpInputChange(e) {
    this.setData({
      jumpChapterNumber: e.detail.value
    });
  },

  /**
   * 确认跳转
   */
  confirmJump() {
    const chapterNum = parseInt(this.data.jumpChapterNumber);
    
    if (isNaN(chapterNum)) {
      wx.showToast({
        title: '请输入有效数字',
        icon: 'none'
      });
      return;
    }

    if (chapterNum < 1 || chapterNum > this.data.totalChapters) {
      wx.showToast({
        title: `请输入1-${this.data.totalChapters}之间的数字`,
        icon: 'none'
      });
      return;
    }

    // 跳转到指定章节
    const targetIndex = chapterNum - 1;
    this.setData({
      currentChapterIndex: targetIndex,
      showJumpModal: false,
      jumpChapterNumber: '',
      scrollTop: 0
    });

    // 根据来源选择加载方式
    if (this.data.isCloud) {
      this.loadChapter(targetIndex);
    } else {
      this.loadCurrentChapter();
    }

    wx.showToast({
      title: `已跳转到第${chapterNum}章`,
      icon: 'success'
    });
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
   * 返回
   */
  goBack() {
    wx.navigateBack();
  }
});
