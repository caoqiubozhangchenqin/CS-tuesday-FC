// pages/novel/shelf/shelf.js
const config = require('../../../config/env.js');

Page({
  data: {
    bookList: [],
    totalBooks: 0,
    isAdmin: false, // 管理员标识
    loading: true
  },

  onLoad() {
    this.checkAdminStatus();
    this.loadCloudBooks(); // 直接加载云端书籍
  },

  onShow() {
    // 每次显示页面时重新加载书籍列表
    this.loadCloudBooks();
  },

  /**
   * 检查管理员权限
   */
  checkAdminStatus() {
    const app = getApp();
    const userOpenid = app.globalData.openid;
    const adminOpenid = config.adminOpenId;

    if (userOpenid === adminOpenid) {
      this.setData({ isAdmin: true });
      console.log('管理员身份已确认');
    } else {
      this.setData({ isAdmin: false });
      console.log('普通用户身份');
    }
  },

  /**
   * 从云数据库加载所有书籍列表
   */
  async loadCloudBooks() {
    try {
      this.setData({ loading: true });

      const db = wx.cloud.database();
      const result = await db.collection('novels')
        .orderBy('uploadTime', 'desc')
        .limit(100)
        .get();

      console.log('加载云端书籍:', result.data);

      // 格式化书籍数据
      const bookList = result.data.map(book => ({
        id: book._id,
        name: book.name,
        author: book.author,
        intro: book.intro || '暂无简介',
        category: book.category || '未分类',
        format: book.format,
        fileID: book.fileID,
        cloudPath: book.cloudPath,
        cover: book.cover || '',
        size: book.size,
        sizeText: book.sizeText,
        uploadTime: this.formatTime(book.uploadTime)
      }));

      this.setData({ 
        bookList,
        totalBooks: bookList.length,
        loading: false
      });
    } catch (error) {
      console.error('加载书籍列表失败:', error);
      this.setData({ loading: false });
      
      // 处理数据库集合不存在的情况
      if (error.errCode === -502005) {
        console.warn('数据库集合 novels 不存在，请在云开发控制台创建');
        wx.showModal({
          title: '数据库未初始化',
          content: '请先在云开发控制台创建 novels 数据库集合',
          showCancel: false,
          confirmText: '我知道了'
        });
      } else {
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        });
      }
    }
  },

  /**
   * 格式化时间
   */
  formatTime(timestamp) {
    if (!timestamp) return '未知时间';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return '今天';
    } else if (days === 1) {
      return '昨天';
    } else if (days < 7) {
      return `${days}天前`;
    } else if (days < 30) {
      return `${Math.floor(days / 7)}周前`;
    } else {
      return `${date.getMonth() + 1}月${date.getDate()}日`;
    }
  },

  /**
   * 跳转到上传页
   */
  goToUpload() {
    wx.navigateTo({
      url: '/pages/novel/upload/upload'
    });
  },

  /**
   * 跳转到阅读页 - 从云数据库读取章节
   */
  async goToReader(e) {
    const book = e.currentTarget.dataset.book;
    if (!book) return;

    wx.showLoading({ 
      title: '加载中...',
      mask: true 
    });

    try {
      const db = wx.cloud.database();
      
      // 1. 先检查数据库是否已有章节
      const checkResult = await db.collection('novel_chapters')
        .where({
          novelId: book.id
        })
        .count();

      if (checkResult.total > 0) {
        // 数据库已有章节，直接跳转阅读
        console.log('数据库已有章节，直接阅读');
        wx.hideLoading();
        wx.navigateTo({
          url: `/pages/novel/reader/reader?bookId=${book.id}&bookName=${encodeURIComponent(book.name)}&isCloud=true`
        });
        return;
      }

      // 2. 数据库没有章节，需要解析并保存
      console.log('首次打开，需要解析书籍');
      wx.showLoading({ 
        title: '首次打开需解析\n请稍候...',
        mask: true 
      });

      // 调用云函数解析并保存到数据库
      const result = await wx.cloud.callFunction({
        name: 'parseNovel',
        data: {
          fileID: book.fileID,
          format: book.format,
          novelId: book.id  // 传入小说ID
        },
        config: {
          timeout: 60000  // 60秒超时（解析+保存需要更长时间）
        }
      });

      wx.hideLoading();

      if (result.result && result.result.success) {
        // 解析成功，跳转到阅读页
        wx.showToast({
          title: `已解析 ${result.result.chapterCount} 章`,
          icon: 'success',
          duration: 1500
        });

        setTimeout(() => {
          wx.navigateTo({
            url: `/pages/novel/reader/reader?bookId=${book.id}&bookName=${encodeURIComponent(book.name)}&isCloud=true`
          });
        }, 1500);
      } else {
        wx.showModal({
          title: '解析失败',
          content: result.result?.message || '无法解析该书籍',
          showCancel: false
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('解析书籍失败:', error);
      
      // 根据错误类型给出不同提示
      let errorMsg = '请检查网络连接';
      if (error.errCode === -504003) {
        errorMsg = '解析超时\n请尝试上传更小的文件';
      } else if (error.errCode === -504002) {
        errorMsg = '文件过大\n已优化：章节将保存到云端';
      } else if (error.errMsg) {
        errorMsg = error.errMsg;
      }
      
      wx.showModal({
        title: '解析失败',
        content: errorMsg,
        showCancel: false
      });
    }
  },

  /**
   * 删除书籍（仅管理员）
   */
  deleteBook(e) {
    const bookId = e.currentTarget.dataset.id;
    
    if (!this.data.isAdmin) {
      wx.showToast({
        title: '仅管理员可删除',
        icon: 'none'
      });
      return;
    }

    wx.showModal({
      title: '确认删除',
      content: '删除后无法恢复，确定要删除这本书吗？',
      confirmText: '删除',
      confirmColor: '#ff6b6b',
      success: async (res) => {
        if (res.confirm) {
          await this.removeBookFromCloud(bookId);
        }
      }
    });
  },

  /**
   * 从云端删除书籍
   */
  async removeBookFromCloud(bookId) {
    try {
      wx.showLoading({ title: '删除中...' });

      const db = wx.cloud.database();
      
      // 1. 删除书籍元数据
      await db.collection('novels').doc(bookId).remove();

      // 2. 删除章节数据
      const _ = db.command;
      await db.collection('novel_chapters')
        .where({
          novelId: bookId
        })
        .remove();

      // 重新加载列表
      await this.loadCloudBooks();

      wx.hideLoading();
      wx.showToast({
        title: '已删除',
        icon: 'success',
        duration: 2000
      });
    } catch (error) {
      wx.hideLoading();
      console.error('删除失败:', error);
      wx.showToast({
        title: '删除失败',
        icon: 'none'
      });
    }
  }
});
