export type AppLocale = 'fr' | 'ar'
export const DEFAULT_LOCALE: AppLocale = 'fr'
export const SUPPORTED_LOCALES: AppLocale[] = ['fr', 'ar']

export function isRtlLocale(locale: string | undefined): boolean {
  return locale === 'ar'
}

export function formatCurrencyDA(amount: number, locale: string = 'fr'): string {
  const rounded = Math.round(amount * 100) / 100
  const formattedNumber = rounded.toLocaleString(locale === 'ar' ? 'ar-DZ' : 'fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })
  return locale === 'ar' ? `${formattedNumber} د.ج` : `${formattedNumber} DA`
}

export const formatDA = formatCurrencyDA

export function formatDateStr(isoStr: string | undefined | null, locale: string = 'fr'): string {
  if (!isoStr) return ''
  try {
    const d = new Date(isoStr)
    if (isNaN(d.getTime())) return isoStr
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    return `${day}/${month}/${year}`
  } catch {
    return isoStr
  }
}
