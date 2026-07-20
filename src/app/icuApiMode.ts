export type IcuApiMode = 'mock' | 'server'

export function resolveIcuApiMode(value = import.meta.env.VITE_ICU_API_MODE): IcuApiMode {
  return value === 'server' ? 'server' : 'mock'
}

export function shouldUseServerApi(value = import.meta.env.VITE_ICU_API_MODE) {
  return resolveIcuApiMode(value) === 'server'
}