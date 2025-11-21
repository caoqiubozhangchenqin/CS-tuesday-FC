// pages/index/index.js
const config = require('../../config/env.js');

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
    selectedTeamName: '',
    weatherData: [], // 天气数据
    showWeather: false, // 控制天气弹窗显示
    zhihuData: [], // 知乎早报数据
    showZhihu: false // 控制知乎早报弹窗显示
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
    this.fetchWeatherData(); // 获取天气数据
    this.fetchZhihuData(); // 获取知乎早报数据
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
        showSurveyButton: userValue < 50 // 身价小于50需要做评估
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
    if (this.data.userValue < 50) {
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
  goToEuropeanStandings: function() {
    wx.navigateTo({ url: '/pages/european_standings/european_standings' });
  },
  goToEuropeanSchedule: function() {
    wx.navigateTo({ url: '/pages/european_schedule/european_schedule' });
  },
  goToWorldFootball: function() {
    wx.navigateTo({ url: '/pages/world_football/world_football' });
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
              this.setData({ userValue: userInfo.total_value, showSurveyButton: userInfo.total_value < 50 }); // 身价小于50需要做评估
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
  },
  fetchWeatherData: function() {
    // 使用 ALAPI v3 接口获取常熟7天天气预报
    wx.request({
      url: 'https://v3.alapi.cn/api/tianqi/seven',
      data: {
        token: config.alapiToken,
        city: '常熟'
      },
      success: (res) => {
        console.log('天气API响应:', res.data);
        let weatherList = [];
        
        if (res.data && res.data.code === 200 && res.data.data) {
          const rawData = res.data.data;
          console.log('完整的天气数据:', rawData);
          
          // v3 接口的 seven 端点直接返回数组
          if (Array.isArray(rawData)) {
            weatherList = rawData;
            // 打印第一条数据用于调试
            if (weatherList.length > 0) {
              console.log('第一条天气数据:', JSON.stringify(weatherList[0]));
            }
          } else if (rawData.forecast && Array.isArray(rawData.forecast)) {
            weatherList = rawData.forecast;
          } else if (rawData.daily && Array.isArray(rawData.daily)) {
            weatherList = rawData.daily;
          } else if (rawData.list && Array.isArray(rawData.list)) {
            weatherList = rawData.list;
          }
          
          // 只取前7天并处理数据
          weatherList = weatherList.slice(0, 7).map(item => {
            return {
              ...item,
              dateShort: this.formatDate(item.date),
              weekday: this.getWeekday(item.date),
              weatherEmoji: this.getWeatherEmoji(item.wea_day, item.wea_night)
            };
          });
          console.log('处理后的7天天气数据:', weatherList);
        } else {
          console.error('获取天气数据失败:', res.data);
          wx.showToast({
            title: '获取天气失败',
            icon: 'none'
          });
        }
        
        this.setData({
          weatherData: weatherList
        }, () => {
          console.log('setData完成，当前weatherData长度:', this.data.weatherData.length);
        });
      },
      fail: (err) => {
        console.error('请求天气API失败:', err);
        wx.showToast({
          title: '网络请求失败',
          icon: 'none'
        });
      }
    });
  },
  
  // 格式化日期，去掉年份
  formatDate: function(dateStr) {
    if (!dateStr) return '';
    // dateStr 格式: 2025-11-19
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[1]}-${parts[2]}`; // 返回 11-19
    }
    return dateStr;
  },

  // 返回指定日期的中文星期 (例：周一)
  getWeekday: function(dateStr) {
    if (!dateStr) return '';
    // 处理常见日期格式 YYYY-MM-DD
    const parts = dateStr.split('-');
    let d;
    if (parts.length === 3) {
      // 注意：月份从0开始
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      d = new Date(year, month, day);
    } else {
      d = new Date(dateStr);
    }
    if (isNaN(d.getTime())) return '';
    const map = ['周日','周一','周二','周三','周四','周五','周六'];
    return map[d.getDay()];
  },
  
  // 根据天气描述返回对应的 emoji
  getWeatherEmoji: function(weaDay, weaNight) {
    // 优先使用白天天气
    const wea = weaDay || weaNight || '';
    
    if (wea.includes('晴')) return '☀️';
    if (wea.includes('多云')) return '⛅';
    if (wea.includes('阴')) return '☁️';
    if (wea.includes('雨')) {
      if (wea.includes('大雨') || wea.includes('暴雨')) return '🌧️';
      if (wea.includes('小雨')) return '🌦️';
      return '🌧️';
    }
    if (wea.includes('雪')) return '❄️';
    if (wea.includes('雾') || wea.includes('霾')) return '🌫️';
    if (wea.includes('雷')) return '⛈️';
    
    return '🌤️'; // 默认
  },
  
  // 获取知乎早报数据
  fetchZhihuData: function() {
    wx.request({
      url: 'https://v3.alapi.cn/api/zhihu',
      data: {
        token: config.alapiToken
      },
      success: (res) => {
        console.log('知乎早报API响应:', res.data);
        if (res.data && res.data.code === 200 && res.data.data) {
          const zhihuList = res.data.data.list || [];
          console.log('知乎早报数据:', zhihuList);
          this.setData({
            zhihuData: zhihuList
          });
        } else {
          console.error('获取知乎早报失败:', res.data);
          wx.showToast({
            title: '获取知乎早报失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('知乎早报请求失败:', err);
        wx.showToast({
          title: '网络请求失败',
          icon: 'none'
        });
      }
    });
  },
  
  // 切换天气弹窗显示/隐藏
  toggleWeather: function() {
    this.setData({
      showWeather: !this.data.showWeather,
      showZhihu: false // 关闭知乎弹窗
    });
  },
  
  // 关闭天气弹窗
  closeWeather: function() {
    this.setData({
      showWeather: false
    });
  },
  
  // 切换知乎早报弹窗显示/隐藏
  toggleZhihu: function() {
    this.setData({
      showZhihu: !this.data.showZhihu,
      showWeather: false // 关闭天气弹窗
    });
  },
  
  // 关闭知乎早报弹窗
  closeZhihu: function() {
    this.setData({
      showZhihu: false
    });
  }
});