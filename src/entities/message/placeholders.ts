const placeholderPattern = /(\[[^\]]+\]|OO)/gu
const firstPlaceholderPattern = /(\[[^\]]+\]|OO)/u

export type PlaceholderRange = {
  start: number
  end: number
}

export const isPlaceholder = (value: string) => /^\[[^\]]+\]$/u.test(value) || value === 'OO'

export const hasPlaceholder = (value: string) => /(\[[^\]]+\]|OO)/u.test(value)

export const splitPlaceholderText = (value: string) => value.split(placeholderPattern)

export const findFirstPlaceholderRange = (value: string): PlaceholderRange | null => {
  const match = firstPlaceholderPattern.exec(value)
  if (!match) return null

  return {
    start: match.index,
    end: match.index + match[0].length,
  }
}
