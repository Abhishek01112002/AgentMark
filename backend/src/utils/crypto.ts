import crypto from 'crypto';

const MASTER_KEY_SOURCE = process.env.ENCRYPTION_MASTER_KEY || process.env.JWT_SECRET || 'agentmark-vault-master-fallback-secret-2026';
const HKDF_SALT = 'agentmark-llm-vault-salt-v1';
const HKDF_INFO = 'agentmark-user-secret-encryption';

/**
 * Derives a dedicated 256-bit AES key for a specific user using HKDF-SHA256.
 * Enforces per-user cryptographic envelope isolation.
 */
export function deriveUserKey(userId: string): Buffer {
  const masterKeyBuffer = Buffer.from(MASTER_KEY_SOURCE, 'utf-8');
  const userSaltBuffer = Buffer.from(`${HKDF_SALT}:${userId}`, 'utf-8');
  const infoBuffer = Buffer.from(HKDF_INFO, 'utf-8');

  return Buffer.from(crypto.hkdfSync('sha256', masterKeyBuffer, userSaltBuffer, infoBuffer, 32));
}

/**
 * Encrypts arbitrary plaintext using AES-256-GCM with a unique 96-bit IV per encryption.
 * Output format: "v1:<iv_b64>:<authTag_b64>:<ciphertext_b64>"
 */
export function encryptUserSecret(plaintext: string, userId: string): string {
  if (!plaintext) return '';
  const key = deriveUserKey(userId);
  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let ciphertext = cipher.update(plaintext, 'utf-8', 'base64');
  ciphertext += cipher.final('base64');

  const authTag = cipher.getAuthTag().toString('base64');
  const ivBase64 = iv.toString('base64');

  return `v1:${ivBase64}:${authTag}:${ciphertext}`;
}

/**
 * Decrypts an AES-256-GCM encrypted payload and verifies cryptographic authenticity.
 * Throws an error if tampered, corrupted, or signed by another user.
 */
export function decryptUserSecret(payload: string, userId: string): string {
  if (!payload || !payload.trim()) return '';

  const parts = payload.split(':');
  if (parts.length !== 4 || parts[0] !== 'v1') {
    throw new Error('Invalid or unsupported ciphertext format');
  }

  const [, ivBase64, authTagBase64, ciphertextBase64] = parts;
  const key = deriveUserKey(userId);
  const iv = Buffer.from(ivBase64, 'base64');
  const authTag = Buffer.from(authTagBase64, 'base64');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertextBase64, 'base64', 'utf-8');
  decrypted += decipher.final('utf-8');

  return decrypted;
}
