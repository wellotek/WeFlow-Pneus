import fs from 'node:fs'
import path from 'node:path'
import { app, dialog } from 'electron'
import { savePdf } from './printService'
import type { StoreProfile } from '@shared/types'

function sanitizeCsvCell(cell: string | number | null | undefined): string {
  if (cell === null || cell === undefined) return '""'
  let str = String(cell).trim()
  // Formula injection defense (CVE-2014-3524 / OWASP CSV Injection)
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`
  }
  // Escape quotes
  str = str.replace(/"/g, '""')
  return `"${str}"`
}

export async function exportToCsv(
  defaultFilename: string,
  headers: string[],
  rows: (string | number)[][]
): Promise<{ cancelled: boolean; path?: string }> {
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Exporter en fichier CSV (Excel)',
    defaultPath: path.join(app.getPath('documents'), `${defaultFilename.replace(/[^a-zA-Z0-9_-]/g, '_')}.csv`),
    filters: [{ name: 'Fichier CSV (séparateur point-virgule)', extensions: ['csv'] }]
  })

  if (canceled || !filePath) {
    return { cancelled: true }
  }

  // UTF-8 BOM + semicolon-separated lines
  const bom = '\uFEFF'
  const headerLine = headers.map(sanitizeCsvCell).join(';')
  const dataLines = rows.map((row) => row.map(sanitizeCsvCell).join(';'))
  const csvContent = bom + [headerLine, ...dataLines].join('\r\n')

  fs.writeFileSync(filePath, csvContent, { encoding: 'utf8' })
  return { cancelled: false, path: filePath }
}

export async function exportToListPdf(
  title: string,
  columns: { header: string; dataKey: string }[],
  rows: any[],
  profile: StoreProfile,
  options?: { isRtl?: boolean; summaryNotes?: string }
): Promise<{ cancelled: boolean; path?: string }> {
  const isRtl = options?.isRtl || false
  const now = new Date()
  const dateStr = now.toLocaleDateString(isRtl ? 'ar-DZ' : 'fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

  const tableHeaders = columns
    .map((col) => `<th class="py-2.5 px-3 bg-[#172235] text-white font-bold text-xs uppercase">${col.header}</th>`)
    .join('')

  const tableRows = rows
    .map((row, idx) => {
      const bg = idx % 2 === 0 ? 'bg-white' : 'bg-[#F9FAFB]'
      const cells = columns
        .map((col) => {
          const val = row[col.dataKey] ?? ''
          return `<td class="py-2 px-3 border-b border-[#E5E7EB] text-xs text-[#111827]">${val}</td>`
        })
        .join('')
      return `<tr class="${bg}">${cells}</tr>`
    })
    .join('')

  const html = `
    <!DOCTYPE html>
    <html lang="${isRtl ? 'ar' : 'fr'}" dir="${isRtl ? 'rtl' : 'ltr'}">
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      <style>
        @page {
          size: A4 landscape;
          margin: 12mm 10mm 15mm 10mm;
          @bottom-center {
            content: "Page " counter(page) " / " counter(pages);
            font-size: 8pt;
            color: #667085;
          }
        }
        body {
          font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
          color: #111827;
          margin: 0;
          padding: 0;
          background: #FFF;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid #F5BD18;
          padding-bottom: 12px;
          margin-bottom: 14px;
        }
        .brand-title {
          font-size: 18pt;
          font-weight: 900;
          color: #172235;
          margin: 0;
        }
        .brand-sub {
          font-size: 9pt;
          color: #667085;
          margin-top: 2px;
        }
        .doc-title {
          font-size: 15pt;
          font-weight: 800;
          color: #F5BD18;
          text-align: ${isRtl ? 'left' : 'right'};
        }
        .meta-info {
          font-size: 8.5pt;
          color: #667085;
          margin-top: 3px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 8px;
        }
        th, td {
          text-align: ${isRtl ? 'right' : 'left'};
        }
        .footer-note {
          margin-top: 15px;
          font-size: 8.5pt;
          color: #667085;
          border-top: 1px solid #E5E7EB;
          padding-top: 8px;
          display: flex;
          justify-content: space-between;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="brand-title">${profile.store_name || 'WeFlow Pneus ERP'}</div>
          <div class="brand-sub">${profile.address || ''} • Tél: ${profile.phone || ''}</div>
        </div>
        <div style="text-align: ${isRtl ? 'left' : 'right'};">
          <div class="doc-title">${title}</div>
          <div class="meta-info">Édité le ${dateStr} • Total lignes: ${rows.length}</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>${tableHeaders}</tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>

      ${
        options?.summaryNotes
          ? `<div class="footer-note"><span>${options.summaryNotes}</span><span>WeFlow Pneus ERP</span></div>`
          : `<div class="footer-note"><span>Document officiel généré par WeFlow Pneus ERP</span><span>Page 1</span></div>`
      }
    </body>
    </html>
  `

  const safeFilename = `${title.replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}.pdf`
  return savePdf(html, safeFilename, 'A4')
}
