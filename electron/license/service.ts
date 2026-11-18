import fs from 'node:fs'
import path from 'node:path'
import { z } from 'zod'
import type { LicenseRecord, LicenseTerms, LicenseUiState } from '@shared/types'
import { APP_VERSION } from '@shared/version'
import { ACTIVATE_URL, FETCH_TIMEOUT_MS, PRODUCT, PRODUCT_ALT, REFRESH_URL, VALIDATE_URL } from './config'
import { categoryFromToken, LicenseOperationError, type LicenseCategory } from './errors'
import { approachingDeadline, graceValid, offlineUntilFrom, signState, verifyState } from './integrity'
import { getOrCreateInstallationId, type Cipher } from './installationId'
import type { Logger } from '../logger'

const storedLicenseSchema = z.object({
  v: z.literal(1),
  license_id: z.string().min(1),
  installation_id: z.string().uuid(),
  status: z.string().min(1),
  lastValidatedAt: z.string().min(1),
  offlineUntil: z.string().min(1),
  product: z.string().min(1),
  version: z.string().min(1),
  integrity: z.string().min(1),
  serverToken: z.string().min(1).optional(),
  lifetime: z.boolean().optional(),
  expiresAt: z.string().min(1).optional(),
  durationMonths: z.number().int().positive().optional(),
  activatedAt: z.string().min(1).optional()
})

type ServerOutcome =
  | { type: 'active'; serverToken?: string; terms?: LicenseTerms }
  | { type: 'denied'; category: LicenseCategory }
  | { type: 'network' }

type Assessment =
  | { kind: 'missing' }
  | { kind: 'storage' }
  | { kind: 'blocked'; messageKey: string }
  | { kind: 'grace'; record: LicenseRecord }
  | { kind: 'expired'; record: LicenseRecord }

const OK_STATUSES = new Set(['active', 'ok', 'valid', 'activated', 'success'])

export interface LicenseServiceOptions {
  userDataDir: string
  cipher: Cipher
  fetchImpl?: typeof fetch
  now?: () => Date
  logger?: Logger
  timeoutMs?: number
  appVersion?: string
}

const noopLogger: Logger = {
  info() {},
  warn() {},
  error() {}
}

export class LicenseService {
  private readonly userDataDir: string
  private readonly cipher: Cipher
  private readonly fetchImpl: typeof fetch
  private readonly now: () => Date
  private readonly logger: Logger
  private readonly timeoutMs: number
  private readonly appVersion: string
  private refreshAttempted = false
  private sessionDenied = false

  constructor(options: LicenseServiceOptions) {
    this.userDataDir = options.userDataDir
    this.cipher = options.cipher
    this.fetchImpl = options.fetchImpl ?? fetch
    this.now = options.now ?? (() => new Date())
    this.logger = options.logger ?? noopLogger
    this.timeoutMs = options.timeoutMs ?? FETCH_TIMEOUT_MS
    this.appVersion = options.appVersion ?? APP_VERSION
  }

  private licensePath(): string {
    return path.join(this.userDataDir, 'license.enc')
  }

  isLicenseActivatedSync(): boolean {
    if (this.sessionDenied) return false
    return this.assess().kind === 'grace'
  }

  async getUiState(): Promise<LicenseUiState> {
    if (this.sessionDenied) {
      return { status: 'blocked', messageKey: 'license.errors.unauthorized' }
    }
    const assessment = this.assess()
    if (assessment.kind === 'missing') return { status: 'activate' }
    if (assessment.kind === 'storage') {
      return { status: 'blocked', messageKey: 'license.errors.storage' }
    }
    if (assessment.kind === 'blocked') {
      return { status: 'blocked', messageKey: assessment.messageKey }
    }
    if (assessment.kind === 'grace') {
      if (approachingDeadline(assessment.record.offlineUntil, this.now()) && !this.refreshAttempted) {
        await this.refresh(assessment.record)
      }
      return this.stateAfterRefresh(assessment.record)
    }

    // Try online validation if grace period expired
    const outcome = await this.post(VALIDATE_URL, {
      license_id: assessment.record.license_id,
      installation_id: assessment.record.installation_id
    })
    if (outcome.type === 'network') {
      return {
        status: 'offline',
        messageKey: 'license.errors.network',
        licenseId: assessment.record.license_id,
        offlineUntil: assessment.record.offlineUntil,
        lastValidatedAt: assessment.record.lastValidatedAt,
        lifetime: assessment.record.lifetime
      }
    }
    if (outcome.type === 'denied') {
      this.deny(assessment.record)
      return { status: 'blocked', messageKey: `license.errors.${outcome.category}`, licenseId: assessment.record.license_id }
    }

    const stamped = this.stampActive(assessment.record.license_id, {
      serverToken: outcome.serverToken ?? assessment.record.serverToken,
      terms: outcome.terms ?? { lifetime: assessment.record.lifetime }
    })
    await this.refresh(stamped)
    return this.stateAfterRefresh(stamped)
  }

