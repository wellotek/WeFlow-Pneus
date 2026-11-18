import { ZodError } from 'zod'

export interface IpcError {
  code: string
  message: string
}

function formatZodIssues(error: ZodError): string {
  return error.issues
    .map((issue) => {
      const field = issue.path.length > 0 ? issue.path.join('.') : 'Champ'
      return `${field} : ${issue.message}`
    })
    .join(' | ')
}

export function serializeError(error: unknown): IpcError {
  if (error instanceof ZodError) {
    return {
      code: 'VALIDATION_ERROR',
      message: formatZodIssues(error)
    }
  }

  if (error instanceof Error) {
    const msg = error.message || ''

    if (error.name === 'LicenseGuardError') {
      return { code: 'unlicensed', message: msg }
    }

    if (msg.includes('UNIQUE constraint failed: products.reference')) {
      return {
        code: 'DUPLICATE_REFERENCE',
        message: 'Cette référence de pneu existe déjà dans le catalogue.'
      }
    }

    if (msg.includes('UNIQUE constraint failed: sales.invoice_number')) {
      return {
        code: 'DUPLICATE_INVOICE',
        message: 'Ce numéro de facture existe déjà.'
      }
    }

    return {
      code: error.name || 'INTERNAL_ERROR',
      message: msg
    }
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: String(error)
  }
}
