const db = wx.cloud.database();

Page({
       const userRes = await wx.cloud.callFunction({
          name: 'getUserInterestedTeams'
      });
      
      const mySelectedTeam = userRes.result.selectedTeam || '';
      
      const updatedTeams = teams.map(team => ({
        ...team,
        isInterested: mySelectedTeam === team._id
      }));
      
      this.setData({
        teams: updatedTeams,
        mySelectedTeam: mySelectedTeam
      });eams: [],
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
    if (!this.data.globalBgUrl) {
      setTimeout(() => {
        const app = getApp();
        if (app.globalData.globalBackgroundImageUrl) {
          this.setData({ globalBgUrl: app.globalData.globalBackgroundImageUrl });
        }
      }, 100);
    }
  },

  getAllTeamsAndMyInfo: async function () {
    wx.showLoading({
      title: '加载中...',
    });
    
    try {
      const teamsRes = await db.collection('teams').get();
      const teams = teamsRes.data.map(team => ({
        ...team,
        total_value: team.total_value || 0,
        isInterested: false
      }));

      const userRes = await wx.cloud.callFunction({
          name: 'getUserInterestedTeams'
      });
      
      const mySelectedTeam = userRes.result.selectedTeam || '';
      
      const updatedTeams = teams.map(team => ({
        ...team,
        isSelected: mySelectedTeam === team._id
      }));
      
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
      title: '报名中...',
    });
    wx.cloud.callFunction({
      name: 'joinTeam',
      data: {
        teamId: teamId
      },
      success: res => {
        wx.hideLoading();
        if (res.result.success) {
          wx.showToast({
            title: res.result.message,
            icon: 'success'
          });
          this.getAllTeamsAndMyInfo();
        } else {
          wx.showToast({
            title: res.result.message,
            icon: 'none'
          });
        }
      },
      fail: err => {
        wx.hideLoading();
        wx.showToast({
          title: '报名失败，请重试',
          icon: 'none'
        });
        console.error(err);
      }
    });
  },
  
  handleCancelJoinTeam: function (e) {
    const teamId = e.currentTarget.dataset.teamId;
    wx.showLoading({
      title: '取消中...',
    });
    wx.cloud.callFunction({
      name: 'cancelJoinTeam',
      data: {
        teamId: teamId
      },
      success: res => {
        wx.hideLoading();
        if (res.result.success) {
          wx.showToast({
            title: res.result.message,
            icon: 'success'
          });
          this.getAllTeamsAndMyInfo();
        } else {
          wx.showToast({
            title: res.result.message,
            icon: 'none'
          });
        }
      },
      fail: err => {
        wx.hideLoading();
        wx.showToast({
          title: '取消失败，请重试',
          icon: 'none'
        });
        console.error(err);
      }
    });
  },
  
  handleResetSelections: async function() {
    if (!this.data.mySelectedTeam) {
      wx.showToast({
        title: '您还没有选择队伍',
        icon: 'none'
      });
      return;
    }
    
    wx.showLoading({
      title: '重置中...',
    });
    
    wx.cloud.callFunction({
      name: 'cancelJoinTeam',
      data: {
        teamId: this.data.mySelectedTeam
      },
      success: res => {
        wx.hideLoading();
        if (res.result.success) {
          wx.showToast({
            title: res.result.message,
            icon: 'success'
          });
          this.getAllTeamsAndMyInfo();
        } else {
          wx.showToast({
            title: res.result.message,
            icon: 'none'
          });
        }
      },
      fail: err => {
        wx.hideLoading();
        wx.showToast({
          title: '重置失败，请重试',
          icon: 'none'
        });
        console.error(err);
      }
    });
  }
});
