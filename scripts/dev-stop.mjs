import { execSync } from 'node:child_process'
import process from 'node:process'

const isWindows = process.platform === 'win32'
const ports = [
  { label: 'frontend', port: 5173 },
  { label: 'preview', port: 5174 },
  { label: 'backend', port: Number(process.env.PORT || process.env.CURRICULUM_AGENT_PORT || 8787) },
]

let stoppedAny = false

for (const { label, port } of ports) {
  const pids = findPidsOnPort(port)

  if (pids.length === 0) {
    console.log(`[dev:stop] ${label} (port ${port}): not running`)
    continue
  }

  for (const pid of pids) {
    killPid(pid)
    console.log(`[dev:stop] ${label} (port ${port}): stopped pid ${pid}`)
    stoppedAny = true
  }
}

if (!stoppedAny) {
  console.log('[dev:stop] nothing was running')
}

function findPidsOnPort(port) {
  try {
    if (isWindows) {
      const output = execSync(`netstat -ano`, { encoding: 'utf8' })
      const pids = new Set()

      for (const line of output.split('\n')) {
        const match = line.match(/:(\d+)\s+.*LISTENING\s+(\d+)/)
        if (match && Number(match[1]) === port) {
          pids.add(match[2])
        }
      }

      return [...pids]
    }

    const output = execSync(`lsof -ti tcp:${port}`, { encoding: 'utf8' })

    return output
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
  } catch {
    return []
  }
}

function killPid(pid) {
  try {
    if (isWindows) {
      execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' })
    } else {
      execSync(`kill -9 ${pid}`, { stdio: 'ignore' })
    }
  } catch {
    // Process may have already exited between lookup and kill.
  }
}
