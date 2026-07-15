(function (window, document) {
  function markScriptEnabled() {
    if (document.body) document.body.classList.remove('no-js')
  }

  function getBundleData() {
    const manifest = window.__bundlerManifest || readJsonScript('__bundler/manifest')
    const extResources = window.__bundlerExtResources || readJsonScript('__bundler/ext_resources') || []
    const template = window.__bundlerTemplate || readJsonScript('__bundler/template')

    return {
      manifest,
      extResources,
      template,
    }
  }

  function readJsonScript(type) {
    const element = document.querySelector(`script[type="${type}"]`)

    return element ? JSON.parse(element.textContent) : null
  }

  async function init() {
    markScriptEnabled()

    const status = window.BundlerStatus.createStatusController('__bundler_loading')
    window.BundlerErrors.installErrorSink()

    try {
      const data = getBundleData()

      if (!data.manifest || !data.template) {
        status.set('Error: missing bundle data')
        console.error('[bundler] Missing bundle data')
        return
      }

      const uuids = Object.keys(data.manifest)
      status.set(`Unpacking ${uuids.length} assets...`)

      const bundle = await window.BundlerAssets.unpackAssets(data.manifest)
      bundle.resourceMap = window.BundlerTemplate.buildResourceMap(data.extResources, bundle.blobUrls)
      window.__resourceBlobs = bundle.resourceBlobs

      status.set('Rendering...')
      await window.BundlerTemplate.renderTemplate(data.template, bundle)
    } catch (error) {
      status.set(`Error unpacking: ${error.message}`)
      console.error('Bundle unpack error:', error)
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})(window, document)
