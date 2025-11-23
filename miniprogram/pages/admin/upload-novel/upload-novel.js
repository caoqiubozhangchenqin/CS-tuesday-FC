// 管理员上传小说页面（极简版）
Page({
  data: {
    selectedFile: null,
    uploading: false,
    fileSizeText: '', // 用于显示文件大小
    novelList: [], // 已上传的小说列表
    loading: false, // 加载状态
    showDeleteModal: false, // 删除确认弹窗显示状态
    deleteNovelTitle: '', // 要删除的小说标题
    deleteNovelData: null // 要删除的小说数据
  },

  onLoad() {
    this.loadNovelList()
  },

  onShow() {
    // 每次显示时刷新列表
    this.loadNovelList()
  },

  /**
   * 加载已上传的小说列表
   */
  async loadNovelList() {
    try {
      this.setData({ loading: true })

      const db = wx.cloud.database()
      const result = await db.collection('novels')
        .orderBy('uploadTime', 'desc')
        .limit(50)
        .get()

      const novelList = result.data.map(novel => ({
        _id: novel._id,
        title: novel.title || '未命名',
        author: novel.author || '未知作者',
        totalPages: novel.totalPages || 0,
        totalChars: novel.totalChars || 0,
        uploadTime: this.formatTime(novel.uploadTime)
      }))

      this.setData({ 
        novelList,
        loading: false
      })
    } catch (error) {
      console.error('加载小说列表失败:', error)
      this.setData({ loading: false })
    }
  },

  /**
   * 格式化时间
   */
  formatTime(timestamp) {
    if (!timestamp) return '未知时间'
    const date = new Date(timestamp)
    const month = date.getMonth() + 1
    const day = date.getDate()
    const hour = date.getHours()
    const minute = date.getMinutes()
    return `${month}月${day}日 ${hour}:${minute < 10 ? '0' + minute : minute}`
  },

  // 选择文件
  chooseFile() {
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['txt'],
      success: res => {
        const file = res.tempFiles[0]
        console.log('已选择文件:', file)
        
        // 从文件名提取书名（去掉 .txt 后缀）
        let bookTitle = file.name.replace(/\.txt$/i, '')
        
        // 计算文件大小（转换为 KB，保留2位小数）
        const sizeInKB = (file.size / 1024).toFixed(2)
        
        this.setData({
          selectedFile: {
            name: file.name,
            bookTitle: bookTitle, // 提取的书名
            path: file.path,
            size: file.size
          },
          fileSizeText: `${sizeInKB} KB`
        })

        wx.showToast({
          title: '文件已选择',
          icon: 'success'
        })
      },
      fail: err => {
        console.error('选择文件失败:', err)
        wx.showToast({
          title: '选择文件失败',
          icon: 'none'
        })
      }
    })
  },

  // 开始上传
  async startUpload() {
    // 验证输入
    if (!this.data.selectedFile) {
      wx.showToast({ title: '请先选择TXT文件', icon: 'none' })
      return
    }

    this.setData({ uploading: true })

    wx.showLoading({ title: '正在上传文件...' })

    try {
      // 第1步：上传文件到云存储
      const uploadRes = await wx.cloud.uploadFile({
        cloudPath: `novels/${Date.now()}_${this.data.selectedFile.name}`,
        filePath: this.data.selectedFile.path
      })

      console.log('文件上传成功:', uploadRes.fileID)

      wx.showLoading({ title: '正在保存信息...' })

      // 第2步：调用云函数保存元信息（使用文件名作为标题）
      // 注意：云函数超时需要在云端配置，客户端只能等待
      const callFunctionPromise = wx.cloud.callFunction({
        name: 'adminUploadNovel',
        data: {
          fileID: uploadRes.fileID,
          title: this.data.selectedFile.bookTitle, // 自动从文件名提取
          author: '未知作者', // 默认值
          category: 'other', // 默认分类
          tags: [], // 空标签
          description: '' // 无简介
        }
      })

      // 手动设置60秒超时保护
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('云函数执行超时，请检查云端配置')), 60000)
      })

      const result = await Promise.race([callFunctionPromise, timeoutPromise])

      wx.hideLoading()

      console.log('上传完成:', result)

      // 云函数返回格式：{ errMsg, result: { success, data, error } }
      const cloudResult = result.result

      if (cloudResult && cloudResult.success) {
        wx.showModal({
          title: '上传成功！',
          content: `《${this.data.selectedFile.bookTitle}》已成功上传\n总字数: ${cloudResult.data.totalChars.toLocaleString()}\n总页数: ${cloudResult.data.totalPages}`,
          showCancel: false,
          success: () => {
            // 清空表单
            this.setData({
              selectedFile: null,
              uploading: false,
              fileSizeText: ''
            })
            // 刷新列表
            this.loadNovelList()
          }
        })
      } else {
        throw new Error(cloudResult ? cloudResult.error : '云函数返回格式错误')
      }

    } catch (error) {
      wx.hideLoading()
      console.error('上传失败:', error)
      
      wx.showModal({
        title: '上传失败',
        content: error.message || '未知错误',
        showCancel: false
      })

      this.setData({ 
        uploading: false,
        fileSizeText: ''
      })
    }
  },

  /**
   * 删除小说 - 显示自定义确认弹窗
   */
  deleteNovel(e) {
    const { novel } = e.currentTarget.dataset
    
    this.setData({
      showDeleteModal: true,
      deleteNovelTitle: novel.title,
      deleteNovelData: novel
    })
  },

  /**
   * 隐藏删除确认弹窗
   */
  hideDeleteModal() {
    this.setData({
      showDeleteModal: false,
      deleteNovelTitle: '',
      deleteNovelData: null
    })
  },

  /**
   * 确认删除小说
   */
  async confirmDeleteNovel() {
    const novel = this.data.deleteNovelData
    
    // 隐藏弹窗
    this.hideDeleteModal()
    
    wx.showLoading({ title: '删除中...' })
    
    try {
      const result = await wx.cloud.callFunction({
        name: 'deleteNovel',
        data: {
          novelId: novel._id
        }
      })

      wx.hideLoading()

      if (result.result.success) {
        wx.showToast({
          title: '删除成功',
          icon: 'success'
        })
        // 刷新列表
        this.loadNovelList()
      } else {
        wx.showModal({
          title: '删除失败',
          content: result.result.message,
          showCancel: false
        })
      }
    } catch (error) {
      wx.hideLoading()
      console.error('删除失败:', error)
      wx.showModal({
        title: '删除失败',
        content: error.message || '未知错误',
        showCancel: false
      })
    }
  }
})
