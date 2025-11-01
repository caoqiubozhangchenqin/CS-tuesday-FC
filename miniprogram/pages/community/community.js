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
    isAdmin: false,
    // 防止重复加载的标志
    isMessagesLoaded: false
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
    this.setData({ isMessagesLoaded: true });

    // 添加调试日志
    console.log('留言板页面加载 - 全局数据:', {
      openid: app.globalData.openid,
      userInfo: app.globalData.userInfo,
      bgImageUrl: app.globalData.bgImageUrl
    });
  },
  
  onShow: function() {
    // 每次显示页面时调用loadUserInfo，确保从本地存储加载最新的用户信息
    this.loadUserInfo();
    
    // 如果还没有加载过留言数据，则加载一次
    if (!this.data.isMessagesLoaded) {
      this.loadMessages();
      this.setData({ isMessagesLoaded: true });
    }
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

      // 添加调试日志
      console.log('loadUserInfo - 设置后的页面数据:', {
        hasUserInfo: !!userInfo,
        userValue: userValue,
        selectedTeam: selectedTeam,
        isAdmin: this.data.isAdmin
      });
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
    const canPost = content.trim().length > 0;
    console.log('输入内容变化:', { content: content.substring(0, 50) + '...', length: content.length, canPost });
    
    this.setData({
      newMessage: content,
      messageLength: content.length,
      canPost: canPost
    });
  },

  // 提交留言
  submitMessage: function() {
    console.log('=== 发布按钮被点击 ===');
    console.log('按钮状态检查:', {
      canPost: this.data.canPost,
      newMessage: this.data.newMessage,
      newMessageLength: this.data.newMessage ? this.data.newMessage.length : 0,
      newMessageTrimmed: this.data.newMessage ? this.data.newMessage.trim() : ''
    });

    // 立即显示一个提示，确认按钮被点击
    wx.showToast({ title: '按钮已点击，正在处理...', icon: 'none', duration: 1000 });

    const content = this.data.newMessage.trim();
    if (!content) {
      console.log('❌ 留言内容为空');
      wx.showToast({ title: '请输入留言内容', icon: 'none' });
      return;
    }

    if (content.length > 200) {
      console.log('❌ 留言内容过长:', content.length);
      wx.showToast({ title: '留言不能超过200字', icon: 'none' });
      return;
    }

    console.log('✅ 内容检查通过，开始提交留言...');
    wx.showLoading({ title: '发布中...' });

    try {
      // 获取球队名称映射
      const db = wx.cloud.database();
      const selectedTeamId = this.data.selectedTeam;
      
      const getTeamName = () => {
        return new Promise((resolve) => {
          if (!selectedTeamId) {
            resolve('');
            return;
          }
          
          db.collection('teams').doc(selectedTeamId).get({
            success: (res) => {
              resolve(res.data ? res.data.name : selectedTeamId);
            },
            fail: (err) => {
              console.error('获取球队名称失败:', err);
              resolve(selectedTeamId); // 如果获取失败，使用ID作为后备
            }
          });
        });
      };

      const app = getApp();
      // 先测试 login 云函数是否工作
      wx.cloud.callFunction({
        name: 'login',
        success: (loginRes) => {
          console.log('Login test successful:', loginRes);
          
          // 获取球队名称后提交留言
          getTeamName().then(selectedTeamName => {
            wx.cloud.callFunction({
              name: 'communityMessages',
              data: {
                action: 'submitMessage',
                data: {
                  content: content,
                  userInfo: this.data.userInfo,
                  userValue: this.data.userValue,
                  selectedTeam: selectedTeamName
                }
              }
            }).then(res => {
              const result = res.result;
              if (result.success) {
                console.log('✅ 留言提交成功');
                // 格式化时间显示
                const messageWithFormattedTime = {
                  ...result.data,
                  userId: result.data.userInfo.nickname, // 添加用户名
                  createTime: this.formatTime(new Date(result.data.createTime)),
                  isLiked: false,
                  showReply: false,
                  replyText: ''
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
                console.log('❌ 留言提交失败:', result.message);
                wx.hideLoading();
                console.error('发布失败:', result.message);
                wx.showToast({ title: result.message || '发布失败', icon: 'none' });
              }
            }).catch(err => {
              console.error('提交留言失败:', err);
              wx.hideLoading();
              // 显示更详细的错误信息
              let errorMsg = '网络错误，请重试';
              if (err.errMsg) {
                errorMsg = err.errMsg;
              } else if (err.message) {
                errorMsg = err.message;
              }
              wx.showToast({ title: errorMsg, icon: 'none', duration: 3000 });
              wx.showModal({
                title: '错误详情',
                content: JSON.stringify(err, null, 2),
                showCancel: false
              });
            });
          }).catch(teamNameErr => {
            console.error('获取球队名称失败:', teamNameErr);
            wx.hideLoading();
            wx.showToast({ title: '获取球队信息失败，请重试', icon: 'none' });
          });
        },
        fail: (loginErr) => {
          console.error('Login test failed:', loginErr);
          wx.hideLoading();
          wx.showToast({ title: '系统初始化失败，请重启应用', icon: 'none' });
        }
      });
    } catch (e) {
      console.error('调用云函数失败:', e);
      wx.hideLoading();
      wx.showToast({ title: '系统错误，请重试', icon: 'none' });
    }
  },

  // 刷新留言
  refreshMessages: function() {
    // 强制刷新，忽略加载状态检查
    this.setData({ isLoading: true });
    wx.showLoading({ title: '刷新中...' });
    this.loadMessages();
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

  // 设置排序类型
  setSortBy: function(e) {
    const sortType = e.currentTarget.dataset.type;
    console.log('设置排序类型:', sortType);
    
    // 更新排序类型
    this.setData({ sortBy: sortType });
    
    // 重新加载留言数据
    this.loadMessages();
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
    // 防止重复加载
    if (this.data.isLoading) {
      return;
    }
    
    this.setData({ isLoading: true });
    wx.showLoading({ title: '加载中...' });
    
    try {
      wx.cloud.callFunction({
        name: 'communityMessages',
        data: {
          action: 'getMessages',
          data: {
            sortBy: this.data.sortBy || 'time'
          }
        }
      }).then(res => {
        this.setData({ isLoading: false });
        wx.hideLoading(); // 确保只调用一次
        const result = res.result;
        
        if (result.success) {
          // 获取所有球队数据，用于将球队ID转换为球队名称
          const db = wx.cloud.database();
          db.collection('teams').get({
            success: (teamsRes) => {
              const teamsMap = {};
              if (teamsRes.data) {
                teamsRes.data.forEach(team => {
                  teamsMap[team._id] = team.name;
                });
              }
              
              // 格式化时间并准备留言列表
              const formattedMessages = result.data.map(item => ({
                ...item,
                id: item._id, // 添加id字段，兼容前端使用
                userId: item.userInfo.nickname,
                createTime: this.formatTime(new Date(item.createTime)),
                isLiked: item.likedUsers ? item.likedUsers.includes(getApp().globalData.openid || '') : false,
                showReply: false,
                replyText: '',
                // 将球队ID转换为球队名称，如果没有球队则显示"自由球员"
                selectedTeam: item.selectedTeam ? (teamsMap[item.selectedTeam] || item.selectedTeam) : '自由球员',
                replies: item.replies.map(reply => ({
                  ...reply,
                  userId: reply.userInfo.nickname,
                  createTime: this.formatTime(new Date(reply.createTime))
                }))
              }));
              
              this.setData({ messageList: formattedMessages });
            },
            fail: () => {
              // 如果获取球队数据失败，直接使用原始数据
              const formattedMessages = result.data.map(item => ({
                ...item,
                id: item._id, // 添加id字段，兼容前端使用
                userId: item.userInfo.nickname,
                createTime: this.formatTime(new Date(item.createTime)),
                isLiked: item.likedUsers ? item.likedUsers.includes(getApp().globalData.openid || '') : false,
                showReply: false,
                replyText: '',
                // 如果没有球队则显示"自由球员"
                selectedTeam: item.selectedTeam || '自由球员',
                replies: item.replies.map(reply => ({
                  ...reply,
                  userId: reply.userInfo.nickname,
                  createTime: this.formatTime(new Date(reply.createTime))
                }))
              }));
              
              this.setData({ messageList: formattedMessages });
            }
          });
        } else {
          console.error('获取留言失败:', result.message);
          // 显示错误提示，但不设置空数组，让用户知道出错了
          wx.showToast({ title: '加载留言失败，请稍后重试', icon: 'none', duration: 2000 });
          this.setData({ messageList: [] });
        }
      }).catch(err => {
        this.setData({ isLoading: false });
        wx.hideLoading(); // 确保只调用一次
        console.error('调用云函数失败:', err);
        // 显示网络错误提示
        wx.showToast({ title: '网络连接失败，请检查网络后重试', icon: 'none', duration: 2000 });
        this.setData({ messageList: [] });
      });
    } catch (e) {
      this.setData({ isLoading: false });
      wx.hideLoading(); // 确保只调用一次
      console.error('加载留言数据异常:', e);
      wx.showToast({ title: '系统错误，请重试', icon: 'none', duration: 2000 });
      this.setData({ messageList: [] });
    }
  },

  // 格式化时间
  formatTime: function(date) {
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
    const isAuthor = app.globalData.openid && message.openid === app.globalData.openid;
    
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
      title: '联赛记录 - 分享你的足球观点',
      path: '/pages/league_records/league_records',
      imageUrl: '/images/your-team-logo.png'
    };
  }
});
