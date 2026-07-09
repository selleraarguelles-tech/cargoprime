import { authenticator } from 'otplib'
import QRCode from 'qrcode'

// Nombre que verá el usuario en Google Authenticator / Authy.
const ISSUER = 'CargoPrime'

// Permitir ±1 ventana (30s) de desfase de reloj para evitar rechazos por relojes ligeramente desajustados.
authenticator.options = { window: 1 }

/** Genera un secreto base32 nuevo para dar de alta el 2FA de un usuario. */
export function generarSecret2FA(): string {
  return authenticator.generateSecret()
}

/** URL otpauth:// que se codifica en el QR para escanear con la app de autenticación. */
export function otpauthUrl(email: string, secret: string): string {
  return authenticator.keyuri(email, ISSUER, secret)
}

/** Devuelve el QR (data URL PNG) listo para pintar en un <img>. */
export async function generarQR(email: string, secret: string): Promise<string> {
  return QRCode.toDataURL(otpauthUrl(email, secret))
}

/** Verifica un código TOTP de 6 dígitos contra el secreto del usuario. */
export function verificarCodigo(code: string, secret: string): boolean {
  if (!code || !secret) return false
  try {
    return authenticator.check(code.trim(), secret)
  } catch {
    return false
  }
}
