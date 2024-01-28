export const percentString = (value: number, lang?: string): string =>
  new Intl.NumberFormat(lang, {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(value)

interface ErrorLike {
  message: string
}

export const isErrorLike = (v: unknown): v is ErrorLike => {
  if (!v) return false
  if (typeof v === 'object') {
    return 'message' in v && typeof v['message'] == 'string'
  }
  return false
}
