// pages/novel/upload/upload.js
Page({
  data: {
    selectedFile: null,
    bookName: '',
    author: '',
    intro: '',
    categories: ['玄幻', '武侠', '仙侠', '都市', '科幻', '言情', '其他'],
    categoryIndex: 0,
    isUploading: false,
    uploadProgress: 0,
    cloudBooks: []
  },

  onLoad() {
    this.loadCloudBooks();
  },

  onShow() {
    this.loadCloudBooks();
  },

  /**
   * 选择文件
   */
  chooseFile() {
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['txt', 'epub'],
      success: (res) => {
        const file = res.tempFiles[0];
        
        // 检查文件大小（限制10MB）
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
          wx.showToast({
            title: '文件超过10MB',
            icon: 'none'
          });
          return;
        }

        // 获取文件扩展名
        const fileName = file.name;
        const format = fileName.split('.').pop().toUpperCase();

        // 自动提取书名（去掉扩展名）
        const bookName = fileName.replace(/\.(txt|epub)$/i, '');

        this.setData({
          selectedFile: {
            path: file.path,
            name: fileName,
            size: file.size,
            sizeText: this.formatFileSize(file.size),
            format: format
          },
          bookName: bookName
        });

        console.log('选择文件:', file);
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
   * 移除文件
   */
  removeFile() {
    this.setData({
      selectedFile: null,
      bookName: '',
      author: '',
      intro: ''
    });
  },

  /**
   * 输入书名
   */
  onBookNameInput(e) {
    this.setData({
      bookName: e.detail.value
    });
  },

  /**
   * 输入作者
   */
  onAuthorInput(e) {
    this.setData({
      author: e.detail.value
    });
  },

  /**
   * 输入简介
   */
  onIntroInput(e) {
    this.setData({
      intro: e.detail.value
    });
  },

  /**
   * 选择分类
   */
  onCategoryChange(e) {
    this.setData({
      categoryIndex: e.detail.value
    });
  },

  /**
   * 上传书籍
   */
  async uploadBook() {
    const { selectedFile, bookName, author, intro, categories, categoryIndex } = this.data;

    if (!selectedFile || !bookName || !author) {
      wx.showToast({
        title: '请填写完整信息',
        icon: 'none'
      });
      return;
    }

    this.setData({ isUploading: true, uploadProgress: 0 });

    try {
      // 生成云存储路径
      const timestamp = Date.now();
      const cloudPath = `novels/${timestamp}_${selectedFile.name}`;

      console.log('开始上传到云存储:', cloudPath);

      // 上传到云存储
      const uploadTask = wx.cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: selectedFile.path
      });

      // 监听上传进度
      uploadTask.onProgressUpdate((res) => {
        console.log('上传进度:', res.progress);
        this.setData({
          uploadProgress: res.progress
        });
      });

      // 等待上传完成
      const uploadResult = await uploadTask;
      console.log('上传成功:', uploadResult);

      // 保存书籍信息到数据库
      const db = wx.cloud.database();
      await db.collection('novels').add({
        data: {
          name: bookName,
          author: author,
          intro: intro || '暂无简介',
          category: categories[categoryIndex],
          format: selectedFile.format,
          fileID: uploadResult.fileID,
          cloudPath: cloudPath,
          size: selectedFile.size,
          sizeText: selectedFile.sizeText,
          uploadTime: db.serverDate(),
          _openid: '{openid}' // 云函数会自动填充
        }
      });

      wx.showToast({
        title: '上传成功',
        icon: 'success'
      });

      // 重置表单
      this.setData({
        selectedFile: null,
        bookName: '',
        author: '',
        intro: '',
        categoryIndex: 0,
        isUploading: false,
        uploadProgress: 100
      });

      // 刷新列表
      setTimeout(() => {
        this.setData({ uploadProgress: 0 });
        this.loadCloudBooks();
      }, 1000);

    } catch (error) {
      console.error('上传失败:', error);
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
   * 加载云端书籍列表
   */
  async loadCloudBooks() {
    try {
      const db = wx.cloud.database();
      const result = await db.collection('novels')
        .orderBy('uploadTime', 'desc')
        .get();

      console.log('云端书籍:', result.data);

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

            // 从数据库删除
            const db = wx.cloud.database();
            await db.collection('novels').doc(bookId).remove();

            // 刷新列表
            await this.loadCloudBooks();

            wx.hideLoading();
            wx.showToast({
              title: '已删除',
              icon: 'success'
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
      }
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
