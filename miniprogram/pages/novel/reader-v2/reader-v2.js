// pages/novel/reader-v2/reader-v2.js
const CHARS_PER_PAGE = 500; // 每页字数（固定）
const SEGMENT_SIZE = 100;   // 每个缓存分段的页数

Page({
  data: {
    novelId: '',
    novelInfo: null,
    progressId: null,       // 阅读进度记录ID
    
    currentPage: 0,
    totalPages: 0,
    progressPercent: 0,     // 进度百分比（已计算好的）
    
    visiblePages: [],       // 当前可见的3页
    swiperIndex: 1,         // swiper 当前索引（动态计算）
    fullContent: '',        // 完整文本（按需加载）
    segmentCache: {},       // 分段缓存
    currentSegment: -1,     // 当前加载的分段
    
    showMenu: false,        // 显示菜单
    nightMode: false,       // 夜间模式
    fontSize: 32,           // 字体大小（rpx）
    fontSizeLevel: 2,       // 字号级别：0=小(28), 1=中小(30), 2=中(32), 3=中大(36), 4=大(40)
    pageIndicator: '1/100'  // 页码指示器
  },

  onLoad(options) {
    const { novelId } = options;
    if (!novelId) {
      wx.showToast({ title: '缺少小说ID', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }

    this.setData({ novelId });
    
    // 加载用户设置（字号、夜间模式）
    this.loadSettings();
    
    this.init();
  },

  onUnload() {
    // 页面卸载时保存进度
    this.saveProgress();
  },

  /**
   * 初始化
   */
  async init() {
    try {
      wx.showLoading({ title: '正在加载...' });

      // 1. 加载小说元信息
      await this.loadNovelInfo();

      // 2. 恢复阅读进度
      await this.loadProgress();

      // 3. 加载内容
      await this.loadContent();

      // 4. 更新统计
      this.updateViewCount();
      this.autoAddToShelf();

      wx.hideLoading();
    } catch (error) {
      console.error('初始化失败:', error);
      wx.hideLoading();
      wx.showModal({
        title: '加载失败',
        content: error.message || '未知错误',
        showCancel: false,
        success: () => wx.navigateBack()
      });
    }
  },

  /**
   * 加载小说元信息（公共数据）
   */
  async loadNovelInfo() {
    const db = wx.cloud.database();
    const res = await db.collection('novels')
      .doc(this.data.novelId)
      .get();

    if (!res.data) {
      throw new Error('小说不存在');
    }

    console.log('小说信息:', res.data);

    this.setData({
      novelInfo: res.data,
      totalPages: res.data.totalPages,
      pageIndicator: `1/${res.data.totalPages}`,
      progressPercent: 0
    });
  },

  /**
   * 加载阅读进度（个人数据）
   */
  async loadProgress() {
    try {
      const db = wx.cloud.database();
      const _ = db.command;
      
      const res = await db.collection('reading_progress')
        .where({
          novelId: _.eq(this.data.novelId)
        })
        .limit(1)
        .get();

      if (res.data && res.data.length > 0) {
        const progress = res.data[0];
        const pageNum = progress.currentPage || 0;
        const percent = this.data.totalPages > 0 
          ? ((pageNum / this.data.totalPages) * 100).toFixed(1)
          : 0;
        
        this.setData({
          currentPage: pageNum,
          progressId: progress._id, // 保存进度记录ID，用于后续更新
          pageIndicator: `${pageNum + 1}/${this.data.totalPages}`,
          progressPercent: percent
        });

        console.log(`恢复进度：第 ${pageNum + 1} 页`);
      } else {
        console.log('没有历史进度，从第1页开始');
      }
    } catch (error) {
      // 如果是权限错误，可能是集合不存在或首次访问
      if (error.errCode === -502003 || error.errCode === -502005) {
        console.log('无法加载进度（可能是首次阅读）:', error.errMsg);
        // 不抛出错误，允许继续初始化
      } else {
        throw error;
      }
    }
  },

  /**
   * 加载内容（分段策略）
   */
  async loadContent() {
    const currentPage = this.data.currentPage;
    const segmentIndex = Math.floor(currentPage / SEGMENT_SIZE);

    // 检查缓存
    if (this.data.segmentCache[segmentIndex]) {
      this.renderPages(currentPage);
      return;
    }

    // 下载文件分段
    wx.showLoading({ title: '加载内容...' });

    try {
      const { fileID } = this.data.novelInfo;

      // 下载完整文件
      const res = await wx.cloud.downloadFile({ fileID });
      const fs = wx.getFileSystemManager();
      const content = fs.readFileSync(res.tempFilePath, 'utf8');

      // 提取该分段内容
      const startChar = segmentIndex * SEGMENT_SIZE * CHARS_PER_PAGE;
      const endChar = startChar + SEGMENT_SIZE * CHARS_PER_PAGE;
      const segmentContent = content.substring(startChar, endChar);

      // 缓存
      const cache = this.data.segmentCache;
      cache[segmentIndex] = segmentContent;
      
      this.setData({ 
        segmentCache: cache,
        currentSegment: segmentIndex
      });

      // 渲染页面
      this.renderPages(currentPage);

      wx.hideLoading();
    } catch (error) {
      console.error('加载内容失败:', error);
      wx.hideLoading();
      throw error;
    }
  },

  /**
   * 渲染可见页（当前页 ± 1）
   */
  renderPages(centerPage) {
    const pages = [];
    const segmentIndex = Math.floor(centerPage / SEGMENT_SIZE);
    const segmentContent = this.data.segmentCache[segmentIndex];

    if (!segmentContent) {
      console.warn('分段内容未加载');
      return;
    }

    // 渲染前中后3页
    for (let i = centerPage - 1; i <= centerPage + 1; i++) {
      if (i >= 0 && i < this.data.totalPages) {
        const localPageIndex = i % SEGMENT_SIZE; // 在分段中的索引
        const start = localPageIndex * CHARS_PER_PAGE;
        const end = start + CHARS_PER_PAGE;
        const content = segmentContent.substring(start, end);

        pages.push({ 
          index: i, 
          content,
          pageNum: i + 1
        });
      }
    }

    // 计算 swiper 应该显示的索引
    // 如果是第0页，索引=0；否则索引=1（中间位置）
    const swiperIdx = (centerPage === 0) ? 0 : 1;

    this.setData({ 
      visiblePages: pages,
      swiperIndex: swiperIdx
    });
  },

  /**
   * 翻页事件
   */
  onPageChange(e) {
    const swiperIndex = e.detail.current; // swiper 的索引 (0, 1, 2)
    const newPageIndex = this.data.visiblePages[swiperIndex]?.index;

    if (newPageIndex === undefined) return;

    console.log('翻页到:', newPageIndex + 1);

    // 计算进度百分比
    const percent = this.data.totalPages > 0 
      ? ((newPageIndex / this.data.totalPages) * 100).toFixed(1)
      : 0;

    // 更新当前页
    this.setData({
      currentPage: newPageIndex,
      pageIndicator: `${newPageIndex + 1}/${this.data.totalPages}`,
      progressPercent: percent
    });

    // 检查是否需要加载新分段
    const newSegment = Math.floor(newPageIndex / SEGMENT_SIZE);
    if (newSegment !== this.data.currentSegment) {
      this.loadContent();
    } else {
      this.renderPages(newPageIndex);
    }

    // 防抖保存进度
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      this.saveProgress();
    }, 1000);
  },

  /**
   * 保存阅读进度（个人数据）
   */
  async saveProgress() {
    try {
      const db = wx.cloud.database();
      const _ = db.command;
      const { novelId, currentPage, totalPages, novelInfo, progressId } = this.data;

      const progressData = {
        novelId,
        novelTitle: novelInfo.title,
        currentPage,
        charOffset: currentPage * CHARS_PER_PAGE,
        totalPages,
        progress: parseFloat(((currentPage / totalPages) * 100).toFixed(2)),
        lastReadTime: db.serverDate(),
        updateTime: db.serverDate()
      };

      if (progressId) {
        // 已有进度记录ID，直接更新
        await db.collection('reading_progress')
          .doc(progressId)
          .update({ 
            data: progressData 
          });
        console.log('进度已更新:', currentPage + 1);
      } else {
        // 没有进度ID，先查询
        const exist = await db.collection('reading_progress')
          .where({ 
            novelId: _.eq(novelId)
          })
          .limit(1)
          .get();

        if (exist.data && exist.data.length > 0) {
          // 找到已有记录，更新
          const existId = exist.data[0]._id;
          await db.collection('reading_progress')
            .doc(existId)
            .update({ 
              data: progressData 
            });
          // 保存ID供下次使用
          this.setData({ progressId: existId });
          console.log('进度已更新:', currentPage + 1);
        } else {
          // 没有记录，新增（_openid 自动添加）
          const addRes = await db.collection('reading_progress')
            .add({ 
              data: progressData 
            });
          // 保存新ID
          this.setData({ progressId: addRes._id });
          console.log('进度已创建:', currentPage + 1);
        }
      }
    } catch (error) {
      console.error('保存进度失败:', error);
      // 不阻断用户阅读，静默失败
    }
  },

  /**
   * 更新阅读统计（公共数据）
   */
  async updateViewCount() {
    try {
      const db = wx.cloud.database();
      await db.collection('novels')
        .doc(this.data.novelId)
        .update({
          data: {
            viewCount: db.command.inc(1)
          }
        });
    } catch (error) {
      console.error('更新阅读量失败:', error);
    }
  },

  /**
   * 自动加入书架
   */
  async autoAddToShelf() {
    try {
      const db = wx.cloud.database();
      const { novelId, novelInfo } = this.data;

      const exist = await db.collection('user_shelf')
        .where({ novelId })
        .get();

      if (exist.data.length === 0) {
        await db.collection('user_shelf').add({
          data: {
            novelId,
            novelTitle: novelInfo.title,
            novelCover: novelInfo.cover || '',
            novelAuthor: novelInfo.author,
            addTime: Date.now(),
            lastReadTime: Date.now(),
            isFavorite: false
          }
        });
        console.log('已自动加入书架');
      } else {
        // 更新最后阅读时间
        await db.collection('user_shelf')
          .doc(exist.data[0]._id)
          .update({
            data: { lastReadTime: Date.now() }
          });
      }
    } catch (error) {
      console.error('加入书架失败:', error);
    }
  },

  /**
   * 切换菜单
   */
  toggleMenu() {
    this.setData({
      showMenu: !this.data.showMenu
    });
  },

  /**
   * 阻止事件冒泡（空函数）
   */
  doNothing() {
    // 阻止事件冒泡
  },

  /**
   * 进度条拖动
   */
  onSliderChange(e) {
    const newPage = e.detail.value;
    const percent = this.data.totalPages > 0 
      ? ((newPage / this.data.totalPages) * 100).toFixed(1)
      : 0;
    
    this.setData({ 
      currentPage: newPage,
      pageIndicator: `${newPage + 1}/${this.data.totalPages}`,
      progressPercent: percent
    });
    
    // 加载新页面内容
    this.loadContent();
    
    // 保存进度
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      this.saveProgress();
    }, 1000);
  },

  /**
   * 跳转到指定页
   */
  jumpToPage(e) {
    wx.showModal({
      title: '跳转页码',
      placeholderText: '请输入页码',
      editable: true,
      success: (res) => {
        if (res.confirm && res.content) {
          const pageNum = parseInt(res.content);
          if (pageNum > 0 && pageNum <= this.data.totalPages) {
            const newPage = pageNum - 1;
            const percent = this.data.totalPages > 0 
              ? ((newPage / this.data.totalPages) * 100).toFixed(1)
              : 0;
            
            this.setData({ 
              currentPage: newPage,
              pageIndicator: `${pageNum}/${this.data.totalPages}`,
              progressPercent: percent
            });
            this.loadContent();
          } else {
            wx.showToast({ title: '页码无效', icon: 'none' });
          }
        }
      }
    });
  },

  /**
   * 返回
   */
  goBack() {
    this.saveProgress(); // 保存后返回
    wx.navigateBack();
  },

  /**
   * 加载用户设置
   */
  loadSettings() {
    try {
      const fontSize = wx.getStorageSync('reader_fontSize') || 32;
      const fontSizeLevel = wx.getStorageSync('reader_fontSizeLevel') || 2;
      const nightMode = wx.getStorageSync('reader_nightMode') || false;
      
      this.setData({
        fontSize,
        fontSizeLevel,
        nightMode
      });
    } catch (error) {
      console.log('加载设置失败:', error);
    }
  },

  /**
   * 保存用户设置
   */
  saveSettings() {
    try {
      wx.setStorageSync('reader_fontSize', this.data.fontSize);
      wx.setStorageSync('reader_fontSizeLevel', this.data.fontSizeLevel);
      wx.setStorageSync('reader_nightMode', this.data.nightMode);
    } catch (error) {
      console.log('保存设置失败:', error);
    }
  },

  /**
   * 调整字体大小
   */
  adjustFontSize() {
    const fontSizes = [28, 30, 32, 36, 40];
    const fontNames = ['小', '中小', '中', '中大', '大'];
    
    let newLevel = (this.data.fontSizeLevel + 1) % fontSizes.length;
    const newSize = fontSizes[newLevel];
    
    this.setData({
      fontSize: newSize,
      fontSizeLevel: newLevel
    });
    
    this.saveSettings();
    
    wx.showToast({
      title: `字号：${fontNames[newLevel]}`,
      icon: 'none',
      duration: 1000
    });
  },

  /**
   * 切换夜间模式
   */
  toggleNightMode() {
    const newMode = !this.data.nightMode;
    this.setData({ nightMode: newMode });
    this.saveSettings();
    
    wx.showToast({
      title: newMode ? '夜间模式' : '日间模式',
      icon: 'none',
      duration: 1000
    });
  }
});
