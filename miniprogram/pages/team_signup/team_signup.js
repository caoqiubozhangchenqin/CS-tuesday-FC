const db = wx.cloud.database();

Page({
  data: {
    teams: [],
    myTotalValue: 0,
    mySelectedTeam: '',
    globalBgUrl: ''
  },

  onLoad: function (options) {
    getApp().setPageBackground(this);
    if (options.totalValue) {
      this.setData({
        myTotalValue: Number(options.totalValue)
      });
    }
    this.getAllTeamsAndMyInfo();
  },

  onShow: function() {
    // 每次进入页面都刷新用户选择状态
    this.getAllTeamsAndMyInfo();
  },

  getAllTeamsAndMyInfo: async function () {
    wx.showLoading({
      title: '加载中...',
    });
    
    try {
      // 1. 并行获取球队列表(含价值)和用户签约状态
      const [adminRes, userRes] = await Promise.all([
        wx.cloud.callFunction({ name: 'getAdminDetails' }),
        wx.cloud.callFunction({ name: 'getUserSelectedTeam' })
      ]);

      const teamsWithValue = adminRes.result.data || [];
      const mySelectedTeam = userRes.result.selectedTeam || '';

      console.log('--- 报名页面数据刷新 ---');
      console.log('我的队伍ID:', mySelectedTeam);

      // 2. 核心逻辑：处理并匹配数据
      const updatedTeams = teamsWithValue.map(team => {
        // 健壮地处理 team._id，无论它是对象还是字符串
        const teamIdStr = (team._id && typeof team._id === 'object') ? String(team._id) : String(team._id);
        
        return {
          _id: team._id, // 保留原始ID用于操作
          name: team.teamName,
          salary_cap: team.salary_cap || 0,
          totalTeamValue: team.totalTeamValue || 0,
          // 关键：进行字符串比较
          isSelected: mySelectedTeam === teamIdStr
        };
      });
      
      // 3. 更新页面
      this.setData({
        teams: updatedTeams,
        mySelectedTeam: mySelectedTeam
      });

    } catch (e) {
      console.error('获取数据失败', e);
      wx.showToast({
        title: '数据加载失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  handleJoinTeam: async function (e) {
    const teamId = e.currentTarget.dataset.teamId;
    wx.showLoading({
      title: '签约中...',
    });

    try {
      const res = await wx.cloud.callFunction({
        name: 'joinTeam',
        data: { teamId: teamId }
      });

      wx.hideLoading();

      if (res.result.success) {
        wx.showToast({ title: '签约成功！', icon: 'success' });
        
        // 核心：直接在本地更新数据，实现UI即时刷新
        const updatedTeams = this.data.teams.map(team => {
            const teamIdStr = (team._id && typeof team._id === 'object') ? String(team._id) : String(team._id);
            return {
                ...team,
                isSelected: teamIdStr === teamId
            };
        });

        this.setData({
          teams: updatedTeams,
          mySelectedTeam: teamId
        });
        
        wx.setStorageSync('selectedTeam', teamId);

      } else {
        wx.showToast({ title: res.result.message || '签约失败', icon: 'none' });
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '请求失败，请重试', icon: 'none' });
      console.error(err);
    }
  },
  
  handleCancelJoinTeam: async function (e) {
    const teamId = e.currentTarget.dataset.teamId;
    wx.showLoading({
      title: '解约中...',
    });

    try {
      const res = await wx.cloud.callFunction({
        name: 'cancelJoinTeam',
        data: { teamId: teamId }
      });

      wx.hideLoading();

      if (res.result.success) {
        wx.showToast({ title: '解约成功！', icon: 'success' });

        // 核心：直接在本地更新数据，实现UI即时刷新
        const updatedTeams = this.data.teams.map(team => ({
          ...team,
          isSelected: false
        }));

        this.setData({
          teams: updatedTeams,
          mySelectedTeam: ''
        });

        wx.removeStorageSync('selectedTeam');
      } else {
        wx.showToast({ title: res.result.message || '解约失败', icon: 'none' });
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '请求失败，请重试', icon: 'none' });
      console.error(err);
    }
  },

  onReady: function () {},
  onHide: function () {},
  onUnload: function () {},

  onPullDownRefresh: function () {
    this.getAllTeamsAndMyInfo();
    wx.stopPullDownRefresh();
  },

  onReachBottom: function () {},
  onShareAppMessage: function () {}
});