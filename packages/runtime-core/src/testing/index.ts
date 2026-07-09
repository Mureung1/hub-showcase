export async function waitForRuntimeCondition<T>(
  read: () => T | Promise<T>,
  predicate: (value: T) => boolean,
  options: {
    timeoutMs?: number
    failureMessage?: string
  } = {},
): Promise<T> {
  const deadline = Date.now() + (options.timeoutMs ?? 1000)

  while (Date.now() < deadline) {
    const value = await read()

    if (predicate(value)) {
      return value
    }

    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0)
    })
  }

  throw new Error(
    options.failureMessage ?? 'expected runtime condition was not observed',
  )
}
