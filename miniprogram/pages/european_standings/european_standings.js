// pages/european_standings/european_standings.js
Page({
  data: {
    currentLeague: 'PL', // 默认显示英超
    leagueName: '英超',
    loading: false,
    error: '',
    standings: [],
    updateTime: '',
    bgImageUrl: '',
    
    // 联赛配置
    leagueConfig: {
      'PL': { 
        name: '英超', 
        code: 'PL',
        championSlots: 4,  // 欧冠名额
        europaSlots: 6,    // 欧联名额（含欧冠）
        relegationSlots: 18 // 降级线
      },
      'PD': { 
        name: '西甲', 
        code: 'PD',
        championSlots: 4,
        europaSlots: 6,
        relegationSlots: 18
      },
      'BL1': { 
        name: '德甲', 
        code: 'BL1',
        championSlots: 4,
        europaSlots: 6,
        relegationSlots: 17  // 德甲只有18支球队
      },
      'FL1': { 
        name: '法甲', 
        code: 'FL1',
        championSlots: 3,  // 法甲欧冠名额较少
        europaSlots: 5,
        relegationSlots: 17
      },
      'SA': { 
        name: '意甲', 
        code: 'SA',
        championSlots: 4,
        europaSlots: 6,
        relegationSlots: 18
      }
    }
  },

  onLoad() {
    const app = getApp();
    this.loadStandings();
    
    // 设置全局背景
    if (app.globalData && app.globalData.bgImageUrl) {
      this.setData({ bgImageUrl: app.globalData.bgImageUrl });
    } else if (app && typeof app.addBgListener === 'function') {
      this._removeBgListener = app.addBgListener(url => { 
        this.setData({ bgImageUrl: url }); 
      });
    }
  },

  // 切换联赛
  switchLeague(e) {
    const league = e.currentTarget.dataset.league;
    if (league === this.data.currentLeague) return;
    
    const leagueName = this.data.leagueConfig[league].name;
    this.setData({
      currentLeague: league,
      leagueName: leagueName,
      standings: [],
      error: ''
    });
    
    this.loadStandings();
  },

  // 加载积分榜数据
  async loadStandings() {
    const { currentLeague, leagueConfig } = this.data;
    const leagueCode = leagueConfig[currentLeague].code;
    
    this.setData({ loading: true, error: '' });

    try {
      // 尝试 v4 API
      let data = await this.fetchFromAPI(leagueCode, 'v4');
      
      // 如果 v4 失败，尝试 v2
      if (!data) {
        console.log('v4 API 失败，尝试 v2 API');
        data = await this.fetchFromAPI(leagueCode, 'v2');
      }

      if (!data) {
        throw new Error('无法获取积分榜数据');
      }

      // 处理积分榜数据
      const processedStandings = this.processStandings(data.standings[0].table);
      
      this.setData({
        standings: processedStandings,
        loading: false,
        updateTime: this.formatDateTime(new Date())
      });

    } catch (error) {
      console.error('加载积分榜失败:', error);
      this.setData({
        loading: false,
        error: error.message || '加载失败，请稍后重试'
      });
    }
  },

  // 从 Football-Data.org API 获取数据
  async fetchFromAPI(leagueCode, version = 'v4') {
    const apiKey = 'c4906718aabe4287b5963a412e4c81ce';
    const baseUrl = version === 'v4' 
      ? 'https://api.football-data.org/v4'
      : 'https://api.football-data.org/v2';
    
    const url = `${baseUrl}/competitions/${leagueCode}/standings`;

    return new Promise((resolve) => {
      wx.request({
        url: url,
        method: 'GET',
        header: {
          'X-Auth-Token': apiKey
        },
        success: (res) => {
          if (res.statusCode === 200 && res.data && res.data.standings) {
            console.log(`${version} API 成功获取数据`);
            resolve(res.data);
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

  // 处理积分榜数据
  processStandings(table) {
    const { currentLeague, leagueConfig } = this.data;
    const config = leagueConfig[currentLeague];
    
    return table.map(item => {
      let rankClass = 'rank-normal';
      
      if (item.position <= config.championSlots) {
        rankClass = 'rank-champion';
      } else if (item.position <= config.europaSlots) {
        rankClass = 'rank-europa';
      } else if (item.position >= config.relegationSlots) {
        rankClass = 'rank-relegation';
      }
      
      return {
        position: item.position,
        team: item.team,
        playedGames: item.playedGames,
        won: item.won,
        draw: item.draw,
        lost: item.lost,
        points: item.points,
        goalDifference: item.goalDifference,
        rankClass: rankClass
      };
    });
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
    this.loadStandings().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  onUnload() {
    if (this._removeBgListener) {
      this._removeBgListener();
    }
  }
});
