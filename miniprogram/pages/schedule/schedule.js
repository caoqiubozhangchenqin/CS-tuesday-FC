// pages/schedule/schedule.js
Page({
  data: {
    // 【修改】数据结构改变，不再是简单的list
    groupedScheduleList: [], 
    isLoading: true
    , bgImageUrl: ''
  },

  onLoad(options) {
    // 背景图处理（优先使用全局已有链接，否则注册监听）
    const app = getApp();
    if (app && app.globalData && app.globalData.bgImageUrl) {
      this.setData({ bgImageUrl: app.globalData.bgImageUrl });
    } else if (app && typeof app.addBgListener === 'function') {
      this._removeBgListener = app.addBgListener(url => { this.setData({ bgImageUrl: url }); });
    }
    this.getScheduleData();
  },

  onUnload() { if (this._removeBgListener) this._removeBgListener(); },

  getScheduleData() {
    wx.showLoading({ title: '正在加载赛程...' });

    wx.cloud.callFunction({
      name: 'getSchedules',
      success: res => {
        // 【核心修改】调用函数来处理和分组数据
        const groupedData = this.groupMatchesByRound(res.result);
        
        this.setData({
          groupedScheduleList: groupedData,
          isLoading: false
        });
      },
      fail: err => {
        console.error('调用云函数失败：', err);
        this.setData({ isLoading: false });
        wx.showToast({ title: '加载失败', icon: 'error' });
      },
      complete: () => {
        wx.hideLoading();
      }
    });
  },

  /**
   * 【新增函数】将扁平的比赛列表按轮次分组
   * @param {Array} scheduleList - 从云函数获取的原始比赛列表
   * @returns {Array} - 返回分组后的数组，格式为 [{round: '第1轮', matches: [...]}, ...]
   */
  groupMatchesByRound(scheduleList) {
    if (!scheduleList || scheduleList.length === 0) {
      return [];
    }

    const grouped = [];
    let currentRound = null;
    let currentMatches = [];

    for (const match of scheduleList) {
      if (match.round !== currentRound) {
        // 遇到新的轮次
        if (currentRound !== null) {
          // 将上一轮的数据推入结果数组
          grouped.push({
            round: currentRound,
            matches: currentMatches
          });
        }
        // 开始新一轮的记录
        currentRound = match.round;
        currentMatches = [match];
      } else {
        // 仍然是当前轮次，继续添加比赛
        currentMatches.push(match);
      }
    }

    // 将最后一轮的数据推入
    grouped.push({
      round: currentRound,
      matches: currentMatches
    });

    return grouped;
  }
})