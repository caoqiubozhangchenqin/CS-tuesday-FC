// 检查重复书籍的临时脚本
const db = wx.cloud.database()

Page({
  data: {
    duplicates: [],
    loading: false,
    message: ''
  },

  onLoad() {
    this.checkDuplicates()
  },

  async checkDuplicates() {
    this.setData({ loading: true, message: '正在检查重复书籍...' })

    try {
      const result = await db.collection('novels')
        .orderBy('uploadTime', 'desc')
        .get()

      const books = result.data
      console.log(`总共找到 ${books.length} 本书`)

      // 按标题分组
      const titleGroups = {}
      books.forEach(book => {
        const title = book.title || book.name || '未命名'
        if (!titleGroups[title]) {
          titleGroups[title] = []
        }
        titleGroups[title].push({
          id: book._id,
          title: title,
          author: book.author || '未知',
          uploadTime: book.uploadTime,
          fileSize: book.fileSize || book.size || 0,
          totalChars: book.totalChars || 0,
          totalPages: book.totalPages || 0,
          fileID: book.fileID ? '有' : '无',
          hasContent: (book.totalChars > 0) ? '可读' : '不可读'
        })
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

      console.log('重复书籍:', duplicates)

      this.setData({
        duplicates: duplicates,
        loading: false,
        message: `检查完成，找到 ${duplicates.length} 种重复书籍`
      })

    } catch (error) {
      console.error('检查失败:', error)
      this.setData({
        loading: false,
        message: '检查失败: ' + error.message
      })
    }
  },

  // 清理重复书籍
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

  async performCleanup() {
    this.setData({ loading: true, message: '正在清理重复书籍...' })

    try {
      let deletedCount = 0

      for (const duplicate of this.data.duplicates) {
        const books = duplicate.books

        // 找出可读的书籍
        const readableBooks = books.filter(b => b.hasContent === '可读')

        if (readableBooks.length > 0) {
          // 保留最新的可读版本
          const sorted = readableBooks.sort((a, b) => (b.uploadTime || 0) - (a.uploadTime || 0))
          const toKeep = sorted[0]
          const toDelete = books.filter(b => b.id !== toKeep.id)

          // 删除其他版本
          for (const book of toDelete) {
            await db.collection('novels').doc(book.id).remove()
            console.log(`已删除: ${book.title} (ID: ${book.id})`)
            deletedCount++
          }
        } else {
          // 如果都没有可读的，保留最新的一个
          const sorted = books.sort((a, b) => (b.uploadTime || 0) - (a.uploadTime || 0))
          const toKeep = sorted[0]
          const toDelete = books.filter(b => b.id !== toKeep.id)

          for (const book of toDelete) {
            await db.collection('novels').doc(book.id).remove()
            console.log(`已删除: ${book.title} (ID: ${book.id})`)
            deletedCount++
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
        this.checkDuplicates()
      }, 2000)

    } catch (error) {
      console.error('清理失败:', error)
      this.setData({ loading: false })
      wx.showToast({ title: '清理失败', icon: 'none' })
    }
  }
})