// utils/cache.js - 数据缓存工具类
class Cache {
  /**
   * 缓存键名前缀
   */
  static PREFIX = 'csfc_cache_';

  /**
   * 默认缓存时间（毫秒）
   */
  static DEFAULT_TTL = 5 * 60 * 1000; // 5分钟

  /**
   * 生成缓存键
   * @param {string} key - 原始键名
   * @returns {string} 带前缀的缓存键
   */
  static getCacheKey(key) {
    return this.PREFIX + key;
  }

  /**
   * 设置缓存数据
   * @param {string} key - 缓存键
   * @param {any} data - 要缓存的数据
   * @param {number} ttl - 缓存时间（毫秒），默认5分钟
   */
  static set(key, data, ttl = this.DEFAULT_TTL) {
    try {
      const cacheKey = this.getCacheKey(key);
      const cacheData = {
        data: data,
        timestamp: Date.now(),
        ttl: ttl
      };

      wx.setStorageSync(cacheKey, cacheData);
      console.log(`缓存设置成功: ${key}`);
    } catch (error) {
      console.error('缓存设置失败:', error);
    }
  }

  /**
   * 获取缓存数据
   * @param {string} key - 缓存键
   * @returns {any|null} 缓存数据，如果过期或不存在返回null
   */
  static get(key) {
    try {
      const cacheKey = this.getCacheKey(key);
      const cacheData = wx.getStorageSync(cacheKey);

      if (!cacheData) {
        return null;
      }

      const { data, timestamp, ttl } = cacheData;
      const now = Date.now();

      // 检查是否过期
      if (now - timestamp > ttl) {
        console.log(`缓存已过期: ${key}`);
        this.remove(key); // 删除过期缓存
        return null;
      }

      console.log(`缓存命中: ${key}`);
      return data;
    } catch (error) {
      console.error('缓存获取失败:', error);
      return null;
    }
  }

  /**
   * 删除缓存数据
   * @param {string} key - 缓存键
   */
  static remove(key) {
    try {
      const cacheKey = this.getCacheKey(key);
      wx.removeStorageSync(cacheKey);
      console.log(`缓存删除成功: ${key}`);
    } catch (error) {
      console.error('缓存删除失败:', error);
    }
  }

  /**
   * 清空所有缓存数据
   */
  static clear() {
    try {
      const storageKeys = wx.getStorageInfoSync().keys;
      const cacheKeys = storageKeys.filter(key => key.startsWith(this.PREFIX));

      cacheKeys.forEach(key => {
        wx.removeStorageSync(key);
      });

      console.log(`清空缓存成功，共删除 ${cacheKeys.length} 项`);
    } catch (error) {
      console.error('清空缓存失败:', error);
    }
  }

  /**
   * 获取缓存信息
   * @returns {Object} 缓存统计信息
   */
  static getInfo() {
    try {
      const storageInfo = wx.getStorageInfoSync();
      const cacheKeys = storageInfo.keys.filter(key => key.startsWith(this.PREFIX));

      return {
        total: storageInfo.keys.length,
        cacheItems: cacheKeys.length,
        limitSize: storageInfo.limitSize,
        currentSize: storageInfo.currentSize
      };
    } catch (error) {
      console.error('获取缓存信息失败:', error);
      return null;
    }
  }

  /**
   * 检查缓存是否存在且未过期
   * @param {string} key - 缓存键
   * @returns {boolean} 是否存在有效缓存
   */
  static has(key) {
    return this.get(key) !== null;
  }

  /**
   * 获取或设置缓存（缓存模式）
   * @param {string} key - 缓存键
   * @param {Function} getter - 数据获取函数
   * @param {number} ttl - 缓存时间
   * @returns {Promise} 返回缓存数据或新获取的数据
   */
  static async getOrSet(key, getter, ttl = this.DEFAULT_TTL) {
    // 先尝试从缓存获取
    const cachedData = this.get(key);
    if (cachedData !== null) {
      return cachedData;
    }

    try {
      // 缓存不存在，调用getter获取数据
      const data = await getter();

      // 设置缓存
      this.set(key, data, ttl);

      return data;
    } catch (error) {
      console.error('获取数据失败:', error);
      throw error;
    }
  }

  /**
   * 批量删除缓存
   * @param {Array<string>} keys - 缓存键数组
   */
  static removeBatch(keys) {
    keys.forEach(key => this.remove(key));
  }

  /**
   * 设置长期缓存（24小时）
   * @param {string} key - 缓存键
   * @param {any} data - 数据
   */
  static setLongTerm(key, data) {
    this.set(key, data, 24 * 60 * 60 * 1000); // 24小时
  }

  /**
   * 设置短期缓存（1分钟）
   * @param {string} key - 缓存键
   * @param {any} data - 数据
   */
  static setShortTerm(key, data) {
    this.set(key, data, 60 * 1000); // 1分钟
  }
}

module.exports = Cache;