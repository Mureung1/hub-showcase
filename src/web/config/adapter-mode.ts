export type AdapterMode = 'mock' | 'hybrid' | 'real';
export function getAdapterMode(options: { enforceProduction?: boolean } = { enforceProduction: true }): AdapterMode {
  const value = process.env.CORE_ADAPTER_MODE ?? 'mock';
  if (value !== 'mock' && value !== 'hybrid' && value !== 'real') throw new Error('Invalid CORE_ADAPTER_MODE');
  if (options.enforceProduction !== false && process.env.NODE_ENV === 'production' && value !== 'real') throw new Error('Production requires CORE_ADAPTER_MODE=real');
  return value;
}
