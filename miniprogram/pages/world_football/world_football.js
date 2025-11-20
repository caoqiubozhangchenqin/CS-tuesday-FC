// pages/world_football/world_football.js
const app = getApp();

Page({
  data: {
    // 当前选择的联赛
    currentLeague: 'en.1',
    leagueName: '英超',
    season: '2024-25',
    
    // 数据
    matches: [],
    allMatches: [],
    standings: [],
    recentMatches: [],
    upcomingMatches: [],
    
    // 状态
    loading: false,
    error: '',
    activeTab: 'standings', // standings, matches, upcoming
    
    // 联赛配置
    leagues: [
      { id: 'en.1', name: '英超', code: 'PL' },
      { id: 'de.1', name: '德甲', code: 'BL' },
      { id: 'es.1', name: '西甲', code: 'PD' },
      { id: 'it.1', name: '意甲', code: 'SA' },
      { id: 'fr.1', name: '法甲', code: 'L1' }
    ],
    
    // 背景图
    bgImageUrl: ''
  },

  onLoad() {
    // 设置背景图
    if (app.globalData && app.globalData.bgImageUrl) {
      this.setData({ bgImageUrl: app.globalData.bgImageUrl });
    }
    
    // 加载数据
    this.loadLeagueData();
  },

  // 切换联赛
  switchLeague(e) {
    const league = e.currentTarget.dataset.league;
    const leagueName = e.currentTarget.dataset.name;
    
    if (league === this.data.currentLeague) return;
    
    this.setData({
      currentLeague: league,
      leagueName: leagueName,
      matches: [],
      standings: [],
      error: ''
    });
    
    this.loadLeagueData();
  },

  // 切换标签页
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
  },

  // 加载联赛数据
  loadLeagueData() {
    this.setData({ loading: true, error: '' });
    
    const url = `https://raw.githubusercontent.com/openfootball/football.json/master/${this.data.season}/${this.data.currentLeague}.json`;
    
    console.log('加载联赛数据:', url);
    
    wx.request({
      url: url,
      success: (res) => {
        console.log('联赛数据响应:', res);
        
        if (res.statusCode === 200 && res.data) {
          const matches = res.data.matches || [];
          
          // 计算积分榜
          const standings = this.calculateStandings(matches);
          
          // 筛选最近和即将进行的比赛
          const { recent, upcoming } = this.filterMatches(matches);
          
          this.setData({
            allMatches: matches,
            matches: matches,
            standings: standings,
            recentMatches: recent,
            upcomingMatches: upcoming,
            loading: false
          });
          
          console.log('积分榜:', standings);
          console.log('最近比赛:', recent.length);
          console.log('即将比赛:', upcoming.length);
        } else {
          throw new Error('数据格式错误');
        }
      },
      fail: (err) => {
        console.error('加载失败:', err);
        this.setData({
          loading: false,
          error: '加载失败，请检查网络连接'
        });
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        });
      }
    });
  },

  // 计算积分榜
  calculateStandings(matches) {
    const standings = {};
    
    matches.forEach(match => {
      // 只处理已完成的比赛
      if (!match.score || !match.score.ft) return;
      
      const [score1, score2] = match.score.ft;
      const team1 = match.team1;
      const team2 = match.team2;
      
      // 初始化球队数据
      if (!standings[team1]) {
        standings[team1] = {
          team: team1,
          played: 0,
          won: 0,
          draw: 0,
          lost: 0,
          gf: 0,
          ga: 0,
          gd: 0,
          pts: 0
        };
      }
      if (!standings[team2]) {
        standings[team2] = {
          team: team2,
          played: 0,
          won: 0,
          draw: 0,
          lost: 0,
          gf: 0,
          ga: 0,
          gd: 0,
          pts: 0
        };
      }
      
      // 更新统计
      standings[team1].played++;
      standings[team2].played++;
      standings[team1].gf += score1;
      standings[team1].ga += score2;
      standings[team2].gf += score2;
      standings[team2].ga += score1;
      
      if (score1 > score2) {
        // 主队赢
        standings[team1].won++;
        standings[team1].pts += 3;
        standings[team2].lost++;
      } else if (score1 < score2) {
        // 客队赢
        standings[team2].won++;
        standings[team2].pts += 3;
        standings[team1].lost++;
      } else {
        // 平局
        standings[team1].draw++;
        standings[team2].draw++;
        standings[team1].pts += 1;
        standings[team2].pts += 1;
      }
      
      // 计算净胜球
      standings[team1].gd = standings[team1].gf - standings[team1].ga;
      standings[team2].gd = standings[team2].gf - standings[team2].ga;
    });
    
    // 转换为数组并排序
    return Object.values(standings)
      .sort((a, b) => {
        // 首先按积分排序
        if (b.pts !== a.pts) return b.pts - a.pts;
        // 积分相同按净胜球
        if (b.gd !== a.gd) return b.gd - a.gd;
        // 净胜球相同按进球数
        return b.gf - a.gf;
      });
  },

  // 筛选比赛
  filterMatches(matches) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const recent = [];
    const upcoming = [];
    
    matches.forEach(match => {
      const matchDate = new Date(match.date);
      matchDate.setHours(0, 0, 0, 0);
      
      if (matchDate < today) {
        // 已完成的比赛
        if (match.score && match.score.ft) {
          recent.push(match);
        }
      } else {
        // 即将进行的比赛
        upcoming.push(match);
      }
    });
    
    // 最近比赛按日期倒序（最新的在前）
    recent.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // 即将比赛按日期正序（最近的在前）
    upcoming.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    return {
      recent: recent.slice(0, 20), // 最近20场
      upcoming: upcoming.slice(0, 20) // 未来20场
    };
  },

  // 格式化日期
  formatDate(dateStr) {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}月${day}日`;
  },

  // 刷新数据
  onPullDownRefresh() {
    this.loadLeagueData();
    setTimeout(() => {
      wx.stopPullDownRefresh();
    }, 1000);
  }
});
