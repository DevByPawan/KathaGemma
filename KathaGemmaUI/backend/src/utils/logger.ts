type LogLevel = 'info' | 'warn' | 'error' | 'debug';

class Logger {
  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level.toUpperCase()}]: ${message}`;
  }

  info(message: string, ...args: unknown[]) {
    console.log(this.formatMessage('info', message), ...args);
  }

  warn(message: string, ...args: unknown[]) {
    console.warn(this.formatMessage('warn', message), ...args);
  }

  error(message: string, error?: unknown) {
    console.error(this.formatMessage('error', message));
    if (error) {
      console.error(error);
    }
  }

  debug(message: string, ...args: unknown[]) {
    if (process.env.NODE_ENV === 'development') {
      console.log(this.formatMessage('debug', message), ...args);
    }
  }
}

export const logger = new Logger();
