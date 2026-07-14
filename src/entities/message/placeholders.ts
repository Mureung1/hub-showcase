const placeholderPattern = /(\[[^\]]+\]|OO)/gu

export const isPlaceholder = (value: string) => /^\[[^\]]+\]$/u.test(value) || value === 'OO'

export const hasPlaceholder = (value: string) => /(\[[^\]]+\]|OO)/u.test(value)

export const splitPlaceholderText = (value: string) => value.split(placeholderPattern)
