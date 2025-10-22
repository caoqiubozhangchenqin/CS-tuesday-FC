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
    selectedTeam: '',
    // 管理员状态
    isAdmin: false
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
      
      // 使用与admin.js相同的方式检查管理员权限
      this.checkAdminStatus();
    } catch (e) {
      console.error('加载用户信息失败', e);
    }
  },
  
  // 检查管理员状态（与admin.js保持一致的逻辑）
  checkAdminStatus: function() {
    const adminOpenid = 'oVAxOvrDAY9Q0qG8WBnRxO3_m1nw'; // 管理员OpenID
    const userOpenid = getApp().globalData.openid;
    
    if (userOpenid === adminOpenid) {
      this.setData({ isAdmin: true });
    } else {
      this.setData({ isAdmin: false });
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

    // 权限检查：只有管理员或有身价有球队的球员才能留言
    if (!this.data.isAdmin) {
      if (!this.data.hasUserInfo) {
        wx.showToast({ title: '请先完成身价评估', icon: 'none' });
        return;
      }
      if (!this.data.selectedTeam) {
        wx.showToast({ title: '请先选择球队才能留言', icon: 'none' });
        return;
      }
      if (this.data.userValue <= 0) {
        wx.showToast({ title: '请先完成身价评估才能留言', icon: 'none' });
        return;
      }
    }

    wx.showLoading({ title: '发布中...' });

    // 模拟发布留言
    setTimeout(() => {
      const app = getApp();
      const newMessage = {
        id: Date.now(),
        userId: this.data.userInfo ? this.data.userInfo.nickname : '匿名用户',
        userOpenid: app.globalData.openid || '', // 存储用户openid用于身份识别
        avatarUrl: this.data.userInfo ? this.data.userInfo.avatarUrl : '', // 存储用户头像
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
      
      // 限制只保留最新的500条留言
      const limitedMessageList = messageList.slice(0, 500);
      
      // 保存到本地存储，实现持久化
      try {
        wx.setStorageSync('communityMessages', limitedMessageList);
      } catch (e) {
        console.error('保存留言失败', e);
      }
      
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
    
    // 限制只保留最新的500条留言
      const limitedMessageList = messageList.slice(0, 500);
      
      // 保存到本地存储
      try {
        wx.setStorageSync('communityMessages', limitedMessageList);
      } catch (e) {
        console.error('保存点赞状态失败', e);
      }
    
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
    
    // 权限检查：只有管理员或有身价有球队的球员才能回复
    if (!this.data.isAdmin) {
      if (!this.data.hasUserInfo) {
        wx.showToast({ title: '请先完成身价评估', icon: 'none' });
        return;
      }
      if (!this.data.selectedTeam) {
        wx.showToast({ title: '请先选择球队才能回复', icon: 'none' });
        return;
      }
      if (this.data.userValue <= 0) {
        wx.showToast({ title: '请先完成身价评估才能回复', icon: 'none' });
        return;
      }
    }
    
    const messageList = this.data.messageList.map(item => {
      if (item.id === id) {
        const replyContent = item.replyText.trim();
        if (!replyContent) {
          wx.showToast({ title: '请输入回复内容', icon: 'none' });
          return item;
        }

        const app = getApp();
        const newReply = {
          id: Date.now(),
          userId: this.data.userInfo ? this.data.userInfo.nickname : '匿名用户',
          userOpenid: app.globalData.openid || '', // 存储用户openid用于身份识别
          avatarUrl: this.data.userInfo ? this.data.userInfo.avatarUrl : '', // 存储用户头像
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
    
    // 限制只保留最新的500条留言
      // 限制只保留最新的500条留言
        const limitedMessageList = messageList.slice(0, 500);
        
        // 保存到本地存储，实现持久化
        try {
          wx.setStorageSync('communityMessages', limitedMessageList);
        } catch (e) {
          console.error('保存删除状态失败', e);
        }
    
    this.setData({ messageList });
    wx.showToast({ title: '回复成功！', icon: 'success' });
  },

  // 加载留言数据
  loadMessages: function() {
    this.setData({ isLoading: true });
    
    // 模拟从服务器加载数据
    setTimeout(() => {
      let messageList = [];
      const currentUserInfo = this.data.userInfo;
      
      // 尝试从本地存储读取留言数据
      try {
        const storedMessages = wx.getStorageSync('communityMessages');
        if (storedMessages && storedMessages.length > 0) {
          const app = getApp();
          const userOpenid = app.globalData.openid;
          
          // 更新当前用户的历史留言名字
          messageList = storedMessages.map(message => {
            // 优先通过openid识别用户，这样更准确
            if (currentUserInfo && userOpenid && message.userOpenid === userOpenid) {
              return { ...message, userId: currentUserInfo.nickname };
            }
            // 兼容旧数据，通过昵称匹配
            else if (currentUserInfo && message.userId && 
                     typeof message.userId === 'string' && 
                     message.userId !== '匿名用户' && 
                     !message.userOpenid) {
              // 尝试通过其他方式识别（如用户价值、团队信息等）
              const isCurrentUser = message.userValue === this.data.userValue && 
                                  message.selectedTeam === this.data.selectedTeam;
              if (isCurrentUser) {
                return { ...message, userId: currentUserInfo.nickname, userOpenid: userOpenid };
              }
            }
            return message;
          });
          
          // 同时更新回复中的用户名字
          messageList = messageList.map(message => {
            if (message.replies && message.replies.length > 0) {
              return {
                ...message,
                replies: message.replies.map(reply => {
                  // 为回复添加openid标识，便于未来更新
                  if (currentUserInfo && userOpenid && reply.userId && 
                      reply.userId !== '匿名用户' && 
                      reply.userId === currentUserInfo.nickname) {
                    return { ...reply, userId: currentUserInfo.nickname, userOpenid: userOpenid };
                  }
                  return reply;
                })
              };
            }
            return message;
          });
          
          // 保存更新后的留言列表
          wx.setStorageSync('communityMessages', messageList);
          
          this.setData({
            messageList: messageList,
            isLoading: false
          });
        } else {
          // 如果没有存储的留言，使用模拟数据
          const mockMessages = [
            {
              id: 1,
              userId: '测试用户1',
              userValue: 500,
              selectedTeam: '测试队A',
              content: '今天的比赛太精彩了！主队表现不错，期待下一场！',
              createTime: this.formatTime(new Date(Date.now() - 2 * 60 * 60 * 1000)),
              likeCount: 5,
              isLiked: false,
              replies: [
                {
                  id: 11,
                  userId: '测试用户2',
                  content: '同感！特别是那个进球太漂亮了',
                  createTime: this.formatTime(new Date(Date.now() - 1 * 60 * 60 * 1000))
                }
              ],
              showReply: false
            },
            {
              id: 2,
              userId: '测试用户3',
              userValue: 800,
              selectedTeam: '测试队B',
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
        }
      } catch (e) {
        console.error('加载留言失败', e);
        this.setData({ isLoading: false });
      }
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

  // 删除留言
  deleteMessage: function(e) {
    const id = e.currentTarget.dataset.id;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条留言吗？',
      success: (res) => {
        if (res.confirm) {
          // 过滤掉要删除的留言
          const messageList = this.data.messageList.filter(item => item.id !== id);
          
          // 保存到本地存储
          try {
            wx.setStorageSync('communityMessages', messageList);
          } catch (e) {
            console.error('删除留言失败', e);
          }
          
          this.setData({ messageList });
          wx.showToast({ title: '删除成功！', icon: 'success' });
        }
      }
    });
  },

  onShareAppMessage: function() {
    return {
      title: '球迷留言板 - 分享你的足球观点',
      path: '/pages/community/community',
      imageUrl: '/images/your-team-logo.png'
    };
  }
});
