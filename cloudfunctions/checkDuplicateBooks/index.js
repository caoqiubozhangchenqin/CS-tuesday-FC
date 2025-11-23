// 检查数据库中重复书籍的云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  try {
    console.log('开始检查重复书籍...')

    // 获取所有书籍
    const result = await db.collection('novels')
      .orderBy('uploadTime', 'desc') // 按上传时间倒序
      .get()

    const books = result.data
    console.log(`总共找到 ${books.length} 本书`)

    // 按标题分组，找出重复的书籍
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
    const duplicates = {}
    Object.keys(titleGroups).forEach(title => {
      if (titleGroups[title].length > 1) {
        duplicates[title] = titleGroups[title]
      }
    })

    console.log('\n=== 重复书籍统计 ===')
    let duplicateCount = 0
    Object.keys(duplicates).forEach(title => {
      duplicateCount++
      console.log(`\n📚 ${title} (${duplicates[title].length}本):`)
      duplicates[title].forEach((book, index) => {
        const time = book.uploadTime ? new Date(book.uploadTime).toLocaleString() : '未知时间'
        console.log(`  ${index + 1}. ID: ${book.id}`)
        console.log(`     上传时间: ${time}`)
        console.log(`     文件大小: ${book.fileSize} bytes`)
        console.log(`     字数: ${book.totalChars}, 页数: ${book.totalPages}`)
        console.log(`     文件ID: ${book.fileID}`)
        console.log(`     状态: ${book.hasContent}`)
      })
    })

    // 生成清理建议
    const cleanupSuggestions = []
    Object.keys(duplicates).forEach(title => {
      const books = duplicates[title]
      const readableBooks = books.filter(b => b.hasContent === '可读')
      const unreadableBooks = books.filter(b => b.hasContent === '不可读')

      if (readableBooks.length > 0 && unreadableBooks.length > 0) {
        // 有可读也有不可读的，建议保留最新的可读版本，删除其他所有
        const latestReadable = readableBooks.sort((a, b) => (b.uploadTime || 0) - (a.uploadTime || 0))[0]
        const toDelete = books.filter(b => b.id !== latestReadable.id)

        cleanupSuggestions.push({
          title: title,
          action: `保留最新的可读版本 (ID: ${latestReadable.id})，删除 ${toDelete.length} 本重复书籍`,
          toDelete: toDelete.map(b => b.id)
        })
      } else if (readableBooks.length > 1) {
        // 都是可读的，保留最新的
        const sorted = readableBooks.sort((a, b) => (b.uploadTime || 0) - (a.uploadTime || 0))
        const toKeep = sorted[0]
        const toDelete = sorted.slice(1)

        cleanupSuggestions.push({
          title: title,
          action: `保留最新的版本 (ID: ${toKeep.id})，删除 ${toDelete.length} 本旧版本`,
          toDelete: toDelete.map(b => b.id)
        })
      }
    })

    console.log('\n=== 清理建议 ===')
    cleanupSuggestions.forEach((suggestion, index) => {
      console.log(`${index + 1}. ${suggestion.title}: ${suggestion.action}`)
    })

    return {
      success: true,
      totalBooks: books.length,
      duplicateTitles: Object.keys(duplicates),
      duplicateCount: duplicateCount,
      duplicates: duplicates,
      cleanupSuggestions: cleanupSuggestions,
      message: `找到 ${duplicateCount} 种重复书籍，共 ${Object.keys(duplicates).reduce((sum, title) => sum + duplicates[title].length, 0)} 本`
    }

  } catch (error) {
    console.error('检查失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}