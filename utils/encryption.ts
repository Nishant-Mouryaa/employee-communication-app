// utils/encryption.ts
import * as Crypto from 'expo-crypto'

/**
 * Simple encryption utilities for message content
 * Note: For production E2E encryption, consider using a library like
 * @react-native-crypto-js or implementing proper key exchange
 */

const ENCRYPTION_KEY_LENGTH = 32

/**
 * Generate a random encryption key
 */
export const generateEncryptionKey = async (): Promise<string> => {
  try {
    const randomBytes = await Crypto.getRandomBytesAsync(ENCRYPTION_KEY_LENGTH)
    return Array.from(randomBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  } catch (error) {
    // Fallback to timestamp-based key if crypto fails
    console.warn('Crypto.getRandomBytesAsync failed, using fallback:', error)
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
  }
}

/**
 * Simple XOR-based encryption (for transport security)
 * Note: This is basic obfuscation. For true security, use AES-256
 */
export const encryptMessage = async (content: string, key: string): Promise<string> => {
  try {
    // In production, use proper AES encryption
    // For now, this provides basic transport-level obfuscation
    const keyBytes = key.split('').map(c => c.charCodeAt(0))
    const encoder = new TextEncoder()
    const contentBytes = encoder.encode(content)
    
    const encrypted = Array.from(contentBytes).map((byte, i) => 
      byte ^ keyBytes[i % keyBytes.length]
    )
    
    // Convert to base64 manually for React Native compatibility
    const binaryString = String.fromCharCode(...encrypted)
    if (typeof btoa !== 'undefined') {
      return btoa(binaryString)
    }
    // Fallback for React Native
    return Buffer.from(binaryString, 'binary').toString('base64')
  } catch (error) {
    console.error('Encryption error:', error)
    return content // Fallback to plaintext if encryption fails
  }
}

/**
 * Decrypt message content
 */
export const decryptMessage = async (encryptedContent: string, key: string): Promise<string> => {
  try {
    const keyBytes = key.split('').map(c => c.charCodeAt(0))
    
    // Decode base64
    let binaryString: string
    if (typeof atob !== 'undefined') {
      binaryString = atob(encryptedContent)
    } else {
      // Fallback for React Native
      binaryString = Buffer.from(encryptedContent, 'base64').toString('binary')
    }
    
    const encrypted = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      encrypted[i] = binaryString.charCodeAt(i)
    }
    
    const decrypted = Array.from(encrypted).map((byte, i) => 
      byte ^ keyBytes[i % keyBytes.length]
    )
    
    return new TextDecoder().decode(new Uint8Array(decrypted))
  } catch (error) {
    console.error('Decryption error:', error)
    return encryptedContent // Fallback if decryption fails
  }
}

/**
 * Hash content for integrity checking
 */
export const hashContent = async (content: string): Promise<string> => {
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    content
  )
}

/**
 * Verify content integrity
 */
export const verifyIntegrity = async (
  content: string,
  expectedHash: string
): Promise<boolean> => {
  const actualHash = await hashContent(content)
  return actualHash === expectedHash
}

