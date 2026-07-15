(function (window, document) {
  function installErrorSink() {
    window.addEventListener('error', handleError, true)
  }

  function handleError(event) {
    if (isResourceLoadError(event)) {
      console.warn(
        '[bundle] resource failed to load:',
        event.target.tagName,
        String(event.target.src || event.target.href || ''),
      )
      return
    }

    renderError(formatError(event))
  }

  function isResourceLoadError(event) {
    return !event.message && !event.error && event.target && event.target !== window
  }

  function formatError(event) {
    const location = event.filename ? ` (${event.filename.slice(0, 60)}:${event.lineno})` : ''

    return `[bundle] ${event.message || event.type}${location}`
  }

  function renderError(message) {
    const parent = document.body || document.documentElement
    const panel = document.getElementById('__bundler_err') || parent.appendChild(document.createElement('div'))

    panel.id = '__bundler_err'
    panel.style.cssText =
      'position:fixed;bottom:12px;left:12px;right:12px;font:12px/1.4 ui-monospace,monospace;background:#2a1215;color:#ff8a80;padding:10px 14px;border-radius:8px;border:1px solid #5c2b2e;z-index:99999;white-space:pre-wrap;max-height:40vh;overflow:auto'
    panel.textContent = (panel.textContent ? `${panel.textContent}\n` : '') + message
  }

  window.BundlerErrors = {
    installErrorSink,
  }
})(window, document)
