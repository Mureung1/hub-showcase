export function createInMemoryProfileRepository(initialProfile = null) {
  let profile = initialProfile

  return {
    async get() {
      return profile
    },
    async save(nextProfile) {
      profile = nextProfile
      return profile
    },
    async remove() {
      profile = null
    },
  }
}
