export type UpdatePhase = 'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'error'

export interface UpdateSnapshot {
  currentVersion: string
  availableVersion: string | null
  phase: UpdatePhase
  percent: number
  error: string
  packaged: boolean
  releaseDate?: string
  releaseNotes?: string
  totalBytes?: number
  transferredBytes?: number
  channel?: string
  repository?: string
  lastChecked?: string
}

export function isNewerVersion(current: string, incoming: string): boolean {
  const parse = (v: string) => v.replace(/^v/i, '').split('.').map((p) => parseInt(p, 10) || 0)
  const [cMajor, cMinor, cPatch] = parse(current)
  const [iMajor, iMinor, iPatch] = parse(incoming)

  if (iMajor !== cMajor) return iMajor > cMajor
  if (iMinor !== cMinor) return iMinor > cMinor
  return iPatch > cPatch
}
