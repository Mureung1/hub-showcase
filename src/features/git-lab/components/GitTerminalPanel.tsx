import { type FormEvent, useState } from 'react'
import styles from './GitTerminalPanel.module.css'

export type TerminalLog = {
  id: string
  kind: 'command' | 'success' | 'error' | 'info'
  text: string
}

type GitTerminalPanelProps = {
  logs: TerminalLog[]
  onCommand: (command: string) => void
}

export default function GitTerminalPanel({ logs, onCommand }: GitTerminalPanelProps) {
  const [command, setCommand] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!command.trim()) {
      return
    }

    onCommand(command)
    setCommand('')
  }

  return (
    <section className={styles.terminal} aria-label="Git 명령어 터미널">
      <header className={styles.windowHeader}>
        <div className={styles.trafficLights} aria-hidden="true">
          <span className={styles.closeButton} />
          <span className={styles.minimizeButton} />
          <span className={styles.maximizeButton} />
        </div>
        <span className={styles.windowTitle}>ICU Git Terminal</span>
      </header>

      <div className={styles.logList} role="log" aria-live="polite">
        {logs.map((log) => (
          <p className={`${styles.logLine} ${styles[log.kind]}`} key={log.id}>
            {log.kind === 'command' ? '$ ' : ''}
            {log.text}
          </p>
        ))}
      </div>

      <form className={styles.commandForm} onSubmit={handleSubmit}>
        <label className={styles.promptLabel} htmlFor="git-command-input">
          $
        </label>
        <input
          id="git-command-input"
          aria-label="Git 명령어 입력"
          autoComplete="off"
          className={styles.commandInput}
          onChange={(event) => setCommand(event.target.value)}
          placeholder="git commit"
          spellCheck={false}
          value={command}
        />
      </form>
    </section>
  )
}
