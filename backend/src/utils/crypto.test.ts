import { encryptUserSecret, decryptUserSecret, deriveUserKey } from './crypto';

describe('Crypto Utility - FAANG Grade Envelope Encryption', () => {
  const userA = '11111111-2222-3333-4444-555555555555';
  const userB = '99999999-8888-7777-6666-555555555555';
  const sampleSecret = JSON.stringify({
    gemini: { keys: [{ value: 'AIzaSyA_test_key_1234567890' }] },
    groq: { keys: [{ value: 'gsk_test_key_abcdef123456' }] },
    providerOrder: ['gemini', 'groq']
  });

  it('should encrypt and decrypt a secret payload cleanly for the same user', () => {
    const encrypted = encryptUserSecret(sampleSecret, userA);
    expect(encrypted).toMatch(/^v1:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/);

    const decrypted = decryptUserSecret(encrypted, userA);
    expect(decrypted).toBe(sampleSecret);
    expect(JSON.parse(decrypted)).toEqual(JSON.parse(sampleSecret));
  });

  it('should produce different ciphertexts for the same plaintext due to random IV', () => {
    const enc1 = encryptUserSecret(sampleSecret, userA);
    const enc2 = encryptUserSecret(sampleSecret, userA);
    expect(enc1).not.toBe(enc2);
    expect(decryptUserSecret(enc1, userA)).toBe(sampleSecret);
    expect(decryptUserSecret(enc2, userA)).toBe(sampleSecret);
  });

  it('should isolate keys per user: userB cannot decrypt userA ciphertext', () => {
    const encA = encryptUserSecret(sampleSecret, userA);
    expect(() => decryptUserSecret(encA, userB)).toThrow();
  });

  it('should detect tampering and fail decryption when ciphertext or auth tag is corrupted', () => {
    const encrypted = encryptUserSecret(sampleSecret, userA);
    const parts = encrypted.split(':');
    // Corrupt ciphertext
    parts[3] = 'AAAA' + parts[3].slice(4);
    const tampered = parts.join(':');

    expect(() => decryptUserSecret(tampered, userA)).toThrow();
  });

  it('should handle empty or blank string gracefully', () => {
    expect(encryptUserSecret('', userA)).toBe('');
    expect(decryptUserSecret('', userA)).toBe('');
  });
});
