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
    userInfo: app.globalData.userInfo || null,
    hasUserInfo: !!app.globalData.userInfo,
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
    
    // 获取用户信息 - 优先从全局获取
    if (app.globalData.userInfo) {
      this.setData({
        userInfo: app.globalData.userInfo,
        hasUserInfo: true
      });
    } else {
      this.loadUserInfo();
    }
    
    // 加载留言数据
    this.loadMessages();
  },
  
  onShow: function() {
    // 每次显示页面时刷新留言
    this.loadMessages();
    
    // 每次显示页面时调用loadUserInfo，确保从本地存储加载最新的用户信息
    this.loadUserInfo();
  },

  // 加载用户信息
  loadUserInfo: function() {
    try {
      // 直接从本地存储获取最新的用户信息，确保用户解约球队后状态能正确更新
      let userInfo = wx.getStorageSync('userInfo');
      let userValue = wx.getStorageSync('userValue') || 0;
      let selectedTeam = wx.getStorageSync('selectedTeam') || '';
      
      // 添加详细日志，记录加载的用户状态
      console.log('loadUserInfo - 从本地存储加载:', {
        userInfo: !!userInfo,
        userValue: userValue,
        selectedTeam: selectedTeam,
        selectedTeamType: typeof selectedTeam,
        selectedTeamEmpty: !selectedTeam || selectedTeam === '' || selectedTeam.trim() === ''
      });
      
      // 确保selectedTeam是字符串类型，并且空值处理一致
      if (typeof selectedTeam !== 'string') {
        selectedTeam = '';
        wx.setStorageSync('selectedTeam', selectedTeam);
        console.log('loadUserInfo - selectedTeam类型不正确，已重置为空字符串');
      }
      
      // 只处理userInfo的全局同步，因为其他字段不在全局中存储
      if (app.globalData.userInfo && (!userInfo || JSON.stringify(app.globalData.userInfo) !== JSON.stringify(userInfo))) {
        userInfo = app.globalData.userInfo;
        wx.setStorageSync('userInfo', userInfo);
      }
      
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
      // 添加日志调试
      console.log('权限检查 - 用户信息:', {hasUserInfo: this.data.hasUserInfo, userInfo: this.data.userInfo});
      console.log('权限检查 - 球队信息:', {selectedTeam: this.data.selectedTeam, type: typeof this.data.selectedTeam});
      console.log('权限检查 - 身价信息:', {userValue: this.data.userValue});
      
      // 由于onShow已经调用了loadUserInfo，这里直接检查本地数据
      if (!this.data.hasUserInfo || this.data.userInfo === null) {
        wx.showToast({ title: '请先完成身价评估', icon: 'none' });
        return;
      }
      // 最终版权限检查：严格验证球队状态
      const teamValue = this.data.selectedTeam;
      const hasValidTeam = teamValue && 
                          typeof teamValue === 'string' && 
                          teamValue.trim() !== '' && 
                          teamValue !== null && 
                          teamValue !== undefined;
      
      console.log('权限检查 - 球队有效性:', {teamValue, hasValidTeam});
      
      if (!hasValidTeam) {
        wx.showToast({ title: '请先选择球队才能留言', icon: 'none' });
        return;
      }
      if (this.data.userValue <= 0) {
        wx.showToast({ title: '请先完成身价评估才能留言', icon: 'none' });
        return;
      }
    }

    wx.showLoading({ title: '发布中...' });

    try {
      const app = getApp();
      // 调用云函数提交留言
      wx.cloud.callFunction({
        name: 'communityMessages',
        data: {
          action: 'submitMessage',
          data: {
            content: content,
            userInfo: this.data.userInfo,
            userValue: this.data.userValue,
            selectedTeam: this.data.selectedTeam
          }
        }
      }).then(res => {
        const result = res.result;
        if (result.success) {
          // 格式化时间显示
          const messageWithFormattedTime = {
            ...result.data,
            createTime: this.formatTime(new Date(result.data.createTime))
          };
          
          const messageList = [messageWithFormattedTime, ...this.data.messageList];
          
          this.setData({
            messageList: messageList,
            newMessage: '',
            messageLength: 0,
            canPost: false
          });
          
          wx.hideLoading();
          wx.showToast({ title: '发布成功！', icon: 'success' });
        } else {
          wx.hideLoading();
          wx.showToast({ title: result.message || '发布失败', icon: 'none' });
        }
      }).catch(err => {
        console.error('提交留言失败:', err);
        wx.hideLoading();
        wx.showToast({ title: '网络错误，请重试', icon: 'none' });
      });
    } catch (e) {
      console.error('调用云函数失败:', e);
      wx.hideLoading();
      wx.showToast({ title: '系统错误，请重试', icon: 'none' });
    }
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
    
    try {
      wx.cloud.callFunction({
        name: 'communityMessages',
        data: {
          action: 'toggleLike',
          data: {
            messageId: id
          }
        }
      }).then(res => {
        const result = res.result;
        if (result.success) {
          const messageList = this.data.messageList.map(item => {
            if (item.id === id) {
              return {
                ...item,
                isLiked: result.data.isLiked,
                likeCount: result.data.likeCount
              };
            }
            return item;
          });
          
          this.setData({ messageList });
        } else {
          wx.showToast({ title: result.message || '操作失败', icon: 'none' });
        }
      }).catch(err => {
        console.error('切换点赞状态失败:', err);
        wx.showToast({ title: '网络错误，请重试', icon: 'none' });
      });
    } catch (e) {
      console.error('调用云函数失败:', e);
      wx.showToast({ title: '系统错误，请重试', icon: 'none' });
    }
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
    
    // 查找对应的留言
    const message = this.data.messageList.find(item => item.id === id);
    if (!message || !message.replyText) {
      wx.showToast({ title: '请输入回复内容', icon: 'none' });
      return;
    }
    
    const replyContent = message.replyText.trim();
    if (!replyContent) {
      wx.showToast({ title: '请输入回复内容', icon: 'none' });
      return;
    }
    
    // 权限检查：只有管理员或有身价有球队的球员才能回复
    if (!this.data.isAdmin) {
      // 添加日志调试
      console.log('回复权限检查 - 用户信息:', {hasUserInfo: this.data.hasUserInfo, userInfo: this.data.userInfo});
      console.log('回复权限检查 - 球队信息:', {selectedTeam: this.data.selectedTeam, type: typeof this.data.selectedTeam});
      console.log('回复权限检查 - 身价信息:', {userValue: this.data.userValue});
      
      // 由于onShow已经调用了loadUserInfo，这里直接检查本地数据
      if (!this.data.hasUserInfo || this.data.userInfo === null) {
        wx.showToast({ title: '请先完成身价评估', icon: 'none' });
        return;
      }
      // 最终版权限检查：严格验证球队状态
      const teamValue = this.data.selectedTeam;
      const hasValidTeam = teamValue && 
                          typeof teamValue === 'string' && 
                          teamValue.trim() !== '' && 
                          teamValue !== null && 
                          teamValue !== undefined;
      
      console.log('回复权限检查 - 球队有效性:', {teamValue, hasValidTeam});
      
      if (!hasValidTeam) {
        wx.showToast({ title: '请先选择球队才能回复', icon: 'none' });
        return;
      }
      if (this.data.userValue <= 0) {
        wx.showToast({ title: '请先完成身价评估才能回复', icon: 'none' });
        return;
      }
    }
    
    wx.showLoading({ title: '回复中...' });
    
    try {
      wx.cloud.callFunction({
        name: 'communityMessages',
        data: {
          action: 'submitReply',
          data: {
            messageId: id,
            content: replyContent,
            userInfo: this.data.userInfo
          }
        }
      }).then(res => {
        const result = res.result;
        if (result.success) {
          // 格式化时间显示
          const replyWithFormattedTime = {
            ...result.data,
            userId: result.data.userInfo.nickname,
            avatarUrl: result.data.userInfo.avatarUrl,
            createTime: this.formatTime(new Date(result.data.createTime))
          };
          
          const messageList = this.data.messageList.map(item => {
            if (item.id === id) {
              return {
                ...item,
                replies: [...item.replies, replyWithFormattedTime],
                showReply: false,
                replyText: ''
              };
            }
            return item;
          });
          
          this.setData({ messageList });
          wx.hideLoading();
          wx.showToast({ title: '回复成功！', icon: 'success' });
        } else {
          wx.hideLoading();
          wx.showToast({ title: result.message || '回复失败', icon: 'none' });
        }
      }).catch(err => {
        console.error('提交回复失败:', err);
        wx.hideLoading();
        wx.showToast({ title: '网络错误，请重试', icon: 'none' });
      });
    } catch (e) {
      console.error('调用云函数失败:', e);
      wx.hideLoading();
      wx.showToast({ title: '系统错误，请重试', icon: 'none' });
    }
  },

  // 加载留言
  loadMessages: function() {
    wx.showLoading({ title: '加载中...' });
    
    try {
      wx.cloud.callFunction({
        name: 'communityMessages',
        data: {
          action: 'getMessages'
        }
      }).then(res => {
        const result = res.result;
        wx.hideLoading();
        
        if (result.success) {
          // 格式化时间并准备留言列表
          const formattedMessages = result.data.map(item => ({
            ...item,
            userId: item.userInfo.nickname,
            avatarUrl: item.userInfo.avatarUrl,
            createTime: this.formatTime(new Date(item.createTime)),
            isLiked: item.likedUsers ? item.likedUsers.includes(getApp().globalData.openid || '') : false,
            showReply: false,
            replyText: '',
            replies: item.replies.map(reply => ({
              ...reply,
              userId: reply.userInfo.nickname,
              avatarUrl: reply.userInfo.avatarUrl,
              createTime: this.formatTime(new Date(reply.createTime))
            }))
          }));
          
          this.setData({ messageList: formattedMessages });
        } else {
          console.error('获取留言失败:', result.message);
          // 出错时使用空数组
          this.setData({ messageList: [] });
        }
      }).catch(err => {
        console.error('调用云函数失败:', err);
        wx.hideLoading();
        // 出错时使用空数组
        this.setData({ messageList: [] });
      });
    } catch (e) {
      console.error('加载留言数据异常:', e);
      wx.hideLoading();
      this.setData({ messageList: [] });
    }
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
    
    // 权限检查：只有管理员或留言作者可以删除
    const message = this.data.messageList.find(item => item.id === id);
    if (!message) {
      wx.showToast({ title: '留言不存在', icon: 'none' });
      return;
    }
    
    const app = getApp();
    const isAuthor = app.globalData.openid && message.userOpenid === app.globalData.openid;
    
    if (!this.data.isAdmin && !isAuthor) {
      wx.showToast({ title: '没有权限删除此留言', icon: 'none' });
      return;
    }
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条留言吗？',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...' });
          
          try {
            wx.cloud.callFunction({
              name: 'communityMessages',
              data: {
                action: 'deleteMessage',
                data: {
                  messageId: id
                }
              }
            }).then(res => {
              wx.hideLoading();
              const result = res.result;
              
              if (result.success) {
                // 从页面数据中移除该留言
                const updatedMessages = this.data.messageList.filter(item => item.id !== id);
                this.setData({ messageList: updatedMessages });
                wx.showToast({ title: '删除成功', icon: 'success' });
              } else {
                wx.showToast({ title: result.message || '删除失败', icon: 'none' });
              }
            }).catch(err => {
              console.error('删除留言失败:', err);
              wx.hideLoading();
              wx.showToast({ title: '网络错误，请重试', icon: 'none' });
            });
          } catch (e) {
            console.error('调用云函数失败:', e);
            wx.hideLoading();
            wx.showToast({ title: '系统错误，请重试', icon: 'none' });
          }
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
