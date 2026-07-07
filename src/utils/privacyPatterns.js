const privacyPatterns = [
  {
    type: 'email',
    pattern: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
  },
  {
    type: 'phone',
    pattern: /(?:\+?\d{1,3}[-.\s]?)?(?:0\d{1,2}[-.\s]?)?\d{3,4}[-.\s]?\d{4}/,
  },
  {
    type: 'resident_registration_number',
    pattern: /\b\d{6}[-\s]?[1-4]\d{6}\b/,
  },
]

export function detectPrivacyPatterns(text) {
  if (!text) {
    return []
  }

  return privacyPatterns
    .filter(({ pattern }) => pattern.test(text))
    .map(({ type }) => type)
}
