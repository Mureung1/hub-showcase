export function createInMemoryGeneratedCurriculumRepository(initialSnapshot = null) {
  let storedSnapshot = initialSnapshot

  return {
    getLatest() {
      return storedSnapshot
    },
    save(snapshot) {
      storedSnapshot = snapshot
      return storedSnapshot
    },
    reset() {
      storedSnapshot = null
    },
  }
}