  async activate(licenseId: string, activationCode: string): Promise<LicenseUiState> {
    const normalizedId = licenseId.trim().toUpperCase()
    const normalizedCode = activationCode.trim().toUpperCase()
    const installationId = getOrCreateInstallationId(this.userDataDir, this.cipher)
    this.logger.info('license activation requested', { licenseId: normalizedId })

    // Try primary product name first
    let outcome = await this.post(ACTIVATE_URL, {
      license_id: normalizedId,
      activation_code: normalizedCode,
      installation_id: installationId,
      product: PRODUCT,
      product_alt: PRODUCT_ALT,
      version: this.appVersion
    })

    // If denied due to product mismatch on universal license server, try with standard universal product payload
    if (outcome.type === 'denied' && (outcome.category === 'invalid' || outcome.category === 'unauthorized')) {
      const fallbackOutcome = await this.post(ACTIVATE_URL, {
        license_id: normalizedId,
        activation_code: normalizedCode,
        installation_id: installationId,
        product: 'universal',
        version: this.appVersion
      })
      if (fallbackOutcome.type === 'active') {
        outcome = fallbackOutcome
      }
    }

    if (outcome.type === 'network') throw new LicenseOperationError('network')
    if (outcome.type === 'denied') throw new LicenseOperationError(outcome.category)

    const stamped = this.stampActive(normalizedId, { serverToken: outcome.serverToken, terms: outcome.terms })
    this.sessionDenied = false
    await this.refresh(stamped)
    return this.stateAfterRefresh(stamped)
  }

  private stateAfterRefresh(fallback: LicenseRecord): LicenseUiState {
    if (this.sessionDenied) {
      return { status: 'blocked', messageKey: 'license.errors.unauthorized', licenseId: fallback.license_id }
    }
    const current = this.readStored()
    const record = current ?? fallback
    return {
      status: 'active',
      licenseId: record.license_id,
      offlineUntil: record.offlineUntil,
      lastValidatedAt: record.lastValidatedAt,
      lifetime: record.lifetime ?? true,
      expiresAt: record.expiresAt
    }
  }

  private assess(): Assessment {
    let unparsed: unknown
    try {
      unparsed = this.readEncrypted()
    } catch {
      return { kind: 'storage' }
    }
    if (unparsed === null) return { kind: 'missing' }
    const parsed = storedLicenseSchema.safeParse(unparsed)
    if (!parsed.success) return { kind: 'storage' }
    const record = parsed.data as LicenseRecord

    const currentInstallId = getOrCreateInstallationId(this.userDataDir, this.cipher)
    if (record.installation_id !== currentInstallId) {
      return { kind: 'blocked', messageKey: 'license.errors.unauthorized' }
    }

    if (!verifyState(record)) {
      return { kind: 'blocked', messageKey: 'license.errors.unauthorized' }
    }

    if (record.status !== 'active') {
      return { kind: 'blocked', messageKey: 'license.errors.unauthorized' }
    }

    if (graceValid(record.offlineUntil, this.now())) {
      return { kind: 'grace', record }
    }
    return { kind: 'expired', record }
  }

  private readStored(): LicenseRecord | null {
    try {
      const raw = this.readEncrypted()
      if (!raw) return null
      const parsed = storedLicenseSchema.safeParse(raw)
      return parsed.success ? (parsed.data as LicenseRecord) : null
    } catch {
      return null
    }
  }

  private readEncrypted(): unknown {
    const file = this.licensePath()
    if (!fs.existsSync(file)) return null
    try {
      const plain = this.cipher.decrypt(fs.readFileSync(file))
      return JSON.parse(plain) as unknown
    } catch {
      throw new LicenseOperationError('storage')
    }
  }

  private stampActive(licenseId: string, extras?: { serverToken?: string; terms?: LicenseTerms }): LicenseRecord {
    const installationId = getOrCreateInstallationId(this.userDataDir, this.cipher)
    const now = this.now()
    const terms = extras?.terms

    const unsigned = {
      v: 1 as const,
      license_id: licenseId,
      installation_id: installationId,
      status: 'active',
      lastValidatedAt: now.toISOString(),
      offlineUntil: offlineUntilFrom(now),
      product: PRODUCT,
      version: this.appVersion
    }

    const record: LicenseRecord = {
      ...unsigned,
      integrity: signState(unsigned),
      ...(extras?.serverToken ? { serverToken: extras.serverToken } : {}),
      ...(terms?.lifetime === true ? { lifetime: true } : {}),
      ...(terms?.expiresAt ? { expiresAt: terms.expiresAt } : {}),
      ...(terms?.durationMonths ? { durationMonths: terms.durationMonths } : {}),
      ...(terms?.activatedAt ? { activatedAt: terms.activatedAt } : {})
    }
    this.persist(record)
    return record
  }

