const SESSION_KEY = 'reviewAssistantSessionId'

export function getSessionId() {
  return localStorage.getItem(SESSION_KEY)
}

export function setSessionId(id) {
  localStorage.setItem(SESSION_KEY, id)
}
