export function ok<TData>(data: TData) {
  return { data }
}

export function fail(status: number, message: string) {
  return {
    error: {
      status,
      message,
    },
  }
}
