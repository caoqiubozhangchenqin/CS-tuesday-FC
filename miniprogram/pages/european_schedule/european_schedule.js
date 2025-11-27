// pages/european_schedule/european_schedule.js
const ErrorHandler = require('../../utils/errorHandler.js');
const Cache = require('../../utils/cache.js');

Page({
  data: {
    currentLeague: 'PL', // 默认显示英超
    leagueName: '英超',
    currentMonth: '',
    loading: false,
    error: '',
    matches: [],
    updateTime: '',
    bgImageUrl: '',
    userReminders: [], // 用户的提醒设置

    // 联赛配置
    leagueConfig: {
      'PL': { name: '英超', code: 'PL' },
      'PD': { name: '西甲', code: 'PD' },
      'BL1': { name: '德甲', code: 'BL1' },
      'FL1': { name: '法甲', code: 'FL1' },
      'SA': { name: '意甲', code: 'SA' }
    }
  },  onLoad() {
    const app = getApp();
    this.setCurrentMonth();
    this.loadUserReminders(); // 加载用户提醒设置
    this.loadMatches();
    
    // 设置全局背景
    if (app.globalData && app.globalData.bgImageUrl) {
      this.setData({ bgImageUrl: app.globalData.bgImageUrl });
    } else if (app && typeof app.addBgListener === 'function') {
      this._removeBgListener = app.addBgListener(url => { 
        this.setData({ bgImageUrl: url }); 
      });
    }
  },

  // 设置当前月份显示
  setCurrentMonth() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    this.setData({
      currentMonth: `${year}年${month}月`
    });
  },

  // 切换联赛
  switchLeague(e) {
    const league = e.currentTarget.dataset.league;
    if (league === this.data.currentLeague) return;
    
    const leagueName = this.data.leagueConfig[league].name;
    this.setData({
      currentLeague: league,
      leagueName: leagueName,
      matches: [],
      error: ''
    });
    
    this.loadMatches();
  },

  // 加载赛程数据
  async loadMatches() {
    const { currentLeague, leagueConfig } = this.data;
    const leagueCode = leagueConfig[currentLeague].code;

    this.setData({ loading: true, error: '' });

    try {
      // 获取本月的起止日期
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();

      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);

      const dateFrom = this.formatDate(startDate);
      const dateTo = this.formatDate(endDate);

      // 生成缓存键
      const cacheKey = `matches_${leagueCode}_${dateFrom}_${dateTo}`;

      // 使用缓存获取数据
      const matches = await Cache.getOrSet(
        cacheKey,
        async () => {
          // 尝试 v4 API
          let matches = await this.fetchFromAPI(leagueCode, dateFrom, dateTo, 'v4');

          // 如果 v4 失败，尝试 v2
          if (!matches) {
            console.log('v4 API 失败，尝试 v2 API');
            matches = await this.fetchFromAPI(leagueCode, dateFrom, dateTo, 'v2');
          }

          if (!matches) {
            throw new Error('无法获取赛程数据');
          }

          return matches;
        },
        10 * 60 * 1000 // 缓存10分钟
      );

      // 处理比赛数据
      const processedMatches = this.processMatches(matches);

      this.setData({
        matches: processedMatches,
        loading: false,
        updateTime: this.formatDateTime(new Date())
      });

    } catch (error) {
      console.error('加载赛程失败:', error);
      ErrorHandler.handleNetworkError(error, '加载赛程失败，请稍后重试');
      this.setData({
        loading: false,
        error: error.message || '加载失败，请稍后重试'
      });
    }
  },

  // 从 Football-Data.org API 获取数据
  async fetchFromAPI(leagueCode, dateFrom, dateTo, version = 'v4') {
    const apiKey = 'c4906718aabe4287b5963a412e4c81ce';
    const baseUrl = version === 'v4' 
      ? 'https://api.football-data.org/v4'
      : 'https://api.football-data.org/v2';
    
    const url = `${baseUrl}/competitions/${leagueCode}/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`;

    return new Promise((resolve) => {
      wx.request({
        url: url,
        method: 'GET',
        header: {
          'X-Auth-Token': apiKey
        },
        success: (res) => {
          if (res.statusCode === 200 && res.data && res.data.matches) {
            console.log(`${version} API 成功获取数据:`, res.data.matches.length, '场比赛');
            resolve(res.data.matches);
          } else {
            console.error(`${version} API 返回错误:`, res.statusCode, res.data);
            resolve(null);
          }
        },
        fail: (error) => {
          console.error(`${version} API 请求失败:`, error);
          resolve(null);
        }
      });
    });
  },

  // 处理比赛数据
  processMatches(matches) {
    const userReminders = this.data.userReminders || [];
    const reminderMatchIds = userReminders.map(reminder => reminder.matchId);

    return matches.map(match => {
      const utcDate = new Date(match.utcDate);
      const homeScore = match.score?.fullTime?.home;
      const awayScore = match.score?.fullTime?.away;
      
      // 判断比赛状态
      let status = 'scheduled';
      let statusText = '未开始';
      
      if (match.status === 'FINISHED') {
        status = 'finished';
        statusText = '已结束';
      } else if (match.status === 'IN_PLAY' || match.status === 'PAUSED') {
        status = 'live';
        statusText = '进行中';
      } else if (match.status === 'POSTPONED') {
        status = 'postponed';
        statusText = '延期';
      } else if (match.status === 'CANCELLED') {
        status = 'cancelled';
        statusText = '取消';
      }

      // 判断胜负
      const homeWin = homeScore !== null && homeScore > awayScore;
      const awayWin = awayScore !== null && awayScore > homeScore;

      // 获取场地信息
      const venue = match.venue ? match.venue : (match.homeTeam?.venue || '');

      // 检查用户是否已设置提醒
      const hasReminder = reminderMatchIds.includes(match.id.toString());

      return {
        id: match.id,
        utcDate: match.utcDate,
        dateText: this.formatMatchDate(utcDate),
        timeText: this.formatMatchTime(utcDate),
        status: status,
        statusText: statusText,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        score: match.score,
        homeWin: homeWin,
        awayWin: awayWin,
        matchday: match.matchday,
        venue: venue,
        hasReminder: hasReminder
      };
    }).sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate)); // 按时间排序
  },

  // 加载用户的提醒设置
  async loadUserReminders() {
    try {
      const app = getApp();
      const openid = app.globalData.openid;

      if (!openid) {
        console.log('用户未登录，跳过加载提醒设置');
        return;
      }

      const result = await wx.cloud.callFunction({
        name: 'manageMatchReminders',
        data: {
          action: 'getUserReminders',
          userId: openid
        }
      });

      if (result.result && result.result.success) {
        this.setData({
          userReminders: result.result.reminders || []
        });
        console.log('用户提醒设置加载成功:', result.result.reminders.length, '个提醒');
      } else {
        console.error('加载用户提醒设置失败:', result.result);
      }
    } catch (error) {
      console.error('加载用户提醒设置异常:', error);
    }
  },

  // 切换提醒状态
  async toggleReminder(e) {
    const match = e.currentTarget.dataset.match;
    const app = getApp();
    const openid = app.globalData.openid;

    if (!openid) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    const isCurrentlySet = match.hasReminder;
    const action = isCurrentlySet ? 'cancelReminder' : 'setReminder';
    const matchId = match.id.toString();

    wx.showLoading({
      title: isCurrentlySet ? '取消提醒中...' : '设置提醒中...'
    });

    try {
      const result = await wx.cloud.callFunction({
        name: 'manageMatchReminders',
        data: {
          action: action,
          userId: openid,
          matchId: matchId
        }
      });

      wx.hideLoading();

      if (result.result && result.result.success) {
        wx.showToast({
          title: result.result.message,
          icon: 'success'
        });

        // 更新本地提醒列表
        let updatedReminders = [...this.data.userReminders];

        if (isCurrentlySet) {
          // 取消提醒：从列表中移除
          updatedReminders = updatedReminders.filter(reminder => reminder.matchId !== matchId);
        } else {
          // 设置提醒：添加到列表
          updatedReminders.push({
            matchId: matchId,
            createdAt: new Date()
          });
        }

        this.setData({
          userReminders: updatedReminders
        });

        // 重新处理比赛数据以更新UI
        const processedMatches = this.processMatches(this.data.matches.map(m => {
          // 从原始数据恢复，但保持其他状态
          return {
            ...m,
            hasReminder: updatedReminders.some(reminder => reminder.matchId === m.id.toString())
          };
        }));

        this.setData({
          matches: processedMatches
        });

      } else {
        wx.showToast({
          title: result.result.message || '操作失败',
          icon: 'none'
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('提醒操作失败:', error);
      wx.showToast({
        title: '操作失败，请重试',
        icon: 'none'
      });
    }
  },

  // 格式化比赛日期显示
  formatMatchDate(date) {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const weekday = weekdays[date.getDay()];
    return `${month}月${day}日 ${weekday}`;
  },

  // 格式化比赛时间显示
  formatMatchTime(date) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  },

  // 格式化日期时间
  formatDateTime(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadMatches().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  onUnload() {
    if (this._removeBgListener) {
      this._removeBgListener();
    }
  },

  // 跳转到直播页面
  goToLive(e) {
    const match = e.currentTarget.dataset.match;

    wx.showModal({
      title: '观看直播',
      content: '请复制以下网址到浏览器中打开：\n\nwww.zqbaba.org',
      confirmText: '复制网址',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          // 复制网址到剪贴板
          wx.setClipboardData({
            data: 'www.zqbaba.org',
            success: () => {
              ErrorHandler.showSuccess('网址已复制');
            },
            fail: () => {
              ErrorHandler.showError('复制失败');
            }
          });
        }
      }
    });
  }
});
