import { LicenseGuardError } from './errors'
import type { LicenseService } from './service'

let globalLicenseService: LicenseService | null = null

export function setLicenseService(service: LicenseService): void {
  globalLicenseService = service
}

export function getLicenseService(): LicenseService {
  if (!globalLicenseService) {
    throw new Error('License service has not been initialized.')
  }
  return globalLicenseService
}

export function assertLicensed(): void {
  const service = getLicenseService()
  if (!service.isLicenseActivatedSync()) {
    throw new LicenseGuardError()
  }
}
