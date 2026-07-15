(function (window) {
  const CHUNK_SIZE = 0x8000

  function toBase64(bytes) {
    let binary = ''

    for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK_SIZE))
    }

    return btoa(binary)
  }

  window.BundlerEncoding = {
    toBase64,
  }
})(window)
