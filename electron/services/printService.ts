import { writeFile } from 'node:fs/promises'
import { BrowserWindow, dialog } from 'electron'

async function loadHtml(html: string): Promise<BrowserWindow> {
  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  })
  win.webContents.setZoomFactor(1.0)
  const url = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`
  await win.loadURL(url)
  return win
}

export type PageSizeOption = 'A4' | 'A5' | { width: number; height: number }

export async function printHtml(html: string, pageSize: PageSizeOption = 'A4', printerName?: string): Promise<void> {
  const win = await loadHtml(html)
  try {
    await new Promise<void>((resolve, reject) => {
      win.webContents.print(
        {
          silent: false,
          printBackground: true,
          pageSize,
          deviceName: printerName
        },
        (success, failureReason) => {
          if (!success && failureReason !== 'Print job was cancelled') {
            reject(new Error(`Impression échouée: ${failureReason}`))
          } else {
            resolve()
          }
        }
      )
    })
  } finally {
    win.close()
  }
}

export async function savePdf(
  html: string,
  filename: string,
  pageSize: PageSizeOption = 'A4'
): Promise<{ cancelled: true } | { cancelled: false; path: string }> {
  const defaultPath = filename.endsWith('.pdf') ? filename : `${filename}.pdf`
  const picked = await dialog.showSaveDialog({
    title: 'Exporter en PDF - WeFlow Pneus',
    defaultPath,
    filters: [{ name: 'Document PDF (*.pdf)', extensions: ['pdf'] }]
  })

  if (picked.canceled || !picked.filePath) return { cancelled: true }

  const win = await loadHtml(html)
  try {
    const data = await win.webContents.printToPDF({
      pageSize,
      printBackground: true,
      margins: {
        marginType: 'custom',
        top: 0.4,
        bottom: 0.4,
        left: 0.4,
        right: 0.4
      }
    })
    await writeFile(picked.filePath, data)
    return { cancelled: false, path: picked.filePath }
  } finally {
    win.close()
  }
}

export async function getAvailablePrinters(): Promise<string[]> {
  const win = new BrowserWindow({ show: false })
  try {
    const printers = await win.webContents.getPrintersAsync()
    return printers.map((p) => p.name)
  } finally {
    win.close()
  }
}
