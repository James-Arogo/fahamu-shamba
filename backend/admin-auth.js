import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const ADMIN_SECRET = process.env.ADMIN_JWT_SECRET || 'admin-secret-key-change-in-production';
const REFRESH_SECRET = process.env.ADMIN_REFRESH_SECRET || 'refresh-secret-key-change-in-production';
const TOKEN_EXPIRY = '15m'; // Short-lived access token
const REFRESH_EXPIRY = '7d'; // Longer-lived refresh token

/**
 * Generate a secure random token for MFA
 */
export function generateMFAToken() {
  return crypto.randomBytes(3).toString('hex'); // 6-digit code
}

/**
 * Generate JWT access token
 */
export function generateAccessToken(adminId, email, role = 'admin') {
  return jwt.sign(
    { 
      adminId, 
      email, 
      role,
      type: 'access',
      iat: Date.now()
    },
    ADMIN_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );
}

/**
 * Generate JWT refresh token
 */
export function generateRefreshToken(adminId, email) {
  return jwt.sign(
    { 
      adminId, 
      email,
      type: 'refresh',
      iat: Date.now()
    },
    REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRY }
  );
}

/**
 * Verify access token
 */
export function verifyAccessToken(token) {
  try {
    const decoded = jwt.verify(token, ADMIN_SECRET);
    if (decoded.type !== 'access') {
      throw new Error('Invalid token type');
    }
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken(token) {
  try {
    const decoded = jwt.verify(token, REFRESH_SECRET);
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Hash password using SHA-256
 */
export function hashPassword(password) {
  const salt = process.env.PASSWORD_SALT || 'default-salt';
  return crypto
    .createHash('sha256')
    .update(`${password}${salt}`)
    .digest('hex');
}

/**
 * Verify password
 */
export function verifyPassword(password, hash) {
  return hashPassword(password) === hash;
}

/**
 * Generate session ID
 */
export function generateSessionId() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate CSRF token
 */
export function generateCSRFToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Rate limiting helper
 */
export class RateLimiter {
  constructor(maxAttempts = 5, windowMs = 15 * 60 * 1000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
    this.attempts = new Map();
  }

  checkLimit(identifier) {
    const now = Date.now();
    const userAttempts = this.attempts.get(identifier) || [];
    
    // Remove old attempts outside the window
    const recentAttempts = userAttempts.filter(time => now - time < this.windowMs);
    
    if (recentAttempts.length >= this.maxAttempts) {
      return false;
    }
    
    recentAttempts.push(now);
    this.attempts.set(identifier, recentAttempts);
    return true;
  }

  reset(identifier) {
    this.attempts.delete(identifier);
  }

  isLocked(identifier) {
    const userAttempts = this.attempts.get(identifier) || [];
    const now = Date.now();
    const recentAttempts = userAttempts.filter(time => now - time < this.windowMs);
    return recentAttempts.length >= this.maxAttempts;
  }

  getRetryAfter(identifier) {
    const userAttempts = this.attempts.get(identifier) || [];
    if (userAttempts.length === 0) return 0;
    const oldestAttempt = Math.min(...userAttempts);
    return Math.ceil((oldestAttempt + this.windowMs - Date.now()) / 1000);
  }
}

export const loginLimiter = new RateLimiter(5, 15 * 60 * 1000); // 5 attempts per 15 minutes
export const mfaLimiter = new RateLimiter(3, 5 * 60 * 1000); // 3 attempts per 5 minutes
