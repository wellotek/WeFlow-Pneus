import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

export class MediaService {
  private baseDir: string

  constructor(userDataDir: string) {
    this.baseDir = path.join(userDataDir, 'media')
    this.ensureDirs()
  }

  private ensureDirs() {
    for (const sub of ['products', 'customers', 'vehicles']) {
      const p = path.join(this.baseDir, sub)
      if (!fs.existsSync(p)) {
        fs.mkdirSync(p, { recursive: true })
      }
    }
  }

  public saveImage(
    folder: 'products' | 'customers' | 'vehicles',
    base64Data: string,
    originalName?: string
  ): string {
    this.ensureDirs()
    // Strip data:image/...;base64, if present
    const matches = base64Data.match(/^data:([A-Za-z-+/]+);base64,(.+)$/)
    let ext = 'jpg'
    let buffer: Buffer

    if (matches && matches.length === 3) {
      const mime = matches[1]
      if (mime.includes('png')) ext = 'png'
      else if (mime.includes('webp')) ext = 'webp'
      buffer = Buffer.from(matches[2], 'base64')
    } else {
      buffer = Buffer.from(base64Data, 'base64')
      if (originalName) {
        const parsedExt = path.extname(originalName).replace('.', '').toLowerCase()
        if (['jpg', 'jpeg', 'png', 'webp'].includes(parsedExt)) {
          ext = parsedExt
        }
      }
    }

    const filename = `${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${ext}`
    const targetPath = path.join(this.baseDir, folder, filename)
    fs.writeFileSync(targetPath, buffer)

    return targetPath
  }

  public deleteImage(targetPath: string): boolean {
    try {
      if (fs.existsSync(targetPath)) {
        fs.unlinkSync(targetPath)
        return true
      }
      return false
    } catch {
      return false
    }
  }
}
