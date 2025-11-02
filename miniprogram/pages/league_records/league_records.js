// pages/league_records/league_records.js
const app = getApp();

Page({
  data: {
    bgImageUrl: '',
    bugDescription: '',
    bugDescLength: 0,
    canSubmit: false,
    bugList: [],
    isLoading: false,
    // 用户信息
    userInfo: app.globalData.userInfo || null,
    hasUserInfo: !!app.globalData.userInfo,
    // 管理员状态
    isAdmin: false,
    // 防止重复加载的标志
    isBugsLoaded: false
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
    
    // 延迟加载bug数据，避免页面加载时立即报错
    // this.loadBugs();
    this.setData({ isBugsLoaded: false });

    // 添加调试日志
    console.log('bug提交页面加载 - 全局数据:', {
      openid: app.globalData.openid,
      userInfo: app.globalData.userInfo,
      bgImageUrl: app.globalData.bgImageUrl
    });
  },
  
  onShow: function() {
    console.log('📱 页面显示 (onShow)');
    
    // 每次显示页面时调用loadUserInfo，确保从本地存储加载最新的用户信息
    this.loadUserInfo();
    
    // 每次进入页面都重新加载bug数据
    console.log('📋 每次进入页面都重新加载bug数据');
    this.loadBugs();
  },

  // 加载用户信息
  loadUserInfo: function() {
    try {
      // 直接从本地存储获取最新的用户信息，确保用户解约球队后状态能正确更新
      let userInfo = wx.getStorageSync('userInfo');
      
      // 添加详细日志，记录加载的用户状态
      console.log('loadUserInfo - 从本地存储加载:', {
        userInfo: !!userInfo
      });
      
      // 只处理userInfo的全局同步，因为其他字段不在全局中存储
      if (app.globalData.userInfo && (!userInfo || JSON.stringify(app.globalData.userInfo) !== JSON.stringify(userInfo))) {
        userInfo = app.globalData.userInfo;
        wx.setStorageSync('userInfo', userInfo);
      }
      
      this.setData({
        userInfo: userInfo,
        hasUserInfo: !!userInfo
      });
      
      // 使用与admin.js相同的方式检查管理员权限
      this.checkAdminStatus();

      // 添加调试日志
      console.log('loadUserInfo - 设置后的页面数据:', {
        hasUserInfo: !!userInfo,
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
    
    console.log('🔍 检查管理员权限:', {
      adminOpenid,
      userOpenid,
      isAdmin: userOpenid === adminOpenid
    });
    
    if (userOpenid === adminOpenid) {
      this.setData({ isAdmin: true });
      console.log('✅ 用户是管理员');
    } else {
      this.setData({ isAdmin: false });
      console.log('❌ 用户不是管理员');
    }
  },

  // 输入bug描述
  onDescInput: function(e) {
    const desc = e.detail.value;
    const canSubmit = desc.trim().length > 0;
    console.log('输入描述变化:', { desc: desc.substring(0, 50) + '...', length: desc.length, canSubmit });
    
    this.setData({
      bugDescription: desc,
      bugDescLength: desc.length,
      canSubmit: canSubmit
    });
  },

  // 提交bug
  submitBug: function() {
    console.log('=== 提交bug按钮被点击 ===');
    console.log('按钮状态检查:', {
      canSubmit: this.data.canSubmit,
      bugDescription: this.data.bugDescription
    });

    // 立即显示一个提示，确认按钮被点击
    wx.showToast({ title: '按钮已点击，正在处理...', icon: 'none', duration: 1000 });

    const description = this.data.bugDescription.trim();
    
    if (!description) {
      console.log('❌ bug描述为空');
      wx.showToast({ title: '请输入bug描述', icon: 'none' });
      return;
    }

    if (description.length > 500) {
      console.log('❌ bug描述过长:', description.length);
      wx.showToast({ title: 'bug描述不能超过500字', icon: 'none' });
      return;
    }

    console.log('✅ 内容检查通过，开始提交bug...');
    wx.showLoading({ title: '提交中...' });

    try {
      const db = wx.cloud.database();
      
      const app = getApp();
      // 先测试 login 云函数是否工作
      wx.cloud.callFunction({
        name: 'login',
        success: (loginRes) => {
          console.log('Login test successful:', loginRes);
          
          // 提交bug到数据库
          db.collection('bugs').add({
            data: {
              description: description,
              userInfo: this.data.userInfo,
              status: 'open', // open, in-progress, resolved
              statusText: '待处理',
              createTime: new Date(),
              updateTime: new Date()
            }
          }).then(res => {
            console.log('✅ bug提交成功');
            // 格式化时间显示
            const bugWithFormattedTime = {
              id: res._id,
              description: description,
              status: 'open',
              statusText: '待处理',
              createTime: this.formatTime(new Date())
            };
            
            const bugList = [bugWithFormattedTime, ...this.data.bugList];
            
            this.setData({
              bugList: bugList,
              bugDescription: '',
              bugDescLength: 0,
              canSubmit: false
            });
            
            wx.hideLoading();
            wx.showToast({ title: 'bug提交成功！', icon: 'success' });
          }).catch(err => {
            console.error('提交bug失败:', err);
            wx.hideLoading();
            
            // 检查是否是集合不存在的错误
            if (err.errCode === -502005 || err.errMsg && err.errMsg.includes('collection not exists')) {
              wx.showModal({
                title: '数据库初始化',
                content: '检测到数据库集合不存在，请联系管理员在云开发控制台创建 "bugs" 集合，或等待系统自动初始化。',
                showCancel: false,
                confirmText: '知道了'
              });
            } else {
              wx.showToast({ title: '提交失败，请重试', icon: 'none' });
            }
          });
        },
        fail: (loginErr) => {
          console.error('Login test failed:', loginErr);
          wx.hideLoading();
          wx.showToast({ title: '系统初始化失败，请重启应用', icon: 'none' });
        }
      });
    } catch (e) {
      console.error('调用数据库失败:', e);
      wx.hideLoading();
      wx.showToast({ title: '系统错误，请重试', icon: 'none' });
    }
  },

  // 管理员更新bug状态
  updateBugStatus: function(e) {
    const { bugId, status } = e.currentTarget.dataset;

    if (!this.data.isAdmin) {
      wx.showToast({ title: '权限不足', icon: 'none' });
      return;
    }

    const statusText = status === 'resolved' ? '已解决' :
                      status === 'in-progress' ? '处理中' : '待处理';

    wx.showModal({
      title: '确认操作',
      content: `确定要将这个bug标记为"${statusText}"吗？`,
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '更新中...' });

          // 调用云函数更新bug状态
          wx.cloud.callFunction({
            name: 'updateBugStatus',
            data: {
              bugId: bugId,
              status: status,
              adminOpenid: getApp().globalData.openid
            },
            success: (res) => {
              wx.hideLoading();
              if (res.result && res.result.success) {
                wx.showToast({ title: '更新成功', icon: 'success' });
                // 重新加载bug列表
                this.loadBugs();
              } else {
                wx.showToast({ title: '更新失败', icon: 'none' });
              }
            },
            fail: (err) => {
              wx.hideLoading();
              console.error('更新bug状态失败:', err);
              wx.showToast({ title: '网络错误，请重试', icon: 'none' });
            }
          });
        }
      }
    });
  },

  // 管理员删除bug
  deleteBug: function(e) {
    const bugId = e.currentTarget.dataset.bugId;

    if (!this.data.isAdmin) {
      wx.showToast({ title: '权限不足', icon: 'none' });
      return;
    }

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个bug记录吗？此操作不可恢复！',
      confirmText: '删除',
      confirmColor: '#ff4444',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...' });

          // 调用云函数删除bug
          wx.cloud.callFunction({
            name: 'deleteBug',
            data: {
              bugId: bugId,
              adminOpenid: getApp().globalData.openid
            },
            success: (res) => {
              wx.hideLoading();
              if (res.result && res.result.success) {
                wx.showToast({ title: '删除成功', icon: 'success' });
                // 重新加载bug列表
                this.loadBugs();
              } else {
                wx.showToast({ title: '删除失败', icon: 'none' });
              }
            },
            fail: (err) => {
              wx.hideLoading();
              console.error('删除bug失败:', err);
              wx.showToast({ title: '网络错误，请重试', icon: 'none' });
            }
          });
        }
      }
    });
  },

  // 加载bug列表
  loadBugs: function() {
    // 防止重复加载
    if (this.data.isLoading) {
      console.log('⚠️ 正在加载中，跳过重复请求');
      return;
    }
    
    console.log('🚀 开始加载bug列表...');
    this.setData({ isLoading: true });
    wx.showLoading({ title: '加载中...' });
    
    try {
      const db = wx.cloud.database();
      const currentUserOpenid = getApp().globalData.openid;
      
      console.log('📊 当前用户信息:', {
        openid: currentUserOpenid,
        isAdmin: this.data.isAdmin
      });
      
      // 重要：不添加任何过滤条件，查询所有bug记录
      const query = db.collection('bugs')
        .orderBy('createTime', 'desc');
      
      console.log('🔍 执行查询:', query);
      
      query.get()
        .then(res => {
          console.log('📥 数据库返回结果:', {
            success: !!res.data,
            count: res.data ? res.data.length : 0,
            data: res.data
          });
          
          this.setData({ isLoading: false });
          wx.hideLoading();
          
          if (res.data) {
            // 格式化时间显示，并添加调试信息
            const formattedBugs = res.data.map(item => {
              const isOwnBug = item._openid === currentUserOpenid;
              console.log('🐛 处理bug记录:', {
                id: item._id,
                openid: item._openid,
                isOwnBug,
                status: item.status,
                description: item.description?.substring(0, 50) + '...'
              });
              
              return {
                ...item,
                id: item._id,
                createTime: this.formatTime(new Date(item.createTime)),
                statusText: item.status === 'resolved' ? '已解决' : 
                           item.status === 'in-progress' ? '处理中' : '待处理',
                isOwnBug // 标记是否是自己的bug
              };
            });
            
            console.log('✅ 格式化后的bug列表:', {
              total: formattedBugs.length,
              ownBugs: formattedBugs.filter(b => b.isOwnBug).length,
              otherBugs: formattedBugs.filter(b => !b.isOwnBug).length
            });
            
            this.setData({ bugList: formattedBugs });
            
            // 显示加载结果
            wx.showToast({
              title: `加载到${formattedBugs.length}条记录`,
              icon: 'none',
              duration: 2000
            });
          } else {
            console.error('❌ 获取bug列表失败: 没有数据');
            wx.showToast({ title: '加载bug列表失败，请稍后重试', icon: 'none', duration: 2000 });
            this.setData({ bugList: [] });
          }
        }).catch(err => {
          this.setData({ isLoading: false });
          wx.hideLoading();
          console.error('❌ 调用数据库失败:', err);
          
          // 检查是否是集合不存在的错误
          if (err.errCode === -502005 || err.errMsg && err.errMsg.includes('collection not exists')) {
            console.log('⚠️ bugs集合不存在，这是正常的，首次使用时需要创建');
            wx.showToast({ title: 'bug系统尚未初始化', icon: 'none', duration: 2000 });
            this.setData({ bugList: [] });
          } else {
            wx.showToast({ title: '网络连接失败，请检查网络后重试', icon: 'none', duration: 2000 });
            this.setData({ bugList: [] });
          }
        });
    } catch (e) {
      this.setData({ isLoading: false });
      wx.hideLoading();
      console.error('❌ 加载bug数据异常:', e);
      wx.showToast({ title: '系统错误，请重试', icon: 'none', duration: 2000 });
      this.setData({ bugList: [] });
    }
  },

  // 格式化时间
  formatTime: function(date) {
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  },

  onShareAppMessage: function() {
    return {
      title: 'bug提交',
      path: '/pages/league_records/league_records',
      imageUrl: '/images/your-team-logo.png'
    };
  }
});
