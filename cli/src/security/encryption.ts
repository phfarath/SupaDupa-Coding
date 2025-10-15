/**
 * Encryption utilities for securing sensitive data like API keys
 */

import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';





// Encryption algorithm
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 64;

/**
 * Get or create master encryption key
 */
async function getMasterKey(): Promise<Buffer> {
  const keyPath = path.join(process.cwd(), '.supadupacode.key');
  
  try {
    const keyData = await fs.readFile(keyPath, 'utf-8');
    return Buffer.from(keyData, 'hex');
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // Generate new master key
      const masterKey = crypto.randomBytes(KEY_LENGTH);
      await fs.writeFile(keyPath, masterKey.toString('hex'), { mode: 0o600 });
      return masterKey;
    }
    throw error;
  }
}

/**
 * Derive encryption key from master key using PBKDF2
 */
function deriveKey(masterKey: Buffer, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(masterKey, salt, 100000, KEY_LENGTH, 'sha256');
}

/**
 * Encrypt a value
 */
export async function encrypt(plaintext: string): Promise<string> {
  if (!plaintext || typeof plaintext !== 'string') {
    throw new Error('Invalid plaintext: must be a non-empty string');
  }

  const masterKey = await getMasterKey();
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = deriveKey(masterKey, salt);
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Combine salt + iv + authTag + encrypted data
  const combined = Buffer.concat([
    salt,
    iv,
    authTag,
    Buffer.from(encrypted, 'hex')
  ]);
  
  return combined.toString('base64');
}

/**
 * Decrypt a value
 */
export async function decrypt(encryptedData: string): Promise<string> {
  if (!encryptedData || typeof encryptedData !== 'string') {
    throw new Error('Invalid encrypted data: must be a non-empty string');
  }

  const masterKey = await getMasterKey();
  const combined = Buffer.from(encryptedData, 'base64');
  
  // Extract components
  const salt = combined.subarray(0, SALT_LENGTH);
  const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const authTag = combined.subarray(
    SALT_LENGTH + IV_LENGTH,
    SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH
  );
  const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
  
  const key = deriveKey(masterKey, salt);
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, undefined, 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Check if a value is encrypted
 */
export function isEncrypted(value: any): boolean {
  if (typeof value !== 'string') return false;
  
  try {
    // Try to decode base64
    const decoded = Buffer.from(value, 'base64');
    // Check if it has minimum length (salt + iv + authTag + data)
    return decoded.length >= (SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH + 1);
  } catch {
    return false;
  }
}

/**
 * Validate API key format (basic validation)
 */
export function validateApiKey(provider: string, key: string): boolean {
  if (!key || typeof key !== 'string') {
    throw new Error('API key must be a non-empty string');
  }

  const validations: Record<string, { pattern: RegExp; message: string }> = {
    openai: {
      pattern: /^sk-[a-zA-Z0-9]{32,}$/,
      message: 'OpenAI API key must start with "sk-" followed by at least 32 characters'
    },
    anthropic: {
      pattern: /^sk-ant-[a-zA-Z0-9-]{95,}$/,
      message: 'Anthropic API key must start with "sk-ant-" followed by characters'
    },
    // Generic validation for unknown providers
    default: {
      pattern: /^.{10,}$/,
      message: 'API key must be at least 10 characters long'
    }
  };

  const validation = validations[provider] || validations.default;
  
  if (!validation.pattern.test(key)) {
    throw new Error(`Invalid API key format for ${provider}: ${validation.message}`);
  }

  return true;
}
