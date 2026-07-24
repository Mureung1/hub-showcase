export function createInMemoryGeneratedCurriculumRepository(initialSnapshot = null) {
  const snapshots = new Map()

  if (initialSnapshot) {
    const id = initialSnapshot.id || initialSnapshot.plan?.id || `${initialSnapshot.goal}-curriculum-plan`
    snapshots.set(id, { ...initialSnapshot, id })
  }

  return {
    getLatest() {
      const items = Array.from(snapshots.values())
      if (items.length === 0) {
        return null
      }

      return items.sort(
        (a, b) => new Date(b.updatedAt || b.generatedAt).getTime() - new Date(a.updatedAt || a.generatedAt).getTime(),
      )[0]
    },
    list() {
      return Array.from(snapshots.values()).sort(
        (a, b) => new Date(b.updatedAt || b.generatedAt).getTime() - new Date(a.updatedAt || a.generatedAt).getTime(),
      )
    },
    getById(id) {
      return snapshots.get(id) ?? null
    },
    save(snapshot) {
      const now = new Date().toISOString()
      const record = {
        id: snapshot.id || snapshot.plan?.id || `${snapshot.goal}-curriculum-plan`,
        goal: snapshot.goal,
        plan: snapshot.plan,
        generatedAt: snapshot.generatedAt || snapshot.createdAt || now,
        updatedAt: snapshot.updatedAt || now,
      }

      snapshots.set(record.id, record)
      return record
    },
    delete(id) {
      return snapshots.delete(id)
    },
    reset() {
      snapshots.clear()
    },
  }
}
