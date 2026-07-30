export type IcuApiMode = 'mock' | 'server'

export function resolveIcuApiMode(value?: string): IcuApiMode {
  const modeValue = arguments.length === 0 ? import.meta.env.VITE_ICU_API_MODE : value

  return modeValue === 'mock' ? 'mock' : 'server'
}

export function shouldUseServerApi(value?: string) {
  const modeValue = arguments.length === 0 ? import.meta.env.VITE_ICU_API_MODE : value

  return resolveIcuApiMode(modeValue) === 'server'
}
