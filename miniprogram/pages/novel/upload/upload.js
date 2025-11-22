// pages/novel/upload/upload.js
const config = require('../../../config/env.js');

Page({
  data: {
    selectedFiles: [],       // 改为数组支持多文件
    categories: ['玄幻', '武侠', '仙侠', '都市', '科幻', '言情', '其他'],
    categoryIndex: 0,
    isUploading: false,
    uploadProgress: 0,
    currentFile: 0,          // 当前上传第几个
    totalFiles: 0,           // 总文件数
    cloudBooks: [],
    isAdmin: false
  },

  onLoad() {
    this.checkAdminStatus();
  },

  onShow() {
    if (this.data.isAdmin) {
      this.loadCloudBooks();
    }
  },

  /**
   * 检查管理员权限
   */
  checkAdminStatus() {
    const app = getApp();
    const userOpenid = app.globalData.openid;
    const adminOpenid = config.adminOpenId;

    console.log('检查权限 - 用户:', userOpenid, '管理员:', adminOpenid);

    if (userOpenid === adminOpenid) {
      this.setData({ isAdmin: true });
      this.loadCloudBooks();
    } else {
      this.setData({ isAdmin: false });
      // 非管理员，显示提示并返回
      wx.showModal({
        title: '权限不足',
        content: '上传书籍功能仅限管理员使用',
        showCancel: false,
        confirmText: '返回书架',
        success: () => {
          wx.navigateBack();
        }
      });
    }
  },

  /**
   * 批量选择文件
   */
  chooseFiles() {
    wx.chooseMessageFile({
      count: 10, // 最多选择10个文件
      type: 'file',
      extension: ['txt', 'epub'],
      success: (res) => {
        const files = res.tempFiles;
        const maxSize = 10 * 1024 * 1024;
        const validFiles = [];

        // 检查文件大小
        for (let file of files) {
          if (file.size > maxSize) {
            wx.showToast({
              title: `${file.name} 超过10MB`,
              icon: 'none'
            });
            continue;
          }

          const fileName = file.name;
          const format = fileName.split('.').pop().toUpperCase();
          const bookName = fileName.replace(/\.(txt|epub)$/i, '');

          validFiles.push({
            path: file.path,
            name: fileName,
            bookName: bookName,
            size: file.size,
            sizeText: this.formatFileSize(file.size),
            format: format
          });
        }

        this.setData({
          selectedFiles: validFiles
        });

        console.log('选择文件:', validFiles);
      },
      fail: (err) => {
        console.error('选择文件失败:', err);
        wx.showToast({
          title: '选择文件失败',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 移除单个文件
   */
  removeFile(e) {
    const index = e.currentTarget.dataset.index;
    const files = this.data.selectedFiles;
    files.splice(index, 1);
    this.setData({
      selectedFiles: files
    });
  },

  /**
   * 批量上传书籍
   */
  async uploadBooks() {
    const { selectedFiles } = this.data;

    if (!selectedFiles || selectedFiles.length === 0) {
      wx.showToast({
        title: '请先选择文件',
        icon: 'none'
      });
      return;
    }

    this.setData({ 
      isUploading: true, 
      uploadProgress: 0,
      totalFiles: selectedFiles.length,
      currentFile: 0
    });

    const db = wx.cloud.database();
    let successCount = 0;

    try {
      // 逐个上传文件
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        this.setData({ currentFile: i + 1 });

        try {
          // 生成云存储路径
          const timestamp = Date.now();
          const cloudPath = `小说/${timestamp}_${file.name}`;

          console.log(`上传文件 ${i + 1}/${selectedFiles.length}:`, cloudPath);

          // 上传到云存储
          const uploadResult = await wx.cloud.uploadFile({
            cloudPath: cloudPath,
            filePath: file.path
          });

          // 保存到数据库
          await db.collection('novels').add({
            data: {
              name: file.bookName,
              author: '未知作者',
              intro: '暂无简介',
              category: '其他',
              format: file.format,
              fileID: uploadResult.fileID,
              cloudPath: cloudPath,
              size: file.size,
              sizeText: file.sizeText,
              uploadTime: db.serverDate()
            }
          });

          successCount++;
          
          // 更新进度
          const progress = Math.round(((i + 1) / selectedFiles.length) * 100);
          this.setData({ uploadProgress: progress });

        } catch (error) {
          console.error(`上传失败 ${file.name}:`, error);
        }
      }

      // 全部完成
      wx.showModal({
        title: '上传完成',
        content: `成功上传 ${successCount}/${selectedFiles.length} 个文件`,
        showCancel: false
      });

      // 重置表单
      this.setData({
        selectedFiles: [],
        isUploading: false,
        uploadProgress: 0,
        currentFile: 0,
        totalFiles: 0
      });

      // 刷新列表
      setTimeout(() => {
        this.loadCloudBooks();
      }, 1000);

    } catch (error) {
      console.error('批量上传失败:', error);
      wx.showModal({
        title: '上传失败',
        content: error.message || '请检查网络连接',
        showCancel: false
      });
      this.setData({
        isUploading: false,
        uploadProgress: 0
      });
    }
  },

  /**
   * 加载云端书籍列表（全局共享，所有用户可见）
   */
  async loadCloudBooks() {
    try {
      const db = wx.cloud.database();
      // 移除 openid 过滤，让所有用户都能看到所有书籍
      const result = await db.collection('novels')
        .orderBy('uploadTime', 'desc')
        .limit(100) // 限制最多返回100本书
        .get();

      console.log('云端书籍（全局共享）:', result.data);

      this.setData({
        cloudBooks: result.data.map(book => ({
          id: book._id,
          name: book.name,
          author: book.author,
          intro: book.intro,
          category: book.category,
          format: book.format,
          fileID: book.fileID,
          cloudPath: book.cloudPath,
          size: book.size,
          sizeText: book.sizeText
        }))
      });
    } catch (error) {
      console.error('加载云端书籍失败:', error);
      
      // 处理数据库集合不存在的情况
      if (error.errCode === -502005) {
        console.warn('数据库集合 novels 不存在');
        this.setData({ cloudBooks: [] });
      }
    }
  },

  /**
   * 查看书籍详情
   */
  viewBook(e) {
    const book = e.currentTarget.dataset.book;
    wx.showModal({
      title: book.name,
      content: `作者：${book.author}\n分类：${book.category}\n格式：${book.format}\n大小：${book.sizeText}\n\n${book.intro}`,
      confirmText: '阅读',
      success: (res) => {
        if (res.confirm) {
          // 跳转到阅读页
          this.downloadAndRead(book);
        }
      }
    });
  },

  /**
   * 下载并阅读
   */
  async downloadAndRead(book) {
    wx.showLoading({ title: '加载中...' });

    try {
      // 调用云函数解析书籍
      const result = await wx.cloud.callFunction({
        name: 'parseNovel',
        data: {
          fileID: book.fileID,
          format: book.format
        }
      });

      wx.hideLoading();

      if (result.result.success) {
        // 保存到本地书架
        this.addToShelf(book, result.result.chapters);
        
        wx.showToast({
          title: '已加入书架',
          icon: 'success'
        });

        // 跳转到阅读页
        setTimeout(() => {
          wx.navigateTo({
            url: `/pages/novel/reader/reader?bookId=${book.id}&bookName=${encodeURIComponent(book.name)}`
          });
        }, 1000);
      } else {
        wx.showModal({
          title: '解析失败',
          content: result.result.message || '文件格式不支持',
          showCancel: false
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('下载失败:', error);
      wx.showModal({
        title: '加载失败',
        content: error.message || '请检查网络连接',
        showCancel: false
      });
    }
  },

  /**
   * 添加到书架
   */
  addToShelf(book, chapters) {
    try {
      let shelf = wx.getStorageSync('novel_shelf') || [];
      
      // 检查是否已存在
      const exists = shelf.some(b => b.id === book.id);
      if (exists) return;

      // 添加到书架
      shelf.unshift({
        id: book.id,
        name: book.name,
        author: book.author,
        cover: '',
        url: book.fileID,
        currentChapter: 0,
        addTime: Date.now(),
        isCloud: true, // 标记为云端书籍
        chapters: chapters // 保存章节列表
      });

      wx.setStorageSync('novel_shelf', shelf);
    } catch (error) {
      console.error('添加到书架失败:', error);
    }
  },

  /**
   * 下载书籍到本地
   */
  async downloadBook(e) {
    const book = e.currentTarget.dataset.book;
    
    wx.showLoading({ title: '下载中...' });

    try {
      // 获取临时链接
      const result = await wx.cloud.getTempFileURL({
        fileList: [book.fileID]
      });

      wx.hideLoading();

      if (result.fileList[0].tempFileURL) {
        // 保存文件
        wx.saveFile({
          tempFilePath: result.fileList[0].tempFileURL,
          success: (res) => {
            wx.showToast({
              title: '下载成功',
              icon: 'success'
            });
            console.log('文件已保存:', res.savedFilePath);
          }
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('下载失败:', error);
      wx.showToast({
        title: '下载失败',
        icon: 'none'
      });
    }
  },

  /**
   * 删除书籍
   */
  deleteBook(e) {
    const bookId = e.currentTarget.dataset.id;
    
    wx.showModal({
      title: '确认删除',
      content: '删除后无法恢复，确定要删除吗？',
      confirmColor: '#ff4d4f',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '删除中...' });

            const db = wx.cloud.database();
            
            // 1. 先删除所有章节
            try {
              const chaptersResult = await db.collection('novel_chapters')
                .where({ novelId: bookId })
                .get();
              
              console.log(`找到 ${chaptersResult.data.length} 章需要删除`);
              
              // 批量删除章节（每次最多20条）
              const batchSize = 20;
              for (let i = 0; i < chaptersResult.data.length; i += batchSize) {
                const batch = chaptersResult.data.slice(i, i + batchSize);
                await Promise.all(
                  batch.map(chapter => 
                    db.collection('novel_chapters').doc(chapter._id).remove()
                  )
                );
              }
              console.log('章节删除完成');
            } catch (chapterError) {
              console.error('删除章节时出错:', chapterError);
              // 继续删除小说记录
            }

            // 2. 删除小说记录
            await db.collection('novels').doc(bookId).remove();
            console.log('小说记录删除完成');

            // 3. 刷新列表
            await this.loadCloudBooks();

            wx.hideLoading();
            wx.showToast({
              title: '删除成功',
              icon: 'success'
            });
          } catch (error) {
            wx.hideLoading();
            console.error('删除失败:', error);
            
            // 根据错误类型提供更友好的提示
            let errorMsg = '删除失败';
            if (error.errCode === -502003) {
              errorMsg = '没有删除权限';
            } else if (error.message) {
              errorMsg = error.message;
            }
            
            wx.showToast({
              title: errorMsg,
              icon: 'none',
              duration: 2000
            });
          }
        }
      }
    });
  },

  /**
   * 返回书架
   */
  goBack() {
    wx.navigateBack({
      delta: 1
    });
  },

  /**
   * 格式化文件大小
   */
  formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }
});
