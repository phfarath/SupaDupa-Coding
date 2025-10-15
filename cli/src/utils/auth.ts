/**
 * Authentication Utilities - basic authentication mechanism
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

/**
 * Generate a secure token
 * @param length - Token length in bytes
 * @returns Hex token
 */
export function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Hash a password or token
 * @param value - Value to hash
 * @param salt - Salt for hashing
 * @returns Hashed value
 */
export function hashValue(value: string, salt: string = ''): string {
  return crypto.createHash('sha256')
    .update(value + salt)
    .digest('hex');
}

/**
 * Token Manager - manages authentication tokens
 */
export class TokenManager {
  private tokenPath: string;
  private token: string | null;

  constructor(tokenPath: string | null = null) {
    this.tokenPath = tokenPath || path.join(process.cwd(), '.supadupacode.token');
    this.token = null;
  }

  /**
   * Initialize token file
   */
  async init(): Promise<string> {
    const token = generateToken();
    await this.save(token);
    return token;
  }

  /**
   * Load token from file
   */
  async load(): Promise<string> {
    try {
      const data = await fs.readFile(this.tokenPath, 'utf-8');
      this.token = data.trim();
      return this.token;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return await this.init();
      }
      throw error;
    }
  }

  /**
   * Save token to file
   */
  async save(token: string): Promise<void> {
    this.token = token;
    await fs.writeFile(this.tokenPath, token, {
      encoding: 'utf-8',
      mode: 0o600 // Read/write for owner only
    });
  }

  /**
   * Verify a token
   */
  async verify(token: string): Promise<boolean> {
    if (!this.token) {
      await this.load();
    }
    return this.token === token;
  }

  /**
   * Rotate token
   */
  async rotate(): Promise<string> {
    return await this.init();
  }

  /**
   * Delete token
   */
  async delete(): Promise<boolean> {
    try {
      await fs.unlink(this.tokenPath);
      this.token = null;
      return true;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return false;
      }
      throw error;
    }
  }
}

/**
 * Simple authorization check
 * @param token - Token to verify
 * @param tokenManager - Token manager instance
 * @returns Promise resolving to boolean
 */
export async function authorize(token: string, tokenManager: TokenManager): Promise<boolean> {
  return await tokenManager.verify(token);
}