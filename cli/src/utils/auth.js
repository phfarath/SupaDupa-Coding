/**
 * Authentication Utilities - basic authentication mechanism
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

/**
 * Generate a secure token
 * @param {number} length - Token length in bytes
 * @returns {string} Hex token
 */
export function generateToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Hash a password or token
 * @param {string} value - Value to hash
 * @param {string} salt - Salt for hashing
 * @returns {string} Hashed value
 */
export function hashValue(value, salt = '') {
  return crypto.createHash('sha256')
    .update(value + salt)
    .digest('hex');
}

/**
 * Token Manager - manages authentication tokens
 */
export class TokenManager {
  constructor(tokenPath = null) {
    this.tokenPath = tokenPath || path.join(process.cwd(), '.supadupacode.token');
    this.token = null;
  }

  /**
   * Initialize token file
   */
  async init() {
    const token = generateToken();
    await this.save(token);
    return token;
  }

  /**
   * Load token from file
   */
  async load() {
    try {
      const data = await fs.readFile(this.tokenPath, 'utf-8');
      this.token = data.trim();
      return this.token;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return await this.init();
      }
      throw error;
    }
  }

  /**
   * Save token to file
   */
  async save(token) {
    this.token = token;
    await fs.writeFile(this.tokenPath, token, {
      encoding: 'utf-8',
      mode: 0o600 // Read/write for owner only
    });
  }

  /**
   * Verify a token
   */
  async verify(token) {
    if (!this.token) {
      await this.load();
    }
    return this.token === token;
  }

  /**
   * Rotate token
   */
  async rotate() {
    return await this.init();
  }

  /**
   * Delete token
   */
  async delete() {
    try {
      await fs.unlink(this.tokenPath);
      this.token = null;
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return false;
      }
      throw error;
    }
  }
}

/**
 * Simple authorization check
 * @param {string} token - Token to verify
 * @param {TokenManager} tokenManager - Token manager instance
 * @returns {Promise<boolean>}
 */
export async function authorize(token, tokenManager) {
  return await tokenManager.verify(token);
}
