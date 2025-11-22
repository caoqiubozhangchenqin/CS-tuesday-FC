// 临时测试页面：添加书籍到书架
Page({
  data: {
    loading: false
  },

  async addBook() {
    this.setData({ loading: true });

    try {
      // 调用云函数添加书籍
      const result = await wx.cloud.callFunction({
        name: 'addBookToShelf',
        data: {
          name: '我 中国队长',
          author: '未知作者',
          intro: '一本超过10MB的大型小说，讲述中国队长的故事。',
          category: '未分类',
          format: 'TXT',
          fileID: 'cloud://cloud1-3ge5gomsffe800a7.636c-cloud1-3ge5gomsffe800a7-1373366709/小说/我 中国队长.txt',
          cloudPath: '小说/我 中国队长.txt',
          size: 10485760,  // 10MB
          sizeText: '> 10 MB'
        }
      });

      console.log('云函数返回结果:', result);

      if (result.result && result.result.success) {
        wx.showModal({
          title: '添加成功',
          content: `《${result.result.bookName}》已添加到书架\n\n书籍ID: ${result.result.bookId}`,
          showCancel: false,
          confirmText: '去书架看看',
          success: (res) => {
            if (res.confirm) {
              wx.switchTab({
                url: '/pages/novel/shelf/shelf'
              });
            }
          }
        });
      } else {
        throw new Error(result.result?.message || '添加失败');
      }
    } catch (error) {
      console.error('添加书籍失败:', error);
      wx.showModal({
        title: '添加失败',
        content: error.message || '请检查云函数是否已部署',
        showCancel: false
      });
    } finally {
      this.setData({ loading: false });
    }
  }
});
