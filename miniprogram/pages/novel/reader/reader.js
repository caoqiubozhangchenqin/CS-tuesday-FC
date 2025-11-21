// pages/novel/reader/reader.js
const novelApi = require('../../../utils/novelApi.js');

Page({
  data: {
    bookId: '',
    bookName: '',
    bookUrl: '',
    chapters: [],
    totalChapters: 0,
    currentChapterIndex: 0,
    chapterTitle: '',
    chapterContent: '',
    isLoading: true,
    showHeader: true,
    showMenu: false,
    showChapterDrawer: false,
    fontSize: 18,
    themeClass: 'theme-white',
    scrollTop: 0
  },

  onLoad(options) {
    const { bookId, bookName } = options;
    
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
      bookName: decodeURIComponent(bookName)
    });

    // 加载书籍信息
    this.loadBookInfo();
    
    // 加载阅读设置
    this.loadReadSettings();
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

    this.loadCurrentChapter();
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

    this.loadCurrentChapter();
  },

  /**
   * 切换章节（通过进度条）
   */
  onChapterChange(e) {
    const index = parseInt(e.detail.value);
    this.setData({
      currentChapterIndex: index
    });
    this.loadCurrentChapter();
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
    this.loadCurrentChapter();
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
   * 切换主题
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
   * 保存阅读进度
   */
  saveProgress() {
    try {
      const shelf = wx.getStorageSync('novel_shelf') || [];
      const bookIndex = shelf.findIndex(b => b.id === this.data.bookId);
      
      if (bookIndex !== -1) {
        shelf[bookIndex].currentChapter = this.data.currentChapterIndex;
        wx.setStorageSync('novel_shelf', shelf);
      }
    } catch (error) {
      console.error('保存阅读进度失败:', error);
    }
  },

  /**
   * 滚动监听
   */
  onScroll(e) {
    // 可以在这里添加滚动相关逻辑
  },

  /**
   * 返回
   */
  goBack() {
    wx.navigateBack();
  }
});
