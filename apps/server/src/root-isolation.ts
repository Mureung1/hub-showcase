import path from 'node:path'

export function rootsAreDisjoint(roots: readonly string[]): boolean {
  for (let left = 0; left < roots.length; left += 1) {
    for (let right = left + 1; right < roots.length; right += 1) {
      const leftRoot = roots[left] as string
      const rightRoot = roots[right] as string
      if (
        isSameOrAncestor(leftRoot, rightRoot) ||
        isSameOrAncestor(rightRoot, leftRoot)
      ) {
        return false
      }
    }
  }
  return true
}

function isSameOrAncestor(parent: string, child: string): boolean {
  const relative = path.relative(parent, child)
  return (
    relative === '' ||
    (relative !== '..' && !relative.startsWith(`..${path.sep}`))
  )
}
