// pages/admin/shelf-check/shelf-check.js
Page({
  data: {
    bookList: [],
    duplicates: [],
    loading: true
  },

  onLoad() {
    this.checkShelfDuplicates()
  },

  /**
   * 重新检查重复书籍
   */
  refreshCheck() {
    this.checkShelfDuplicates()
  },

  /**
   * 检查书架中的重复书籍
   */
  async checkShelfDuplicates() {
    try {
      console.log('开始检查书架重复书籍...')

      const db = wx.cloud.database()

      // 获取所有书籍
      const result = await db.collection('novels')
        .orderBy('title', 'desc')
        .get()

      const books = result.data
      console.log('书架中的所有书籍:', books)

      // 按标题分组统计
      const titleGroups = {}
      books.forEach(book => {
        const title = book.title || book.name || '未命名'
        if (!titleGroups[title]) {
          titleGroups[title] = []
        }
        titleGroups[title].push(book)
      })

      // 找出重复的书籍
      const duplicates = []
      Object.keys(titleGroups).forEach(title => {
        if (titleGroups[title].length > 1) {
          duplicates.push({
            title: title,
            count: titleGroups[title].length,
            books: titleGroups[title]
          })
        }
      })

      console.log('发现重复书籍:', duplicates)

      // 格式化书籍列表用于显示
      const bookList = books.map(book => ({
        id: book._id,
        name: book.title || book.name || '未命名',
        author: book.author || '未知作者',
        totalChars: book.totalChars || 0,
        totalPages: book.totalPages || 0,
        uploadTime: this.formatTime(book.uploadTime),
        fileID: book.fileID ? '有' : '无',
        hasContent: (book.totalChars > 0) ? '可读' : '不可读'
      }))

      this.setData({
        bookList: bookList,
        duplicates: duplicates,
        loading: false
      })

      // 显示检查结果
      if (duplicates.length > 0) {
        wx.showModal({
          title: '检查结果',
          content: `发现 ${duplicates.length} 种重复书籍：\n${duplicates.map(d => `${d.title}(${d.count}本)`).join('\n')}`,
          showCancel: false,
          confirmText: '知道了'
        })
      } else {
        wx.showToast({
          title: '没有重复书籍',
          icon: 'success'
        })
      }

    } catch (error) {
      console.error('检查失败:', error)
      this.setData({ loading: false })
      wx.showModal({
        title: '检查失败',
        content: error.message || '未知错误',
        showCancel: false
      })
    }
  },

  /**
   * 格式化时间
   */
  formatTime(timestamp) {
    if (!timestamp) return '未知时间'

    const date = new Date(timestamp)
    const now = new Date()
    const diff = now - date
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) {
      return '今天 ' + date.toLocaleTimeString()
    } else if (days === 1) {
      return '昨天 ' + date.toLocaleTimeString()
    } else if (days < 7) {
      return `${days}天前`
    } else {
      return date.toLocaleString()
    }
  },

  /**
   * 清理重复书籍
   */
  async cleanupDuplicates() {
    if (this.data.duplicates.length === 0) {
      wx.showToast({ title: '没有重复书籍', icon: 'none' })
      return
    }

    wx.showModal({
      title: '确认清理',
      content: `将清理 ${this.data.duplicates.length} 种重复书籍，保留最新的可读版本。确定继续？`,
      success: async (res) => {
        if (res.confirm) {
          await this.performCleanup()
        }
      }
    })
  },

  /**
   * 执行清理
   */
  async performCleanup() {
    this.setData({
      loading: true
    })

    try {
      let deletedCount = 0

      for (const duplicate of this.data.duplicates) {
        const books = duplicate.books

        // 找出可读的书籍
        const readableBooks = books.filter(b => b.totalChars > 0)

        if (readableBooks.length > 0) {
          // 保留最新的可读版本
          const sorted = readableBooks.sort((a, b) => (b.uploadTime || 0) - (a.uploadTime || 0))
          const toKeep = sorted[0]
          const toDelete = books.filter(b => b._id !== toKeep._id)

          // 删除其他版本
          for (const book of toDelete) {
            try {
              await this.deleteBook(book._id)
              console.log(`已删除: ${book.title || book.name} (ID: ${book._id})`)
              deletedCount++
            } catch (deleteError) {
              console.warn(`删除失败 ${book.title || book.name} (ID: ${book._id}):`, deleteError.message)
              // 继续删除其他书籍，不因为单个失败而停止
            }
          }
        } else {
          // 如果都没有可读的，保留最新的一个
          const sorted = books.sort((a, b) => (b.uploadTime || 0) - (a.uploadTime || 0))
          const toKeep = sorted[0]
          const toDelete = books.filter(b => b._id !== toKeep._id)

          for (const book of toDelete) {
            try {
              await this.deleteBook(book._id)
              console.log(`已删除: ${book.title || book.name} (ID: ${book._id})`)
              deletedCount++
            } catch (deleteError) {
              console.warn(`删除失败 ${book.title || book.name} (ID: ${book._id}):`, deleteError.message)
              // 继续删除其他书籍，不因为单个失败而停止
            }
          }
        }
      }

      wx.showToast({
        title: `清理完成，删除了 ${deletedCount} 本书`,
        icon: 'success',
        duration: 2000
      })

      // 重新检查
      setTimeout(() => {
        this.checkShelfDuplicates()
      }, 2000)

    } catch (error) {
      console.error('清理失败:', error)
      this.setData({ loading: false })
      wx.showToast({ title: '清理失败', icon: 'none' })
    }
  },

  /**
   * 删除单本书籍
   */
  async deleteBook(bookId) {
    try {
      // 调用云函数删除书籍
      const result = await wx.cloud.callFunction({
        name: 'deleteNovel',
        data: {
          novelId: bookId
        }
      })

      if (result.result.success) {
        console.log('云函数删除成功:', result.result.message)
        return true
      } else {
        throw new Error(result.result.message)
      }
    } catch (error) {
      console.error('删除书籍失败:', error)
      throw error
    }
  }
})