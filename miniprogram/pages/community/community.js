// pages/community/community.js
const app = getApp();

Page({
  data: {
    bgImageUrl: '',
    newMessage: '',
    messageLength: 0,
    canPost: false,
    messageList: [],
    isLoading: false,
    sortBy: 'time', // 'time' 或 'likes'
    // 用户信息
    userInfo: null,
    hasUserInfo: false,
    userValue: 0,
    selectedTeam: ''
  },

  onLoad: function() {
    // 获取背景图
    if (app.globalData && app.globalData.bgImageUrl) {
      this.setData({ bgImageUrl: app.globalData.bgImageUrl });
    }
    
    // 获取用户信息
    this.loadUserInfo();
    
    // 加载留言数据
    this.loadMessages();
  },

  // 加载用户信息
  loadUserInfo: function() {
    try {
      const userInfo = wx.getStorageSync('userInfo');
      const userValue = wx.getStorageSync('userValue') || 0;
      const selectedTeam = wx.getStorageSync('selectedTeam') || '';
      
      this.setData({
        userInfo: userInfo,
        hasUserInfo: !!userInfo,
        userValue: userValue,
        selectedTeam: selectedTeam
      });
    } catch (e) {
      console.error('加载用户信息失败', e);
    }
  },

  onShow: function() {
    // 每次显示页面时刷新留言
    this.loadMessages();
  },

  // 输入留言内容
  onMessageInput: function(e) {
    const content = e.detail.value;
    this.setData({
      newMessage: content,
      messageLength: content.length,
      canPost: content.trim().length > 0
    });
  },

  // 提交留言
  submitMessage: function() {
    const content = this.data.newMessage.trim();
    if (!content) {
      wx.showToast({ title: '请输入留言内容', icon: 'none' });
      return;
    }

    if (content.length > 200) {
      wx.showToast({ title: '留言不能超过200字', icon: 'none' });
      return;
    }

    // 检查用户是否已完成评估
    if (!this.data.hasUserInfo) {
      wx.showToast({ title: '请先完成身价评估', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '发布中...' });

    // 模拟发布留言
    setTimeout(() => {
      const newMessage = {
        id: Date.now(),
        userId: this.data.userInfo ? this.data.userInfo.nickname : '匿名用户',
        userValue: this.data.userValue,
        selectedTeam: this.data.selectedTeam,
        content: content,
        createTime: this.formatTime(new Date()),
        likeCount: 0,
        isLiked: false,
        replies: [],
        showReply: false
      };

      const messageList = [newMessage, ...this.data.messageList];
      this.setData({
        messageList: messageList,
        newMessage: '',
        messageLength: 0,
        canPost: false
      });

      wx.hideLoading();
      wx.showToast({ title: '发布成功！', icon: 'success' });
    }, 1000);
  },

  // 设置排序方式
  setSortBy: function(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({ sortBy: type });
    this.sortMessages();
  },

  // 排序留言
  sortMessages: function() {
    const { messageList, sortBy } = this.data;
    let sortedList = [...messageList];
    
    if (sortBy === 'likes') {
      sortedList.sort((a, b) => b.likeCount - a.likeCount);
    } else {
      sortedList.sort((a, b) => new Date(b.createTime) - new Date(a.createTime));
    }
    
    this.setData({ messageList: sortedList });
  },

  // 切换点赞
  toggleLike: function(e) {
    const id = e.currentTarget.dataset.id;
    const messageList = this.data.messageList.map(item => {
      if (item.id === id) {
        return {
          ...item,
          isLiked: !item.isLiked,
          likeCount: item.isLiked ? item.likeCount - 1 : item.likeCount + 1
        };
      }
      return item;
    });
    
    this.setData({ messageList });
  },

  // 显示回复框
  showReply: function(e) {
    const id = e.currentTarget.dataset.id;
    const messageList = this.data.messageList.map(item => {
      if (item.id === id) {
        return { ...item, showReply: true, replyText: '' };
      }
      return item;
    });
    this.setData({ messageList });
  },

  // 隐藏回复框
  hideReply: function(e) {
    const id = e.currentTarget.dataset.id;
    const messageList = this.data.messageList.map(item => {
      if (item.id === id) {
        return { ...item, showReply: false, replyText: '' };
      }
      return item;
    });
    this.setData({ messageList });
  },

  // 输入回复内容
  onReplyInput: function(e) {
    const id = e.currentTarget.dataset.id;
    const content = e.detail.value;
    const messageList = this.data.messageList.map(item => {
      if (item.id === id) {
        return { ...item, replyText: content };
      }
      return item;
    });
    this.setData({ messageList });
  },

  // 提交回复
  submitReply: function(e) {
    const id = e.currentTarget.dataset.id;
    const messageList = this.data.messageList.map(item => {
      if (item.id === id) {
        const replyContent = item.replyText.trim();
        if (!replyContent) {
          wx.showToast({ title: '请输入回复内容', icon: 'none' });
          return item;
        }

        const newReply = {
          id: Date.now(),
          userId: Math.floor(Math.random() * 10000),
          content: replyContent,
          createTime: this.formatTime(new Date())
        };

        return {
          ...item,
          replies: [...item.replies, newReply],
          showReply: false,
          replyText: ''
        };
      }
      return item;
    });
    
    this.setData({ messageList });
    wx.showToast({ title: '回复成功！', icon: 'success' });
  },

  // 加载留言数据
  loadMessages: function() {
    this.setData({ isLoading: true });
    
    // 模拟从服务器加载数据
    setTimeout(() => {
      const mockMessages = [
        {
          id: 1,
          userId: 1234,
          content: '今天的比赛太精彩了！主队表现不错，期待下一场！',
          createTime: this.formatTime(new Date(Date.now() - 2 * 60 * 60 * 1000)),
          likeCount: 5,
          isLiked: false,
          replies: [
            {
              id: 11,
              userId: 5678,
              content: '同感！特别是那个进球太漂亮了',
              createTime: this.formatTime(new Date(Date.now() - 1 * 60 * 60 * 1000))
            }
          ],
          showReply: false
        },
        {
          id: 2,
          userId: 2345,
          content: '积分榜变化真大，竞争越来越激烈了',
          createTime: this.formatTime(new Date(Date.now() - 4 * 60 * 60 * 1000)),
          likeCount: 3,
          isLiked: true,
          replies: [],
          showReply: false
        },
        {
          id: 3,
          userId: 3456,
          content: '预测一下明天的比赛结果吧，我觉得主队会赢',
          createTime: this.formatTime(new Date(Date.now() - 6 * 60 * 60 * 1000)),
          likeCount: 8,
          isLiked: false,
          replies: [],
          showReply: false
        }
      ];
      
      this.setData({
        messageList: mockMessages,
        isLoading: false
      });
    }, 1000);
  },

  // 格式化时间
  formatTime: function(date) {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  },

  onShareAppMessage: function() {
    return {
      title: '球迷留言板 - 分享你的足球观点',
      path: '/pages/community/community',
      imageUrl: '/images/your-team-logo.png'
    };
  }
});
