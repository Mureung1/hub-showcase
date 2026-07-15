(function (window, document) {
  function createStatusController(elementId) {
    const element = document.getElementById(elementId)

    return {
      set(message) {
        if (element) element.textContent = message
      },
    }
  }

  window.BundlerStatus = {
    createStatusController,
  }
})(window, document)
