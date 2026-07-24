import { spawn } from 'node:child_process'
import process from 'node:process'

const isWindows = process.platform === 'win32'
const env = {
  ...process.env,
  VITE_ICU_API_MODE: process.env.VITE_ICU_API_MODE ?? 'server',
  VITE_CURRICULUM_RECOMMENDATION_MODE: process.env.VITE_CURRICULUM_RECOMMENDATION_MODE ?? 'server',
}

const processes = [
  startProcess('backend', ['run', 'server:curriculum']),
  startProcess('frontend', ['run', 'dev']),
  startProcess('preview', ['run', 'dev:preview']),
]
let shuttingDown = false

function startProcess(label, npmArgs) {
  const command = isWindows ? (process.env.ComSpec ?? 'cmd.exe') : 'npm'
  const args = isWindows ? ['/d', '/s', '/c', ['npm', ...npmArgs].join(' ')] : npmArgs
  const child = spawn(command, args, {
    env,
    stdio: 'inherit',
    shell: false,
  })

  child.on('exit', (code, signal) => {
    if (shuttingDown) return

    const reason = signal ? `signal ${signal}` : `code ${code ?? 0}`
    console.error(`[dev:${label}] exited with ${reason}`)
    shutdown(code ?? 1)
  })

  child.on('error', (error) => {
    if (shuttingDown) return

    console.error(`[dev:${label}] failed to start: ${error.message}`)
    shutdown(1)
  })

  return child
}

function shutdown(exitCode = 0) {
  shuttingDown = true

  for (const child of processes) {
    if (!child.killed && child.exitCode === null) {
      child.kill(isWindows ? 'SIGTERM' : 'SIGINT')
    }
  }

  process.exitCode = exitCode
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))
