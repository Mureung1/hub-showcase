export function apiUrl(path: string, baseUrl = import.meta.env.VITE_API_BASE_URL) {
  const normalizedPath = `/${path.replace(/^\/+/, '')}`

  if (!baseUrl) {
    return normalizedPath
  }

  return `${baseUrl.replace(/\/+$/, '')}${normalizedPath}`
}
