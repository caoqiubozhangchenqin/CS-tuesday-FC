// utils/errorHandler.js - 统一错误处理工具类
class ErrorHandler {
  /**
   * 显示成功提示
   * @param {string} message - 提示消息
   * @param {number} duration - 显示时长，默认2000ms
   */
  static showSuccess(message, duration = 2000) {
    wx.showToast({
      title: message,
      icon: 'success',
      duration: duration
    });
  }

  /**
   * 显示错误提示
   * @param {string} message - 错误消息
   * @param {number} duration - 显示时长，默认3000ms
   */
  static showError(message, duration = 3000) {
    wx.showToast({
      title: message,
      icon: 'none',
      duration: duration
    });
  }

  /**
   * 显示警告提示
   * @param {string} message - 警告消息
   * @param {number} duration - 显示时长，默认2500ms
   */
  static showWarning(message, duration = 2500) {
    wx.showToast({
      title: message,
      icon: 'none',
      duration: duration,
      image: '/images/warning.png' // 如果有警告图标
    });
  }

  /**
   * 显示加载提示
   * @param {string} message - 加载消息，默认"加载中..."
   */
  static showLoading(message = '加载中...') {
    wx.showLoading({
      title: message,
      mask: true
    });
  }

  /**
   * 隐藏加载提示
   */
  static hideLoading() {
    wx.hideLoading();
  }

  /**
   * 显示确认对话框
   * @param {Object} options - 对话框选项
   * @param {string} options.title - 标题
   * @param {string} options.content - 内容
   * @param {string} options.confirmText - 确认按钮文本
   * @param {string} options.cancelText - 取消按钮文本
   * @returns {Promise} 返回用户选择结果
   */
  static showConfirm(options = {}) {
    const {
      title = '提示',
      content = '',
      confirmText = '确定',
      cancelText = '取消'
    } = options;

    return new Promise((resolve) => {
      wx.showModal({
        title,
        content,
        confirmText,
        cancelText,
        success: (res) => {
          resolve(res.confirm);
        },
        fail: () => {
          resolve(false);
        }
      });
    });
  }

  /**
   * 处理网络请求错误
   * @param {Object} error - 错误对象
   * @param {string} defaultMessage - 默认错误消息
   */
  static handleNetworkError(error, defaultMessage = '网络请求失败，请检查网络连接') {
    console.error('网络请求错误:', error);

    let message = defaultMessage;

    if (error.errMsg) {
      if (error.errMsg.includes('timeout')) {
        message = '请求超时，请稍后重试';
      } else if (error.errMsg.includes('fail')) {
        message = '网络连接失败，请检查网络设置';
      }
    }

    this.showError(message);
  }

  /**
   * 处理API响应错误
   * @param {Object} response - API响应对象
   * @param {string} defaultMessage - 默认错误消息
   */
  static handleApiError(response, defaultMessage = '操作失败，请稍后重试') {
    console.error('API响应错误:', response);

    let message = defaultMessage;

    if (response && response.data && response.data.message) {
      message = response.data.message;
    } else if (response && response.errMsg) {
      message = response.errMsg;
    }

    this.showError(message);
  }

  /**
   * 处理表单验证错误
   * @param {string} fieldName - 字段名称
   * @param {string} errorMessage - 错误消息
   */
  static handleValidationError(fieldName, errorMessage) {
    const message = `${fieldName}${errorMessage}`;
    this.showWarning(message);
  }

  /**
   * 处理权限错误
   * @param {string} message - 权限错误消息
   */
  static handlePermissionError(message = '权限不足，无法执行此操作') {
    this.showError(message);
  }

  /**
   * 处理未知错误
   * @param {Error} error - 错误对象
   */
  static handleUnknownError(error) {
    console.error('未知错误:', error);
    this.showError('发生未知错误，请稍后重试');
  }
}

module.exports = ErrorHandler;