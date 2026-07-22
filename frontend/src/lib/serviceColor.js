const SERVICE_COLOR_PALETTE = [
  'var(--service-sky)',
  'var(--service-lavender)',
  'var(--service-coral)',
  'var(--service-mustard)',
  'var(--service-rose)',
  'var(--service-teal)',
  'var(--service-plum)',
  'var(--service-sand)',
]

export function getServiceColor(serviceName) {
  let hash = 0
  for (let i = 0; i < serviceName.length; i++) {
    hash = (hash * 31 + serviceName.charCodeAt(i)) | 0
  }

  const index = Math.abs(hash) % SERVICE_COLOR_PALETTE.length
  return SERVICE_COLOR_PALETTE[index]
}
