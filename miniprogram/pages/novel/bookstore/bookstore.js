// pages/novel/bookstore/bookstore.js
Page({
  data: {
    recommendBooks: [],    // 推荐小说
    categoryBooks: {},     // 分类小说
    categories: ['古典名著', '现代文学', '外国文学', '其他'],
    loading: true,
    activeCategory: '全部'
  },

  onLoad() {
    this.loadBooks();
  },

  onShow() {
    // 每次显示时刷新列表
    this.loadBooks();
  },

  /**
   * 加载公共小说列表
   */
  async loadBooks() {
    try {
      wx.showLoading({ title: '加载中...' });
      this.setData({ loading: true });

      const db = wx.cloud.database();
      const _ = db.command;

      // 1. 加载推荐小说
      const recommendRes = await db.collection('novels')
        .where({
          status: 'published',
          isRecommended: true
        })
        .orderBy('viewCount', 'desc')
        .limit(10)
        .get();

      // 2. 加载所有已发布的小说
      const allBooksRes = await db.collection('novels')
        .where({ status: 'published' })
        .orderBy('uploadTime', 'desc')
        .limit(100)
        .get();

      // 3. 按分类整理
      const categoryBooks = {};
      this.data.categories.forEach(cat => {
        categoryBooks[cat] = allBooksRes.data.filter(book => book.category === cat);
      });

      this.setData({
        recommendBooks: recommendRes.data,
        categoryBooks: categoryBooks,
        loading: false
      });

      wx.hideLoading();
    } catch (error) {
      console.error('加载小说列表失败:', error);
      wx.hideLoading();
      
      if (error.errCode === -502005) {
        wx.showModal({
          title: '数据库未初始化',
          content: '请按照"数据库集合配置指南.md"创建 novels 集合',
          showCancel: false
        });
      } else {
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        });
      }
      
      this.setData({ loading: false });
    }
  },

  /**
   * 打开小说阅读器
   */
  openBook(e) {
    const novelId = e.currentTarget.dataset.id;
    const novelData = e.currentTarget.dataset.novel;
    
    console.log('打开小说:', novelId);
    
    wx.navigateTo({
      url: `/pages/novel/reader-v2/reader-v2?novelId=${novelId}`
    });
  },

  /**
   * 加入书架
   */
  async addToShelf(e) {
    const novelId = e.currentTarget.dataset.id;
    const novelData = e.currentTarget.dataset.novel;

    try {
      wx.showLoading({ title: '添加中...' });

      const db = wx.cloud.database();

      // 检查是否已在书架
      const exist = await db.collection('user_shelf')
        .where({ novelId })
        .get();

      if (exist.data.length > 0) {
        wx.showToast({
          title: '已在书架中',
          icon: 'none'
        });
        return;
      }

      // 添加到书架
      await db.collection('user_shelf').add({
        data: {
          novelId,
          novelTitle: novelData.title,
          novelCover: novelData.cover || '',
          novelAuthor: novelData.author,
          addTime: Date.now(),
          lastReadTime: Date.now(),
          isFavorite: true
        }
      });

      // 更新小说收藏数
      await db.collection('novels').doc(novelId).update({
        data: {
          favoriteCount: db.command.inc(1)
        }
      });

      wx.showToast({
        title: '已加入书架',
        icon: 'success'
      });
    } catch (error) {
      console.error('添加到书架失败:', error);
      wx.showToast({
        title: '添加失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  /**
   * 切换分类
   */
  switchCategory(e) {
    const category = e.currentTarget.dataset.category;
    this.setData({
      activeCategory: category
    });
  },

  /**
   * 格式化阅读量
   */
  formatViewCount(count) {
    if (count >= 10000) {
      return (count / 10000).toFixed(1) + '万';
    }
    return count;
  }
});
