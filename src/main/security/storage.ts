import { safeStorage } from 'electron'

export function encryptPassword(plaintext: string): Buffer {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('safeStorage encryption is not available on this system')
  }
  return safeStorage.encryptString(plaintext)
}

export function decryptPassword(encrypted: Buffer): string {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('safeStorage encryption is not available on this system')
  }
  return safeStorage.decryptString(encrypted)
}
