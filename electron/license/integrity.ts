import { createHmac } from 'node:crypto'
import { OFFLINE_GRACE_PERIOD_DAYS } from './config'

const INTEGRITY_SALT = 'weflow-pneus-local-integrity-v1'

export interface IntegrityFields {
  v: 1
  license_id: string
  installation_id: string
  status: string
  lastValidatedAt: string
  offlineUntil: string
  product: string
  version: string
}

export function canonicalState(fields: IntegrityFields): string {
  return [
    INTEGRITY_SALT,
    fields.v,
    fields.license_id.trim().toUpperCase(),
    fields.installation_id.trim().toLowerCase(),
    fields.status.trim().toLowerCase(),
    fields.lastValidatedAt.trim(),
    fields.offlineUntil.trim(),
    fields.product.trim(),
    fields.version.trim()
  ].join('|')
}

export function signState(fields: IntegrityFields): string {
  return createHmac('sha256', INTEGRITY_SALT).update(canonicalState(fields)).digest('hex')
}

export function verifyState(record: IntegrityFields & { integrity: string }): boolean {
  if (!record.integrity || typeof record.integrity !== 'string') return false
  const expected = signState(record)
  return record.integrity.toLowerCase() === expected.toLowerCase()
}

export function offlineUntilFrom(fromDate: Date, days: number = OFFLINE_GRACE_PERIOD_DAYS): string {
  const target = new Date(fromDate.getTime() + days * 24 * 60 * 60 * 1000)
  return target.toISOString()
}

export function graceValid(offlineUntilIso: string, now: Date): boolean {
  const deadline = Date.parse(offlineUntilIso)
  if (Number.isNaN(deadline)) return false
  return now.getTime() < deadline
}

export function approachingDeadline(offlineUntilIso: string, now: Date, thresholdHours: number = 48): boolean {
  const deadline = Date.parse(offlineUntilIso)
  if (Number.isNaN(deadline)) return true
  const remainingMs = deadline - now.getTime()
  return remainingMs > 0 && remainingMs <= thresholdHours * 60 * 60 * 1000
}
