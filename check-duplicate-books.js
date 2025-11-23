// 检查书架重复书籍的脚本
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  try {
    // 获取所有书籍
    const result = await db.collection('novels')
      .orderBy('title', 'desc')
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
        fileID: book.fileID ? '有' : '无'
      })
    })

    // 找出重复的书籍
    const duplicates = {}
    Object.keys(titleGroups).forEach(title => {
      if (titleGroups[title].length > 1) {
        duplicates[title] = titleGroups[title]
      }
    })

    console.log('重复书籍统计:')
    Object.keys(duplicates).forEach(title => {
      console.log(`\n📚 ${title} (${duplicates[title].length}本):`)
      duplicates[title].forEach((book, index) => {
        const time = book.uploadTime ? new Date(book.uploadTime).toLocaleString() : '未知时间'
        console.log(`  ${index + 1}. ID: ${book.id}`)
        console.log(`     上传时间: ${time}`)
        console.log(`     文件大小: ${book.fileSize} bytes`)
        console.log(`     字数: ${book.totalChars}, 页数: ${book.totalPages}`)
        console.log(`     文件ID: ${book.fileID}`)
      })
    })

    return {
      success: true,
      totalBooks: books.length,
      duplicateTitles: Object.keys(duplicates),
      duplicates: duplicates,
      message: `找到 ${Object.keys(duplicates).length} 种重复书籍`
    }

  } catch (error) {
    console.error('检查失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}