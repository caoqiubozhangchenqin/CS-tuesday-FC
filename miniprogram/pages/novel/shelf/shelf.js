// pages/novel/shelf/shelf.js
Page({
  data: {
    bookList: [],
    readingCount: 0
  },

  onLoad() {
    this.loadBookList();
  },

  onShow() {
    // 每次显示页面时重新加载书架（可能从搜索页添加了新书）
    this.loadBookList();
  },

  /**
   * 从本地存储加载书架列表
   */
  loadBookList() {
    try {
      const bookList = wx.getStorageSync('novel_shelf') || [];
      
      // 格式化添加时间
      const formattedList = bookList.map(book => {
        if (book.addTime && typeof book.addTime === 'number') {
          const date = new Date(book.addTime);
          const now = new Date();
          const diff = now - date;
          const days = Math.floor(diff / (1000 * 60 * 60 * 24));
          
          if (days === 0) {
            book.addTime = '今天加入';
          } else if (days === 1) {
            book.addTime = '昨天加入';
          } else if (days < 7) {
            book.addTime = `${days}天前`;
          } else {
            book.addTime = `${date.getMonth() + 1}月${date.getDate()}日`;
          }
        } else {
          book.addTime = '最近';
        }
        return book;
      });
      
      // 统计阅读中的书籍数量
      const readingCount = formattedList.filter(book => book.currentChapter).length;
      
      this.setData({ 
        bookList: formattedList,
        readingCount 
      });
    } catch (error) {
      console.error('加载书架失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }
  },

  /**
   * 跳转到推荐页
   */
  goToRecommend() {
    wx.navigateTo({
      url: '/pages/novel/recommend/recommend'
    });
  },

  /**
   * 跳转到搜索页
   */
  goToSearch() {
    wx.navigateTo({
      url: '/pages/novel/search/search'
    });
  },

  /**
   * 跳转到调试页
   */
  goToDebug() {
    wx.navigateTo({
      url: '/pages/novel/debug/debug'
    });
  },

  /**
   * 跳转到阅读页
   */
  goToReader(e) {
    const book = e.currentTarget.dataset.book;
    if (!book) return;

    // 传递书籍信息到阅读页
    wx.navigateTo({
      url: `/pages/novel/reader/reader?bookId=${book.id}&bookName=${encodeURIComponent(book.name)}`
    });
  },

  /**
   * 删除书籍
   */
  deleteBook(e) {
    const bookId = e.currentTarget.dataset.id;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要从书架移除这本书吗？',
      confirmText: '删除',
      confirmColor: '#ff6b6b',
      success: (res) => {
        if (res.confirm) {
          this.removeBookFromShelf(bookId);
        }
      }
    });
  },

  /**
   * 从书架移除书籍
   */
  removeBookFromShelf(bookId) {
    try {
      const bookList = wx.getStorageSync('novel_shelf') || [];
      const newList = bookList.filter(book => book.id !== bookId);
      
      wx.setStorageSync('novel_shelf', newList);
      this.loadBookList(); // 重新加载以更新统计数据
      
      // 同时删除该书的阅读进度
      const progressKey = `novel_progress_${bookId}`;
      wx.removeStorageSync(progressKey);
      
      wx.showToast({
        title: '已移除',
        icon: 'success'
      });
    } catch (error) {
      console.error('删除失败:', error);
      wx.showToast({
        title: '删除失败',
        icon: 'none'
      });
    }
  }
});
