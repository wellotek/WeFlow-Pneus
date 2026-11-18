import type { IpcMainInvokeEvent } from 'electron'

export function isTrustedIpcSender(event: IpcMainInvokeEvent): boolean {
  const url = event.senderFrame?.url ?? ''
  if (!url) return false

  // Development
  if (url.startsWith('http://localhost:') || url.startsWith('http://127.0.0.1:')) {
    return true
  }

  // Production
  if (url.startsWith('file://')) {
    return true
  }

  return false
}
