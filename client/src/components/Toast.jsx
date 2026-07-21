import { useEffect } from "react"

const AUTO_DISMISS_MS = 3000

export default function Toast({ message, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, AUTO_DISMISS_MS)
    return () => clearTimeout(timer)
  }, [onDismiss])

  return (
    <div className="save-toast" role="status">
      {message}
    </div>
  )
}