  private deny(record: LicenseRecord): void {
    this.sessionDenied = true
    const unsigned = {
      v: 1 as const,
      license_id: record.license_id,
      installation_id: record.installation_id,
      status: 'blocked',
      lastValidatedAt: record.lastValidatedAt,
      offlineUntil: new Date(0).toISOString(),
      product: record.product,
      version: record.version
    }
    this.persist({
      ...unsigned,
      integrity: signState(unsigned)
    })
  }

  private persist(record: LicenseRecord): void {
    fs.mkdirSync(this.userDataDir, { recursive: true })
    fs.writeFileSync(this.licensePath(), this.cipher.encrypt(JSON.stringify(record)))
  }

  private async refresh(record: LicenseRecord): Promise<void> {
    this.refreshAttempted = true
    const outcome = await this.post(REFRESH_URL, {
      license_id: record.license_id,
      installation_id: record.installation_id
    })
    if (outcome.type === 'active') {
      this.stampActive(record.license_id, {
        serverToken: outcome.serverToken ?? record.serverToken,
        terms: outcome.terms ?? { lifetime: record.lifetime }
      })
      return
    }
    if (outcome.type === 'denied' && outcome.category === 'unauthorized') {
      this.logger.info('license refresh denied', { category: outcome.category })
      this.deny(record)
      return
    }
    if (outcome.type === 'denied') {
      this.logger.info('license refresh skipped', { category: outcome.category })
    }
  }

  private async post(url: string, body: Record<string, string>): Promise<ServerOutcome> {
    try {
      const response = await this.fetchImpl(url, {
        method: 'POST',
        redirect: 'error',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json'
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.timeoutMs)
      })
      const text = await response.text()
      return this.interpret(response.status, text)
    } catch {
      this.logger.warn('license request failed', { url })
      return { type: 'network' }
    }
  }

  private interpret(status: number, text: string): ServerOutcome {
    if (status === 429) return { type: 'denied', category: 'rate' }
    if (text.trim().startsWith('<')) return { type: 'network' }
    let body: Record<string, unknown> | null = null
    if (text.trim()) {
      try {
        const parsed = JSON.parse(text) as unknown
        body = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null
      } catch {
        body = null
      }
    }
    const code = this.extractCode(body)
    const mapped = categoryFromToken(code)

    if (body && (body.success === false || body.ok === false || body.valid === false || body.authorized === false)) {
      return { type: 'denied', category: mapped ?? 'invalid' }
    }
    if (status === 401 || status === 403) {
      return { type: 'denied', category: mapped ?? 'unauthorized' }
    }
    if (status === 409) return { type: 'denied', category: mapped ?? 'already' }
    if (status >= 500) return { type: 'network' }
    if (code && !OK_STATUSES.has(code.toLowerCase())) {
      return { type: 'denied', category: mapped ?? 'unauthorized' }
    }
    if (status < 200 || status >= 300) return { type: 'denied', category: mapped ?? 'invalid' }

    return { type: 'active', serverToken: this.extractToken(body), terms: this.extractTerms(body) }
  }

  private extractCode(body: Record<string, unknown> | null): string | undefined {
    if (!body) return undefined
    for (const key of ['error', 'code', 'status', 'reason']) {
      const value = body[key]
      if (typeof value === 'string' && value.trim()) return value.trim()
    }
    return undefined
  }

  private extractToken(body: Record<string, unknown> | null): string | undefined {
    if (!body) return undefined
    for (const key of ['serverToken', 'server_token', 'token']) {
      const value = body[key]
      if (typeof value === 'string' && value.trim()) return value.trim()
    }
    return undefined
  }

  private extractTerms(body: Record<string, unknown> | null): LicenseTerms | undefined {
    if (!body) return undefined
    const sub = (body.license || body.data || body) as Record<string, unknown>
    return {
      lifetime: sub.lifetime === true || sub.plan === 'lifetime',
      expiresAt: typeof sub.expires_at === 'string' ? sub.expires_at : undefined,
      activatedAt: typeof sub.activated_at === 'string' ? sub.activated_at : undefined
    }
  }
}
