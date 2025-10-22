// pages/index/index.js
const app = getApp(); // 获取app实例

Page({
  data: {
    userInfo: null,
    hasUserInfo: false,
    avatarUrl: '/images/avatar.png',
    nickname: '',
    isMusicPlaying: false,
    // 控制登录弹窗的显示/隐藏
    showLoginPopup: false,
    // 防抖/节流, 防止重复点击选择头像按钮
    isChoosingAvatar: false,
    bgImageUrl: '',
    // 用户状态管理
    hasCompletedSurvey: false, // 是否已完成评估
    userValue: 0, // 用户身价
    selectedTeam: '', // 选择的球队
    showSurveyButton: true // 是否显示开始评估按钮
  },

  onLoad: function () {
    // 优先用本地缓存渲染
    try {
      const cached = wx.getStorageSync('userInfo');
      if (cached && !wx.getStorageSync('isLoggedOut')) {
        this.setData({ userInfo: cached, hasUserInfo: true });
        app.globalData.userInfo = cached;
      }
    } catch (e) {}

    // 检查用户状态
    this.checkUserStatus();

    // 再发起云端校验
    this.fetchUserInfo();

    // 初始化音乐监听器
    this.musicStatusListener = (isPlaying) => {
      if (this.data.isMusicPlaying !== isPlaying) {
        this.setData({ isMusicPlaying: isPlaying });
      }
    };

    // 背景图：优先使用全局已有的链接，否则注册监听
    const app = getApp();
    if (app.globalData && app.globalData.bgImageUrl) {
      this.setData({ bgImageUrl: app.globalData.bgImageUrl });
    } else if (app && typeof app.addBgListener === 'function') {
      this._removeBgListener = app.addBgListener(url => { this.setData({ bgImageUrl: url }); });
    }
  },

  onShow: function () {
    this.fetchUserInfo();
    this.checkUserStatus(); // 每次显示页面时检查用户状态
    this.setData({ isMusicPlaying: app.globalData.isMusicPlaying });
    this.removeMusicListener();
    app.globalData.musicStatusListeners.unshift(this.musicStatusListener);
  },

  // 检查用户状态
  checkUserStatus: function() {
    try {
      const hasCompletedSurvey = wx.getStorageSync('hasCompletedSurvey');
      const userValue = wx.getStorageSync('userValue') || 0;
      const selectedTeam = wx.getStorageSync('selectedTeam') || '';
      
      this.setData({
        hasCompletedSurvey: hasCompletedSurvey,
        userValue: userValue,
        selectedTeam: selectedTeam,
        showSurveyButton: !hasCompletedSurvey
      });
    } catch (e) {
      console.error('检查用户状态失败', e);
    }
  },
  

  
  // --- 登录与弹窗相关函数 ---

  // 统一调用此函数来显示登录弹窗
  handleLogin: function() {
    this.setData({ showLoginPopup: true });
  },

  // 关闭登录弹窗的函数
  closeLoginPopup: function() {
    this.setData({ showLoginPopup: false });
  },

  // (防抖) 点击头像区域时，立即"加锁"，禁用按钮
  onAvatarWrapperTap: function() {
    this.setData({ isChoosingAvatar: true });
  },

  // (防抖) 选择头像的回调函数，在这里"解锁"
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail;
    if (avatarUrl) {
      this.setData({
        avatarUrl: avatarUrl,
      });
    }
    // 无论成功或失败，都在短暂延迟后解锁按钮
    setTimeout(() => {
      this.setData({ isChoosingAvatar: false });
    }, 500);
  },

  onNicknameInput(e) { this.setData({ nickname: e.detail.value }); },

  // (弹窗内) 保存新用户信息的函数
  async saveNickname() {
    const nickname = (this.data.nickname || '').trim();
    if (!nickname) {
      wx.showToast({ title: '昵称不能为空', icon: 'none' });
      return;
    }
    if (!this.data.avatarUrl || this.data.avatarUrl.startsWith('/images/')) {
      wx.showToast({ title: '请选择您的头像', icon: 'none' });
      return;
    }
    wx.showLoading({ title: '正在保存...' });
    try {
      const cloudPath = `user-avatars/${Date.now()}-${Math.floor(Math.random()*1e6)}.png`;
      const uploadRes = await wx.cloud.uploadFile({ cloudPath, filePath: this.data.avatarUrl });
      const fileID = uploadRes.fileID;
      const res = await wx.cloud.callFunction({ name: 'saveUserInfo', data: { nickname, avatarFileID: fileID }});
      
      if (res.result && res.result.success) {
        wx.showToast({ title: '保存成功！' });
        this.setData({
          userInfo: res.result.data,
          hasUserInfo: true,
          showLoginPopup: false // 登录成功，关闭弹窗
        });
        app.globalData.userInfo = res.result.data;
        wx.setStorageSync('userInfo', res.result.data);
        wx.removeStorageSync('isLoggedOut');
      } else {
        wx.showToast({ title: (res.result && res.result.message) || '保存失败', icon: 'none' });
      }
    } catch (err) {
      console.error('保存用户信息失败', err);
      wx.showToast({ title: '保存失败，请重试', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  // --- 页面跳转函数 ---

  // 需要登录才能访问的函数，增加权限判断
  goToSurvey() {
    if (!this.data.hasUserInfo) {
      this.handleLogin(); // 未登录，弹窗
      return;
    }
    wx.navigateTo({ url: '../survey/survey' });
  },

  goToAdminPage() {
    if (!this.data.hasUserInfo) {
      this.handleLogin(); // 未登录，弹窗
      return;
    }
    wx.navigateTo({ url: '../admin/admin' });
  },

  // 跳转到球队报名页面
  goToTeamSignup: function() {
    if (!this.data.hasCompletedSurvey) {
      wx.showToast({ title: '请先完成身价评估', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: '../team_signup/team_signup' });
  },

  // 无需登录即可访问的函数
  goToRanking() { wx.navigateTo({ url: '../ranking/ranking' }); },
  goToTeamStatusPage() { wx.navigateTo({ url: '../team_status/team_status' }); },
  goToSchedulePage: function() { wx.navigateTo({ url: '/pages/schedule/schedule' }); },
  goToStandingsPage: function() { wx.navigateTo({ url: '/pages/standings/standings' }); },
  goToCommunityPage: function() { wx.navigateTo({ url: '/pages/community/community' }); },

  // --- 其他辅助函数 ---
  
  logout() {
    wx.showModal({
      title: '确认退出',
      content: '您确定要退出登录吗？',
      success: (res) => {
        if (!res.confirm) return;
        try {
          wx.setStorageSync('isLoggedOut', true);
          wx.removeStorageSync('userInfo');
        } catch (e) {}
        app.globalData.userInfo = null;
        this.setData({
          userInfo: null,
          hasUserInfo: false,
          nickname: '',
          avatarUrl: '/images/avatar.png'
        });
        wx.showToast({ title: '已退出登录', icon: 'none' });
      }
    });
  },

  fetchUserInfo: function() {
    wx.cloud.callFunction({
      name: 'getUserInfo',
      success: res => {
        if (res.result && res.result.success) {
          this.setData({ userInfo: res.result.data, hasUserInfo: true });
          app.globalData.userInfo = res.result.data;
          try { wx.setStorageSync('userInfo', res.result.data); } catch (e) {}
        }
      }
    });
  },
  
  toggleMusic: function() {
    const isCurrentlyPlaying = app.globalData.isMusicPlaying;
    if (isCurrentlyPlaying) { app.pauseMusic(); } else { app.playMusic(); }
    this.setData({ isMusicPlaying: !isCurrentlyPlaying });
  },

  onHide: function() {
    this.removeMusicListener();
    if (this._removeBgListener) this._removeBgListener();
  },
  onUnload: function() {
    this.removeMusicListener();
    if (this._removeBgListener) this._removeBgListener();
  },
  removeMusicListener: function() {
    app.globalData.musicStatusListeners = app.globalData.musicStatusListeners.filter(
      listener => listener !== this.musicStatusListener
    );
  },
  onShareAppMessage: function () {
    return {
      title: '常熟FC联赛小程序！',
      path: '/pages/index/index',
      imageUrl: '/images/your-team-logo.png' 
    };
  }
});