/**
 * P-Word 日志服务
 * 提供统一的日志记录功能，支持不同级别的日志输出
 */

class LogService {
  constructor() {
    this.logLevels = { 'error': 0, 'warn': 1, 'info': 2, 'debug': 3 };
    this.currentLogLevel = 'warn'; // 默认为 'warn'
    this.enableConsole = true;
    this.logs = [];
    this.maxLogSize = 100;
  }

  /**
   * 格式化日志消息
   * @param {string} level 日志级别
   * @param {string} module 模块名
   * @param {string} message 消息
   * @param {any} data 附加数据
   */
  formatMessage(level, module, message, data) {
    const timestamp = new Date().toISOString().substring(11, 23); // HH:mm:ss.SSS
    const prefix = `[${timestamp}] [${level.toUpperCase()}] [${module}]`;
    
    if (data !== undefined) {
      return [`${prefix} ${message}`, data]; // 修正：返回一个数组
    } else {
      return [`${prefix} ${message}`]; // 修正：返回一个数组
    }
  }

  /**
   * 输出日志到控制台
   * @param {string} level 日志级别
   * @param {string} module 模块名
   * @param {string} message 消息
   * @param {any} data 附加数据
   */
  output(level, module, message, data) {
    if (!this.enableConsole || this.logLevels[level] > this.logLevels[this.currentLogLevel]) {
      return; // 关键修复：根据日志级别过滤
    }

    const formatted = this.formatMessage(level, module, message, data);
    
    switch (level) {
      case 'error':
        console.error(...formatted);
        break;
      case 'warn':
        console.warn(...formatted);
        break;
      case 'info':
        console.log(...formatted);
        break;
      case 'debug':
        console.debug(...formatted); // 使用 console.debug
        break;
      default:
        console.log(...formatted);
    }
  }

  /**
   * 错误级别日志
   * @param {string} module 模块名
   * @param {string} message 消息
   * @param {any} data 附加数据
   */
  error(module, message, data) {
    this.output('error', module, message, data)
  }

  /**
   * 警告级别日志
   * @param {string} module 模块名
   * @param {string} message 消息
   * @param {any} data 附加数据
   */
  warn(module, message, data) {
    this.output('warn', module, message, data)
  }

  /**
   * 信息级别日志
   * @param {string} module 模块名
   * @param {string} message 消息
   * @param {any} data 附加数据
   */
  info(module, message, data) {
    this.output('info', module, message, data)
  }

  /**
   * 调试级别日志
   * @param {string} module 模块名
   * @param {string} message 消息
   * @param {any} data 附加数据
   */
  debug(module, message, data) {
    this.output('debug', module, message, data)
  }

  /**
   * 设置日志级别
   * @param {string} level 日志级别
   */
  setLogLevel(level) {
    this.currentLogLevel = level;
  }

  /**
   * 启用/禁用控制台输出
   * @param {boolean} enable 是否启用
   */
  setConsoleOutput(enable) {
    this.enableConsole = enable
  }
}

// 创建全局日志服务实例
const logService = new LogService()

// 导出logger对象（保持与原代码的兼容性）
const logger = {
  error: (module, message, data) => logService.error(module, message, data),
  warn: (module, message, data) => logService.warn(module, message, data),
  info: (module, message, data) => logService.info(module, message, data),
  debug: (module, message, data) => logService.debug(module, message, data)
}

module.exports = {
  logService,
  logger
} 