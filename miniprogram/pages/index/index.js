// pages/index/index.js
Page({
  data: {
    userInfo: null,
    hasUserInfo: false,
    avatarUrl: '/images/avatar.png',
    nickname: '',
    isMusicPlaying: false,
    showLoginPopup: false,
    isChoosingAvatar: false,
    bgImageUrl: '',
    hasCompletedSurvey: false,
    userValue: 0,
    selectedTeam: '',
    showSurveyButton: true,
    selectedTeamName: ''
  },
  onLoad: function () {
    const app = getApp();
    try {
      const cached = wx.getStorageSync('userInfo');
      if (cached && !wx.getStorageSync('isLoggedOut')) {
        this.setData({ userInfo: cached, hasUserInfo: true });
        app.globalData.userInfo = cached;
      }
    } catch (e) {}
    this.checkUserStatus();
    this.fetchUserInfo();
    this.musicStatusListener = (isPlaying) => {
      if (this.data.isMusicPlaying !== isPlaying) {
        this.setData({ isMusicPlaying: isPlaying });
      }
    };
    if (app.globalData && app.globalData.bgImageUrl) {
      this.setData({ bgImageUrl: app.globalData.bgImageUrl });
    } else if (app && typeof app.addBgListener === 'function') {
      this._removeBgListener = app.addBgListener(url => { this.setData({ bgImageUrl: url }); });
    }
  },
  onShow: function () {
    const app = getApp();
    this.fetchUserInfo();
    this.checkUserStatus();
    this.setData({ isMusicPlaying: app.globalData.isMusicPlaying });
    this.removeMusicListener();
    app.globalData.musicStatusListeners.unshift(this.musicStatusListener);
  },
  checkUserStatus: function() {
    try {
      const userValue = wx.getStorageSync('userValue') || 0;
      const selectedTeam = wx.getStorageSync('selectedTeam') || '';
      this.setData({
        userValue: userValue,
        selectedTeam: selectedTeam,
        showSurveyButton: !(userValue > 0)
      });
      // 如果有选择的球队，获取球队名称
      if (selectedTeam) {
        this.fetchTeamName(selectedTeam);
      } else {
        this.setData({ selectedTeamName: '' });
      }
    } catch (e) {
      console.error('检查用户状态失败', e);
    }
  },
  onNicknameInput: function(e) {
    this.setData({ nickname: e.detail.value });
  },
  saveNickname: async function() {
    const app = getApp();
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
          showLoginPopup: false
        });
        app.globalData.userInfo = res.result.data;
        wx.setStorageSync('userInfo', res.result.data);
        wx.removeStorageSync('isLoggedOut');
        this.checkUserStatus();
        this.fetchUserInfo();
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
  goToSurvey: function() {
    if (!this.data.hasUserInfo) {
      this.handleLogin();
      return;
    }
    wx.navigateTo({ url: '../survey/survey' });
  },
  goToAdminPage: function() {
    if (!this.data.hasUserInfo) {
      this.handleLogin();
      return;
    }
    wx.navigateTo({ url: '../admin/admin' });
  },
  goToTeamSignup: function() {
    if (!(this.data.userValue > 0)) {
      wx.showToast({ title: '请先完成身价评估', icon: 'none' });
      return;
    }
    // 不需要检查是否已选择球队，因为用户点击按钮就是为了选择/更换球队
    wx.navigateTo({ url: '../team_signup/team_signup' });
  },
  goToRanking: function() {
    wx.navigateTo({ url: '../ranking/ranking' });
  },
  goToTeamStatusPage: function() {
    wx.navigateTo({ url: '../team_status/team_status' });
  },
  goToSchedulePage: function() {
    wx.navigateTo({ url: '/pages/schedule/schedule' });
  },
  goToStandingsPage: function() {
    wx.navigateTo({ url: '/pages/standings/standings' });
  },
  goToLeagueRecordsPage: function() {
    wx.navigateTo({ url: '/pages/league_records/league_records' });
  },
  handleLogin: function() {
    this.setData({ showLoginPopup: true });
  },
  closeLoginPopup: function() {
    this.setData({ showLoginPopup: false });
  },
  onAvatarWrapperTap: function() {
    this.setData({ isChoosingAvatar: true });
  },
  onChooseAvatar: function(e) {
    const avatarUrl = e.detail.avatarUrl;
    if (avatarUrl) {
      this.setData({ avatarUrl: avatarUrl });
    }
    setTimeout(() => {
      this.setData({ isChoosingAvatar: false });
    }, 500);
  },
  logout: function() {
    const app = getApp();
    wx.showModal({
      title: '确认退出',
      content: '您确定要退出登录吗？',
      success: (res) => {
        if (!res.confirm) return;
        try {
          wx.setStorageSync('isLoggedOut', true);
          wx.removeStorageSync('userInfo');
          wx.removeStorageSync('hasCompletedSurvey');
          wx.removeStorageSync('userValue');
          wx.removeStorageSync('selectedTeam');
        } catch (e) {}
        app.globalData.userInfo = null;
        this.setData({
          userInfo: null,
          hasUserInfo: false,
          nickname: '',
          avatarUrl: '/images/avatar.png',
          hasCompletedSurvey: false,
          userValue: 0,
          selectedTeam: '',
          showSurveyButton: true
        });
        wx.showToast({ title: '已退出登录', icon: 'none' });
      }
    });
  },
  fetchUserInfo: function() {
    const app = getApp();
    wx.cloud.callFunction({
      name: 'getUserInfo',
      success: res => {
        if (res.result && res.result.success) {
          const userInfo = res.result.data;
          this.setData({ userInfo: userInfo, hasUserInfo: true });
          app.globalData.userInfo = userInfo;
          try {
            wx.setStorageSync('userInfo', userInfo);
            if (userInfo.total_value !== undefined) {
              wx.setStorageSync('userValue', userInfo.total_value);
              this.setData({ userValue: userInfo.total_value, showSurveyButton: !(userInfo.total_value > 0) });
            }
            if (userInfo.selectedTeam) {
              wx.setStorageSync('selectedTeam', userInfo.selectedTeam);
              this.setData({ selectedTeam: userInfo.selectedTeam });
              this.fetchTeamName(userInfo.selectedTeam);
            } else {
              this.setData({ selectedTeamName: '' });
            }
          } catch (e) {}
        }
      }
    });
  },
  fetchTeamName: function(teamId) {
    if (!teamId) {
      this.setData({ selectedTeamName: '' });
      return;
    }
    const db = wx.cloud.database();
    db.collection('teams').where({ _id: teamId }).get({
      success: res => {
        if (res.data && res.data.length > 0) {
          this.setData({ selectedTeamName: res.data[0].name || teamId });
        } else {
          this.setData({ selectedTeamName: teamId });
        }
      },
      fail: () => {
        this.setData({ selectedTeamName: teamId });
      }
    });
  },
  toggleMusic: function() {
    const app = getApp();
    const isCurrentlyPlaying = app.globalData.isMusicPlaying;
    if (isCurrentlyPlaying) {
      app.pauseMusic();
    } else {
      app.playMusic();
    }
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
    const app = getApp();
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
  },
  onSignIn: function () {
    wx.showLoading({ title: '签到中...' });
    wx.cloud.callFunction({
      name: 'signIn',
      success: res => {
        wx.hideLoading();
        if (res.result.success) {
          wx.showToast({
            title: res.result.message,
            icon: 'success'
          });
          // 签到成功后刷新页面数据
          this.fetchUserInfo();
          this.checkUserStatus();
        } else {
          wx.showToast({
            title: res.result.message,
            icon: 'none'
          });
        }
      },
      fail: err => {
        wx.hideLoading();
        console.error('签到失败:', err);
        wx.showToast({
          title: '签到失败，请稍后重试',
          icon: 'none'
        });
      }
    });
  }
});