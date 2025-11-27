// pages/novel/shelf/shelf.js
const config = require('../../../config/env.js');
const ErrorHandler = require('../../../utils/errorHandler.js');

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
        .orderBy('title', 'desc') // 按照标题首字母倒序排列
        .limit(100)
        .get();

      console.log('加载云端书籍:', result.data);

      // 格式化书籍数据（兼容新旧数据结构）
      const bookList = result.data.map(book => ({
        id: book._id,
        name: book.title || book.name || '未命名', // 新字段 title，兼容旧字段 name
        author: book.author || '未知作者',
        intro: book.description || book.intro || '暂无简介', // 新字段 description
        category: book.category || '未分类',
        format: book.format || 'TXT',
        fileID: book.fileID,
        cloudPath: book.cloudPath || '', // 新系统可能没有此字段
        cover: book.cover || book.coverUrl || '',
        size: book.fileSize || book.size || 0, // 新字段 fileSize
        sizeText: book.sizeText || this.formatFileSize(book.fileSize || book.size || 0),
        totalPages: book.totalPages || 0, // 新系统的页数
        totalChars: book.totalChars || 0, // 新系统的字数
        uploadTime: this.formatTime(book.uploadTime)
      }));

      // 调整《中国队长》位置到列表首位
      bookList.sort((a, b) => {
        if (a.name === '我 中国队长') return -1;
        if (b.name === '我 中国队长') return 1;
        return 0;
      });

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
        ErrorHandler.handleNetworkError(error, '加载书籍列表失败');
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
   * 跳转到上传页（新版，不需要解析章节）
   */
  goToUpload() {
    wx.navigateTo({
      url: '/pages/admin/upload-novel/upload-novel'
    });
  },

  /**
   * 跳转到阅读页 - 使用新的横向翻页系统
   */
  async goToReader(e) {
    const book = e.currentTarget.dataset.book;
    if (!book) return;

    console.log('打开书籍:', book);

    // 检查是否有必要的字段
    if (!book.fileID) {
      wx.showModal({
        title: '无法打开',
        content: '该书籍缺少文件信息',
        showCancel: false
      });
      return;
    }

    // 直接跳转到新的 reader-v2 页面（横向翻页，不需要解析）
    wx.navigateTo({
      url: `/pages/novel/reader-v2/reader-v2?novelId=${book.id}&title=${encodeURIComponent(book.name)}`
    });
  },

  /**
   * 旧的阅读方法（已废弃，保留以防万一）
   */
  async goToReaderOld(e) {
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

      // 检查是否有解析记录（避免重复解析）
      const parseRecord = wx.getStorageSync(`parse_record_${book.id}`);
      if (parseRecord && parseRecord.parsedRanges && parseRecord.parsedRanges.length > 0) {
        // 已有解析记录，直接跳转
        console.log('已有解析记录，直接阅读:', parseRecord);
        wx.hideLoading();
        wx.navigateTo({
          url: `/pages/novel/reader/reader?bookId=${book.id}&bookName=${encodeURIComponent(book.name)}&isCloud=true`
        });
        return;
      }

      wx.hideLoading();

      const parseResult = await this.parseBookInChunks(book);

      const parsedChapters = parseResult.chapterCount || parseResult.savedCount || 0;
      const isPartial = parseResult.partialComplete;
      
      wx.showToast({
        title: isPartial ? `已解析前 ${parsedChapters} 章` : `已解析 ${parsedChapters} 章`,
        icon: 'success',
        duration: isPartial ? 2500 : 1500
      });

      setTimeout(() => {
        wx.navigateTo({
          url: `/pages/novel/reader/reader?bookId=${book.id}&bookName=${encodeURIComponent(book.name)}&isCloud=true`
        });
      }, isPartial ? 2500 : 1500);
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
      } else if (error.message) {
        errorMsg = error.message;
      }

      ErrorHandler.showError(errorMsg);
    }
  },

  /**
   * 分批调用云函数解析书籍，避免超时
   * 优化策略：首次只解析 30 章（更安全），后续按需加载
   */
  async parseBookInChunks(book) {
    const INITIAL_CHUNK = 30;  // 首次只解析 30 章，确保不超时
    const chunkSize = 50;      // 后续每次 50 章
    let chunkStart = 0;
    let totalChapters = 0;

    try {
      // 首次调用：只解析 50 章
      wx.showLoading({
        title: '解析中...',
        mask: true
      });

      const { result } = await wx.cloud.callFunction({
        name: 'parseNovel',
        data: {
          fileID: book.fileID,
          format: book.format,
          novelId: book.id,
          chunkStart: 0,
          chunkSize: INITIAL_CHUNK
        },
        config: {
          timeout: 20000
        }
      });

      if (!result || !result.success) {
        throw new Error(result?.message || '解析失败');
      }

      totalChapters = result.chapterCount || 0;
      const hasMore = result.hasMore;

      // 保存解析记录
      const parseRecord = {
        bookId: book.id,
        totalChapters,
        parsedRanges: [{ start: 0, end: Math.min(INITIAL_CHUNK, totalChapters) }],  // 已解析范围
        lastParsedChapter: Math.min(INITIAL_CHUNK, totalChapters),
        completed: !hasMore,
        timestamp: Date.now()
      };

      wx.setStorageSync(`parse_record_${book.id}`, parseRecord);

      wx.hideLoading();

      return {
        success: true,
        chapterCount: totalChapters,
        savedCount: Math.min(INITIAL_CHUNK, totalChapters),
        hasMore,
        partialComplete: hasMore,
        message: hasMore 
          ? `已解析前 ${INITIAL_CHUNK} 章，剩余章节可在阅读时按需加载`
          : `已解析全部 ${totalChapters} 章`
      };
    } catch (error) {
      wx.hideLoading();
      throw error;
    }
  },

  /**
   * 删除书籍（仅管理员）
   */
  deleteBook(e) {
    const bookId = e.currentTarget.dataset.id;

    if (!this.data.isAdmin) {
      ErrorHandler.showWarning('仅管理员可删除');
      return;
    }

    ErrorHandler.showConfirm({
      title: '确认删除',
      content: '删除后无法恢复，确定要删除这本书吗？',
      confirmText: '删除'
    }).then((confirmed) => {
      if (confirmed) {
        this.removeBookFromCloud(bookId);
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
      ErrorHandler.showSuccess('已删除');
    } catch (error) {
      wx.hideLoading();
      console.error('删除失败:', error);
      ErrorHandler.handleNetworkError(error, '删除失败');
    }
  },

  /**
   * 格式化文件大小
   */
  formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '未知大小';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }
});
