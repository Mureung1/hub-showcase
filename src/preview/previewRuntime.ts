import type { ComponentType } from 'react'

export type PreviewRuntimeModules = Record<string, unknown>

export function evaluatePreviewModule(code: string, modules: PreviewRuntimeModules): ComponentType {
  const module = { exports: {} as Record<string, unknown> }

  function requirePreviewModule(specifier: string) {
    if (!(specifier in modules)) {
      throw new Error(`Preview에서 지원하지 않는 모듈입니다: ${specifier}`)
    }

    return modules[specifier]
  }

  const execute = new Function('require', 'module', 'exports', `"use strict";\n${code}`)
  execute(requirePreviewModule, module, module.exports)

  const component = module.exports.default
  if (typeof component !== 'function' && typeof component !== 'object') {
    throw new Error('기본 export React 컴포넌트를 찾지 못했습니다.')
  }

  return component as ComponentType
}
