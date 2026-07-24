export function assertSupportedReactPreviewImports(code) {
  const importPattern = /import\s+(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"];?/g

  for (const match of code.matchAll(importPattern)) {
    const specifier = match[1]
    const isReactImport = specifier === 'react' || specifier.startsWith('react/')
    const isCssImport = specifier.endsWith('.css')

    if (!isReactImport && !isCssImport) {
      throw new Error(`MVP Preview에서 지원하지 않는 import입니다: ${specifier}`)
    }
  }
}
