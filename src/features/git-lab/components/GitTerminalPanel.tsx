import { type FormEvent, useState } from 'react'
import styles from './GitTerminalPanel.module.css'

export type TerminalLog = {
  id: string
  kind: 'command' | 'success' | 'error' | 'info'
  text: string
}

export type MistakeAction = {
  command: string
  reason: string
  saved: boolean
  onSave: () => void
}

type GitTerminalPanelProps = {
  logs: TerminalLog[]
  mistakeAction?: MistakeAction | null
  onCommand: (command: string) => void
}

export default function GitTerminalPanel({ logs, mistakeAction, onCommand }: GitTerminalPanelProps) {
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

      {mistakeAction ? (
        <div className={styles.mistakeAction}>
          <div>
            <strong>최근 실패 명령</strong>
            <p>
              <code>{mistakeAction.command}</code> · {mistakeAction.reason}
            </p>
          </div>
          <button type="button" disabled={mistakeAction.saved} onClick={mistakeAction.onSave}>
            {mistakeAction.saved ? '저장됨' : '오답노트에 추가'}
          </button>
        </div>
      ) : null}

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
