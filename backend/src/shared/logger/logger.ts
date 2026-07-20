type LogMeta = Record<string, unknown>

function write(level: 'info' | 'warn' | 'error', message: string, meta?: LogMeta) {
  const log = {
    level,
    message,
    ...(meta ? { meta } : {}),
    timestamp: new Date().toISOString(),
  }

  const line = JSON.stringify(log)

  if (level === 'error') {
    console.error(line)
    return
  }

  if (level === 'warn') {
    console.warn(line)
    return
  }

  console.log(line)
}

export const logger = {
  info(message: string, meta?: LogMeta) {
    write('info', message, meta)
  },
  warn(message: string, meta?: LogMeta) {
    write('warn', message, meta)
  },
  error(message: string, meta?: LogMeta) {
    write('error', message, meta)
  },
}
