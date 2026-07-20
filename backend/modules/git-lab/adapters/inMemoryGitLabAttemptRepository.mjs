export function createInMemoryGitLabAttemptRepository(initialAttempts = []) {
  let attempts = [...initialAttempts]

  return {
    list() {
      return [...attempts]
    },
    save(attempt) {
      attempts = [attempt, ...attempts]

      return attempt
    },
    reset() {
      attempts = []
    },
  }
}