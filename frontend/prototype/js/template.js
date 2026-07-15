(function (window, document) {
  function buildResourceMap(extResources, blobUrls) {
    const resourceMap = {}

    for (const entry of extResources) {
      if (blobUrls[entry.uuid]) resourceMap[entry.id] = blobUrls[entry.uuid]
    }

    return resourceMap
  }

  async function renderTemplate(template, bundle) {
    const preparedTemplate = prepareTemplate(template, bundle)
    const parsedDocument = new DOMParser().parseFromString(preparedTemplate, 'text/html')

    document.documentElement.replaceWith(parsedDocument.documentElement)
    await reviveScripts(bundle.resourceBlobs)
    runBabelTransform()
  }

  function prepareTemplate(template, bundle) {
    let preparedTemplate = replaceAssetIds(template, bundle.uuids, bundle.blobUrls)
    preparedTemplate = stripResourceAttributes(preparedTemplate)

    return injectResourceScript(preparedTemplate, bundle.resourceMap)
  }

  function replaceAssetIds(template, uuids, blobUrls) {
    let output = template

    for (const uuid of uuids) {
      output = output.split(uuid).join(blobUrls[uuid])
    }

    return output
  }

  function stripResourceAttributes(template) {
    return template.replace(/\s+integrity="[^"]*"/gi, '').replace(/\s+crossorigin="[^"]*"/gi, '')
  }

  function injectResourceScript(template, resourceMap) {
    const headOpen = template.match(/<head[^>]*>/i)

    if (!headOpen) return template

    const script = `<script>window.__resources = ${JSON.stringify(resourceMap).replace(/<\//g, '<\\/')};</script>`
    const insertAt = headOpen.index + headOpen[0].length

    return template.slice(0, insertAt) + script + template.slice(insertAt)
  }

  async function reviveScripts(resourceBlobs) {
    const scripts = Array.from(document.scripts)

    for (const oldScript of scripts) {
      const script = document.createElement('script')

      for (const attribute of oldScript.attributes) {
        script.setAttribute(attribute.name, attribute.value)
      }

      script.textContent = oldScript.textContent
      await inlineBabelScript(script, resourceBlobs)

      const loaded = script.src
        ? new Promise((resolve) => {
            script.onload = resolve
            script.onerror = resolve
          })
        : null

      oldScript.replaceWith(script)
      if (loaded) await loaded
    }
  }

  async function inlineBabelScript(script, resourceBlobs) {
    const isBabelScript = script.type === 'text/babel' || script.type === 'text/jsx'

    if (!isBabelScript || !script.src) return

    const blob = resourceBlobs[script.src.split('#')[0]]
    script.textContent = blob ? await blob.text() : await (await fetch(script.src)).text()
    script.removeAttribute('src')
  }

  function runBabelTransform() {
    if (window.Babel && typeof window.Babel.transformScriptTags === 'function') {
      window.Babel.transformScriptTags()
    }
  }

  window.BundlerTemplate = {
    buildResourceMap,
    renderTemplate,
  }
})(window, document)
