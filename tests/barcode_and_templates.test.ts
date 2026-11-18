import { describe, it, expect } from 'vitest'
import { generateBarcodeSvg } from '../electron/services/barcodeGenerator'
import { formatCurrencyDA, formatDateStr, isRtlLocale } from '../shared/locales'
import { isNewerVersion } from '../shared/updates'

describe('Barcode Generator Service', () => {
  it('generates valid vector SVG for Code 128 barcodes', () => {
    const svg = generateBarcodeSvg('MIC-2055516-E')
    expect(svg).toContain('<svg')
    expect(svg).toContain('viewBox=')
    expect(svg).toContain('<rect')
    expect(svg).toContain('</svg>')
  })

  it('encodes numeric and alphanumeric barcodes properly', () => {
    const svg1 = generateBarcodeSvg('1234567890128')
    const svg2 = generateBarcodeSvg('CON-1956515-A')
    expect(svg1).toBeTruthy()
    expect(svg2).toBeTruthy()
    expect(svg1).not.toEqual(svg2)
  })
})

describe('Locales & Formatting', () => {
  it('formats Algerian Dinars in FR and AR correctly', () => {
    const daFr = formatCurrencyDA(14500, 'fr')
    const daAr = formatCurrencyDA(14500, 'ar')
    expect(daFr).toContain('14')
    expect(daFr).toContain('500')
    expect(daFr).toContain('DA')
    expect(daAr).toContain('د.ج')
  })

  it('detects RTL for Arabic locale', () => {
    expect(isRtlLocale('ar')).toBe(true)
    expect(isRtlLocale('fr')).toBe(false)
  })

  it('formats dates in DD/MM/YYYY format', () => {
    const formatted = formatDateStr('2024-11-18T14:30:00Z', 'fr')
    expect(formatted).toBe('18/11/2024')
  })
})

describe('Update Version Comparison', () => {
  it('detects major, minor, and patch newer versions', () => {
    expect(isNewerVersion('1.0.0', '1.0.1')).toBe(true)
    expect(isNewerVersion('1.0.0', '1.1.0')).toBe(true)
    expect(isNewerVersion('1.0.0', '2.0.0')).toBe(true)
    expect(isNewerVersion('1.0.0', '1.0.0')).toBe(false)
    expect(isNewerVersion('1.2.0', '1.1.9')).toBe(false)
  })
})
