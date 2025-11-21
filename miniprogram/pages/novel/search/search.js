// pages/novel/search/search.js
const novelApi = require('../../../utils/novelApi.js');

Page({
  data: {
    keyword: '',
    searchResult: [],
    searchHistory: [],
    isSearching: false,
    hasSearched: false
  },

  onLoad(options) {
    this.loadSearchHistory();
    this.loadShelfBooks();
    
    // 如果从推荐页传入了关键词，自动搜索
    if (options.keyword) {
      const keyword = decodeURIComponent(options.keyword);
      this.setData({ keyword });
      // 延迟一下让页面渲染完成
      setTimeout(() => {
        this.onSearch();
      }, 300);
    }
  },

  /**
   * 加载搜索历史
   */
  loadSearchHistory() {
    try {
      const history = wx.getStorageSync('novel_search_history') || [];
      this.setData({ searchHistory: history.slice(0, 10) }); // 最多显示10条
    } catch (error) {
      console.error('加载搜索历史失败:', error);
    }
  },

  /**
   * 加载书架数据（用于标记已在书架的书）
   */
  loadShelfBooks() {
    try {
      this.shelfBooks = wx.getStorageSync('novel_shelf') || [];
    } catch (error) {
      console.error('加载书架失败:', error);
      this.shelfBooks = [];
    }
  },

  /**
   * 输入框变化
   */
  onInputChange(e) {
    this.setData({
      keyword: e.detail.value
    });
  },

  /**
   * 清空输入
   */
  clearInput() {
    this.setData({
      keyword: '',
      searchResult: [],
      hasSearched: false
    });
  },

  /**
   * 搜索
   */
  onSearch() {
    const keyword = this.data.keyword.trim();
    
    if (!keyword) {
      wx.showToast({
        title: '请输入搜索关键词',
        icon: 'none'
      });
      return;
    }

    this.performSearch(keyword);
  },

  /**
   * 执行搜索
   */
  performSearch(keyword) {
    this.setData({
      isSearching: true,
      hasSearched: true,
      searchResult: []
    });

    novelApi.searchNovel(keyword)
      .then(books => {
        // 标记已在书架的书
        books.forEach(book => {
          book.inShelf = this.shelfBooks.some(b => b.name === book.name);
        });

        this.setData({
          searchResult: books,
          isSearching: false
        });

        // 保存搜索历史
        this.saveSearchHistory(keyword);

        if (books.length === 0) {
          wx.showToast({
            title: '没有找到相关小说',
            icon: 'none'
          });
        }
      })
      .catch(error => {
        console.error('搜索失败:', error);
        this.setData({
          isSearching: false
        });
        wx.showModal({
          title: '搜索失败',
          content: error.message || '网络请求失败，请检查网络连接',
          showCancel: false
        });
      });
  },

  /**
   * 保存搜索历史
   */
  saveSearchHistory(keyword) {
    try {
      let history = wx.getStorageSync('novel_search_history') || [];
      
      // 移除重复项
      history = history.filter(item => item !== keyword);
      
      // 添加到开头
      history.unshift(keyword);
      
      // 最多保存20条
      history = history.slice(0, 20);
      
      wx.setStorageSync('novel_search_history', history);
      this.setData({ searchHistory: history.slice(0, 10) });
    } catch (error) {
      console.error('保存搜索历史失败:', error);
    }
  },

  /**
   * 点击搜索历史
   */
  onHistoryClick(e) {
    const keyword = e.currentTarget.dataset.keyword;
    this.setData({ keyword });
    this.performSearch(keyword);
  },

  /**
   * 清空搜索历史
   */
  clearHistory() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空搜索历史吗？',
      confirmColor: '#667eea',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('novel_search_history');
          this.setData({ searchHistory: [] });
          wx.showToast({
            title: '已清空',
            icon: 'success'
          });
        }
      }
    });
  },

  /**
   * 加入书架
   */
  addToShelf(e) {
    const book = e.currentTarget.dataset.book;
    
    try {
      let shelf = wx.getStorageSync('novel_shelf') || [];
      
      // 检查是否已存在
      const exists = shelf.some(b => b.name === book.name);
      if (exists) {
        wx.showToast({
          title: '已在书架中',
          icon: 'none'
        });
        return;
      }

      // 添加到书架
      const shelfBook = {
        id: book.id,
        name: book.name,
        author: book.author,
        cover: book.cover,
        url: book.url,
        currentChapter: 0,
        addTime: Date.now()
      };

      shelf.unshift(shelfBook);
      wx.setStorageSync('novel_shelf', shelf);
      
      // 更新当前书架缓存
      this.shelfBooks = shelf;

      // 更新UI标记
      const searchResult = this.data.searchResult.map(item => {
        if (item.id === book.id) {
          return { ...item, inShelf: true };
        }
        return item;
      });

      this.setData({ searchResult });

      wx.showToast({
        title: '已加入书架',
        icon: 'success'
      });
    } catch (error) {
      console.error('加入书架失败:', error);
      wx.showToast({
        title: '加入书架失败',
        icon: 'none'
      });
    }
  },

  /**
   * 跳转到阅读页
   */
  goToReader(e) {
    const book = e.currentTarget.dataset.book;
    wx.navigateTo({
      url: `/pages/novel/reader/reader?bookId=${book.id}&bookName=${encodeURIComponent(book.name)}`
    });
  }
});
