(function (window) {
  const FONT_MIME = /^(font[/]|application[/](x-)?font-|application[/]vnd\.ms-fontobject)/i
  const MIME_TOKEN = /^[\w.+-]+[/][\w.+-]+$/

  async function unpackAssets(manifest) {
    const blobUrls = {}
    const resourceBlobs = {}
    const uuids = Object.keys(manifest)

    await Promise.all(
      uuids.map(async (uuid) => {
        const entry = manifest[uuid]

        try {
          const bytes = decodeBase64(entry.data)
          const finalBytes = entry.compressed ? await decompressGzip(bytes, uuid) : bytes

          if (isFontMime(entry.mime)) {
            blobUrls[uuid] = createFontDataUrl(entry, finalBytes)
            return
          }

          const blob = new Blob([finalBytes], { type: entry.mime })
          blobUrls[uuid] = URL.createObjectURL(blob)
          resourceBlobs[blobUrls[uuid]] = blob
        } catch (error) {
          console.error(`Failed to decode asset ${uuid}:`, error)

          const blob = new Blob([], { type: entry.mime })
          blobUrls[uuid] = URL.createObjectURL(blob)
          resourceBlobs[blobUrls[uuid]] = blob
        }
      }),
    )

    return {
      blobUrls,
      resourceBlobs,
      uuids,
    }
  }

  function decodeBase64(data) {
    const binary = atob(data)
    const bytes = new Uint8Array(binary.length)

    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i)
    }

    return bytes
  }

  async function decompressGzip(bytes, uuid) {
    if (typeof DecompressionStream === 'undefined') {
      console.warn(`DecompressionStream not available, asset ${uuid} may not render`)
      return bytes
    }

    const stream = new DecompressionStream('gzip')
    const writer = stream.writable.getWriter()
    const reader = stream.readable.getReader()

    writer.write(bytes)
    writer.close()

    const chunks = []
    let totalLength = 0

    while (true) {
      const { done, value } = await reader.read()

      if (done) break

      chunks.push(value)
      totalLength += value.length
    }

    const output = new Uint8Array(totalLength)
    let offset = 0

    for (const chunk of chunks) {
      output.set(chunk, offset)
      offset += chunk.length
    }

    return output
  }

  function isFontMime(mime) {
    return FONT_MIME.test(mime) && MIME_TOKEN.test(mime)
  }

  function createFontDataUrl(entry, finalBytes) {
    const base64 = entry.compressed ? window.BundlerEncoding.toBase64(finalBytes) : entry.data

    return `data:${entry.mime};base64,${base64}`
  }

  window.BundlerAssets = {
    unpackAssets,
  }
})(window)
