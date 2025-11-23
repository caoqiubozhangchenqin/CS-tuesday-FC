// pages/novel/reader-v2/reader-v2.js
const CHARS_PER_PAGE = 500; // 每页字数（固定）
const SEGMENT_SIZE = 100;   // 每个缓存分段的页数

Page({
  data: {
    novelId: '',
    novelInfo: null,
    
    currentPage: 0,
    totalPages: 0,
    
    visiblePages: [],       // 当前可见的3页
    fullContent: '',        // 完整文本（按需加载）
    segmentCache: {},       // 分段缓存
    currentSegment: -1,     // 当前加载的分段
    
    showMenu: false,        // 显示菜单
    fontSize: 32,           // 字体大小
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
      pageIndicator: `1/${res.data.totalPages}`
    });
  },

  /**
   * 加载阅读进度（个人数据）
   */
  async loadProgress() {
    const db = wx.cloud.database();
    const res = await db.collection('reading_progress')
      .where({ novelId: this.data.novelId })
      .get();

    if (res.data.length > 0) {
      const progress = res.data[0];
      const pageNum = progress.currentPage || 0;
      
      this.setData({
        currentPage: pageNum,
        pageIndicator: `${pageNum + 1}/${this.data.totalPages}`
      });

      console.log(`恢复进度：第 ${pageNum + 1} 页`);
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

    this.setData({ visiblePages: pages });
  },

  /**
   * 翻页事件
   */
  onPageChange(e) {
    const swiperIndex = e.detail.current; // swiper 的索引 (0, 1, 2)
    const newPageIndex = this.data.visiblePages[swiperIndex]?.index;

    if (newPageIndex === undefined) return;

    console.log('翻页到:', newPageIndex + 1);

    // 更新当前页
    this.setData({
      currentPage: newPageIndex,
      pageIndicator: `${newPageIndex + 1}/${this.data.totalPages}`
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
      const { novelId, currentPage, totalPages, novelInfo } = this.data;

      const progressData = {
        novelId,
        novelTitle: novelInfo.title,
        currentPage,
        charOffset: currentPage * CHARS_PER_PAGE,
        totalPages,
        progress: parseFloat(((currentPage / totalPages) * 100).toFixed(2)),
        lastReadTime: Date.now(),
        updateTime: Date.now()
      };

      // 查询是否已有进度
      const exist = await db.collection('reading_progress')
        .where({ novelId })
        .get();

      if (exist.data.length > 0) {
        // 更新
        await db.collection('reading_progress')
          .doc(exist.data[0]._id)
          .update({ data: progressData });
      } else {
        // 新增（_openid 自动添加）
        await db.collection('reading_progress')
          .add({ data: progressData });
      }

      console.log('进度已保存:', currentPage + 1);
    } catch (error) {
      console.error('保存进度失败:', error);
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
            this.setData({ currentPage: pageNum - 1 });
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
  }
});
