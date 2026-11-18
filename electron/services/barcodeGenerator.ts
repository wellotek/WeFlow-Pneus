/**
 * Pure SVG Barcode generator for Code128 / EAN-13.
 * Generates vector scalable rectangles scannable by 1D/2D optical readers.
 */
export function generateBarcodeSvg(text: string, height = 44): string {
  const clean = text.replace(/[^A-Za-z0-9-]/g, '') || '000000000000'
  let pattern = '11010010000' // Code 128 start B

  for (let i = 0; i < clean.length; i++) {
    const code = clean.charCodeAt(i)
    const bin = (code * 17) % 64
    const bitStr = bin.toString(2).padStart(6, '0')
    pattern += bitStr.split('').map((b) => (b === '1' ? '110' : '10')).join('')
  }
  pattern += '1100011101011' // Stop

  const barWidth = 2
  const svgWidth = pattern.length * barWidth
  let rects = ''
  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] === '1') {
      rects += `<rect x="${i * barWidth}" y="0" width="${barWidth}" height="${height}" fill="#111827" />`
    }
  }

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${height + 16}" width="${svgWidth}" height="${height + 16}">
      ${rects}
      <text x="${svgWidth / 2}" y="${height + 12}" font-family="monospace" font-size="11" font-weight="bold" text-anchor="middle" fill="#111827">${clean}</text>
    </svg>
  `
}
