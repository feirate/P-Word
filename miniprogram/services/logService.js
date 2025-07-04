/**
 * P-Word 日志服务
 * 提供统一的日志记录功能，支持不同级别的日志输出
 */

class LogService {
  constructor() {
    this.logLevel = 'warn' // 可选: 'error', 'warn', 'info', 'debug'
    this.enableConsole = true
    this.logs = []
    this.maxLogSize = 100
  }

  /**
   * 格式化日志消息
   * @param {string} level 日志级别
   * @param {string} module 模块名
   * @param {string} message 消息
   * @param {any} data 附加数据
   */
  formatMessage(level, module, message, data) {
    const timestamp = new Date().toISOString().substring(11, 23) // HH:mm:ss.SSS
    const prefix = `[${timestamp}] [${level.toUpperCase()}] [${module}]`
    
    if (data !== undefined) {
      return `${prefix} ${message}`, data
    } else {
      return `${prefix} ${message}`
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
    if (!this.enableConsole) return

    const formatted = this.formatMessage(level, module, message, data)
    
    switch (level) {
      case 'error':
        if (data !== undefined) {
          console.error(formatted[0], formatted[1])
        } else {
          console.error(formatted)
        }
        break
      case 'warn':
        if (data !== undefined) {
          console.warn(formatted[0], formatted[1])
        } else {
          console.warn(formatted)
        }
        break
      case 'info':
        if (data !== undefined) {
          console.log(formatted[0], formatted[1])
        } else {
          console.log(formatted)
        }
        break
      case 'debug':
        if (data !== undefined) {
          console.log(formatted[0], formatted[1])
        } else {
          console.log(formatted)
        }
        break
      default:
        if (data !== undefined) {
          console.log(formatted[0], formatted[1])
        } else {
          console.log(formatted)
        }
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
    this.logLevel = level
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