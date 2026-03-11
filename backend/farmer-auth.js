import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const FARMER_SECRET = process.env.FARMER_JWT_SECRET || process.env.ADMIN_JWT_SECRET || 'farmer-secret-key-change-in-production';
const FARMER_TOKEN_EXPIRY = process.env.FARMER_TOKEN_EXPIRY || '8h';

export function generateFarmerAccessToken({ farmerId, phoneNumber, email, role = 'farmer' }) {
  return jwt.sign(
    {
      farmerId,
      phoneNumber,
      email,
      role,
      type: 'farmer_access'
    },
    FARMER_SECRET,
    { expiresIn: FARMER_TOKEN_EXPIRY }
  );
}

export function verifyFarmerAccessToken(token) {
  try {
    const decoded = jwt.verify(token, FARMER_SECRET);
    if (decoded.type !== 'farmer_access') return null;
    return decoded;
  } catch (error) {
    return null;
  }
}

export function generateFarmerSessionId() {
  return crypto.randomBytes(24).toString('hex');
}

export function validatePasswordPolicy(password = '') {
  const reasons = [];
  if (password.length < 8) reasons.push('Must be at least 8 characters');
  if (!/[a-z]/.test(password)) reasons.push('Must include at least one lowercase letter');
  if (!/[A-Z]/.test(password)) reasons.push('Must include at least one uppercase letter');
  if (!/[0-9]/.test(password)) reasons.push('Must include at least one number');
  if (!/[^A-Za-z0-9]/.test(password)) reasons.push('Must include at least one special character');
  if (/\s/.test(password)) reasons.push('Must not contain spaces');

  return {
    valid: reasons.length === 0,
    reasons
  };
}
