// 临时检查书架重复书籍的脚本
const db = wx.cloud.database()

Page({
  data: {
    bookList: [],
    duplicates: [],
    loading: true
  },

  onLoad() {
    this.checkShelfDuplicates()
  },

  async checkShelfDuplicates() {
    try {
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

    } catch (error) {
      console.error('检查失败:', error)
      this.setData({ loading: false })
    }
  },

  formatTime(timestamp) {
    if (!timestamp) return '未知时间'
    const date = new Date(timestamp)
    return date.toLocaleString()
  }
})