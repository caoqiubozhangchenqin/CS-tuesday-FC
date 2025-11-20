// pages/world_football/world_football.js
const app = getApp();

Page({
  data: {
    // 当前选择的联赛
    currentLeague: 'en.1',
    leagueName: '英超',
    currentSeason: '2023-24',
    seasonIndex: 0, // 新增：当前选择的赛季索引
    
    // 数据
    standings: [],
    seasonInfo: '',
    
    // 状态
    loading: false,
    error: '',
    
    // 联赛配置
    leagues: [
      { id: 'en.1', name: '英超', code: 'PL' },
      { id: 'de.1', name: '德甲', code: 'BL' },
      { id: 'es.1', name: '西甲', code: 'PD' },
      { id: 'it.1', name: '意甲', code: 'SA' },
      { id: 'fr.1', name: '法甲', code: 'L1' }
    ],
    
    // 历史赛季配置（最近5个赛季）
    seasons: [
      { id: '2023-24', name: '2023-24赛季' },
      { id: '2022-23', name: '2022-23赛季' },
      { id: '2021-22', name: '2021-22赛季' },
      { id: '2020-21', name: '2020-21赛季' },
      { id: '2019-20', name: '2019-20赛季' },
      { id: '2018-19', name: '2018-19赛季' },
      { id: '2017-18', name: '2017-18赛季' },
      { id: '2016-17', name: '2016-17赛季' },
      { id: '2015-16', name: '2015-16赛季' },
      { id: '2014-15', name: '2014-15赛季' }
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

  // 赛季选择器改变事件
  onSeasonChange(e) {
    const index = parseInt(e.detail.value);
    const season = this.data.seasons[index];
    
    if (season.id === this.data.currentSeason) return;
    
    this.setData({
      seasonIndex: index,
      currentSeason: season.id,
      standings: [],
      error: ''
    });
    
    this.loadLeagueData();
  },

  // 加载联赛数据
  loadLeagueData() {
    this.setData({ loading: true, error: '' });
    
    const url = `https://raw.githubusercontent.com/openfootball/football.json/master/${this.data.currentSeason}/${this.data.currentLeague}.json`;
    
    console.log('加载历史赛季数据:', url);
    
    wx.request({
      url: url,
      success: (res) => {
        console.log('联赛数据响应:', res);
        
        if (res.statusCode === 200 && res.data) {
          const matches = res.data.matches || [];
          const seasonName = res.data.name || `${this.data.leagueName} ${this.data.currentSeason}`;
          
          // 计算积分榜（只使用已完成的比赛）
          const standings = this.calculateStandings(matches);
          
          if (standings.length === 0) {
            this.setData({
              loading: false,
              error: '该赛季暂无数据',
              seasonInfo: seasonName
            });
            return;
          }
          
          this.setData({
            standings: standings,
            seasonInfo: seasonName,
            loading: false
          });
          
          console.log('积分榜:', standings);
        } else {
          throw new Error('数据格式错误');
        }
      },
      fail: (err) => {
        console.error('加载失败:', err);
        this.setData({
          loading: false,
          error: '加载失败，该赛季可能没有数据或网络连接异常'
        });
        wx.showToast({
          title: '加载失败',
          icon: 'none',
          duration: 2000
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

  // 获取冠军球队
  getChampion() {
    if (this.data.standings.length > 0) {
      return this.data.standings[0].team;
    }
    return '';
  },

  // 刷新数据
  onPullDownRefresh() {
    this.loadLeagueData();
    setTimeout(() => {
      wx.stopPullDownRefresh();
    }, 1000);
  }
});
