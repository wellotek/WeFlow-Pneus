import fs from 'node:fs'
import path from 'node:path'

export interface Logger {
  info(message: string, meta?: Record<string, unknown>): void
  warn(message: string, meta?: Record<string, unknown>): void
  error(message: string, meta?: Record<string, unknown>): void
}

export class FileAndConsoleLogger implements Logger {
  private logPath?: string

  constructor(userDataDir?: string) {
    if (userDataDir) {
      try {
        fs.mkdirSync(userDataDir, { recursive: true })
        this.logPath = path.join(userDataDir, 'weflow-pneus.log')
      } catch {
        // console fallback
      }
    }
  }

  private write(level: 'INFO' | 'WARN' | 'ERROR', message: string, meta?: Record<string, unknown>) {
    const timestamp = new Date().toISOString()
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : ''
    const line = `[${timestamp}] [${level}] ${message}${metaStr}`

    if (level === 'ERROR') {
      console.error(line)
    } else if (level === 'WARN') {
      console.warn(line)
    } else {
      console.log(line)
    }

    if (this.logPath) {
      try {
        fs.appendFileSync(this.logPath, line + '\n', 'utf8')
      } catch {
        // ignore
      }
    }
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.write('INFO', message, meta)
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.write('WARN', message, meta)
  }

  error(message: string, meta?: Record<string, unknown>): void {
    this.write('ERROR', message, meta)
  }
}
