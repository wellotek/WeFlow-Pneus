import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
  approachingDeadline,
  canonicalState,
  graceValid,
  offlineUntilFrom,
  signState,
  verifyState,
  type IntegrityFields
} from '../electron/license/integrity'
import { getOrCreateInstallationId } from '../electron/license/installationId'

describe('License Security & Universal Compatibility Engine - WeFlow Pneus', () => {
  const baseFields: IntegrityFields = {
    v: 1,
    license_id: 'DS-TMA4-JFPL-GM4T',
    installation_id: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
    status: 'active',
    lastValidatedAt: '2026-11-18T10:00:00.000Z',
    offlineUntil: '2026-11-25T10:00:00.000Z',
    product: 'WeFlowPneus',
    version: '1.0.0'
  }

  it('produces canonical representation and deterministic HMAC signature', () => {
    const canonical = canonicalState(baseFields)
    expect(canonical).toContain('weflow-pneus-local-integrity-v1|')
    expect(canonical).toContain('DS-TMA4-JFPL-GM4T')

    const sig1 = signState(baseFields)
    const sig2 = signState(baseFields)
    expect(sig1).toBe(sig2)
    expect(sig1).toMatch(/^[a-f0-9]{64}$/)
  })

  it('validates genuine signed state successfully', () => {
    const integrity = signState(baseFields)
    const valid = verifyState({ ...baseFields, integrity })
    expect(valid).toBe(true)
  })

  it('detects tampering when state fields are maliciously modified', () => {
    const integrity = signState(baseFields)
    // Tamper with status
    const tamperedStatus = { ...baseFields, status: 'blocked', integrity }
    expect(verifyState(tamperedStatus)).toBe(false)

    // Tamper with offline expiration
    const tamperedDate = { ...baseFields, offlineUntil: '2030-01-01T00:00:00.000Z', integrity }
    expect(verifyState(tamperedDate)).toBe(false)

    // Tamper with machine installation ID
    const tamperedInstall = { ...baseFields, installation_id: '00000000-0000-0000-0000-000000000000', integrity }
    expect(verifyState(tamperedInstall)).toBe(false)
  })

  it('calculates 7-day offline grace period properly', () => {
    const from = new Date('2026-11-18T12:00:00.000Z')
    const offlineUntil = offlineUntilFrom(from, 7)
    expect(offlineUntil).toBe('2026-11-25T12:00:00.000Z')

    // Valid inside grace period (e.g. 3 days later)
    const insideGrace = new Date('2026-11-21T12:00:00.000Z')
    expect(graceValid(offlineUntil, insideGrace)).toBe(true)

    // Invalid after grace period expires (e.g. 8 days later)
    const expiredGrace = new Date('2026-11-26T12:00:00.000Z')
    expect(graceValid(offlineUntil, expiredGrace)).toBe(false)
  })

  it('notifies when deadline is approaching within 48 hours', () => {
    const offlineUntil = '2026-11-25T12:00:00.000Z'
    // 24 hours remaining -> approaching
    const in24h = new Date('2026-11-24T12:00:00.000Z')
    expect(approachingDeadline(offlineUntil, in24h, 48)).toBe(true)

    // 5 days remaining -> not approaching yet
    const in5days = new Date('2026-11-20T12:00:00.000Z')
    expect(approachingDeadline(offlineUntil, in5days, 48)).toBe(false)
  })

  it('generates and persists unique installation ID across restarts', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'weflow-pneus-test-inst-'))
    const dummyCipher = {
      encrypt: (text: string) => Buffer.from(text, 'utf-8'),
      decrypt: (buf: Buffer) => buf.toString('utf-8')
    }

    try {
      const id1 = getOrCreateInstallationId(tempDir, dummyCipher)
      expect(id1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)

      const id2 = getOrCreateInstallationId(tempDir, dummyCipher)
      expect(id2).toBe(id1)
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  })
})
