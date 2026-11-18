export const LICENSE_ERROR_CATEGORIES = [
  'invalid',
  'already',
  'limit',
  'network',
  'rate',
  'unauthorized',
  'storage'
] as const

export type LicenseCategory = (typeof LICENSE_ERROR_CATEGORIES)[number]

export class LicenseOperationError extends Error {
  readonly category: LicenseCategory

  constructor(category: LicenseCategory) {
    super(category)
    this.name = 'LicenseOperationError'
    this.category = category
  }
}

export class LicenseGuardError extends Error {
  constructor() {
    super('unlicensed')
    this.name = 'LicenseGuardError'
  }
}

const BODY_CODES: Record<string, LicenseCategory> = {
  invalid: 'invalid',
  invalid_license: 'invalid',
  not_found: 'invalid',
  'license not found': 'invalid',
  'invalid activation code': 'invalid',
  already: 'already',
  already_activated: 'already',
  already_used: 'already',
  'machine mismatch': 'already',
  'installation not activated': 'already',
  limit: 'limit',
  activation_limit: 'limit',
  seat_limit: 'limit',
  rate: 'rate',
  rate_limited: 'rate',
  too_many_requests: 'rate',
  unauthorized: 'unauthorized',
  forbidden: 'unauthorized',
  revoked: 'unauthorized',
  inactive: 'unauthorized',
  blocked: 'unauthorized',
  expired: 'unauthorized'
}

export function categoryFromToken(token: string | undefined): LicenseCategory | null {
  if (!token) return null
  const normalized = token.trim().toLowerCase()
  return BODY_CODES[normalized] ?? null
}
