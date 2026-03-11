/**
 * Farmer Profile Dashboard Module
 * Enhanced module for farmer registration and profile management on the dashboard
 * Includes profile validation, data enrichment, and advanced querying
 */

import crypto from 'crypto';
import { validatePasswordPolicy } from './farmer-auth.js';

const FARMER_LOCKOUT_MAX_ATTEMPTS = Number(process.env.FARMER_LOCKOUT_MAX_ATTEMPTS || 5);
const FARMER_LOCKOUT_MINUTES = Number(process.env.FARMER_LOCKOUT_MINUTES || 15);
const FARMER_SESSION_TTL_HOURS = Number(process.env.FARMER_SESSION_TTL_HOURS || 24);

function resolveEncryptionKey() {
  const raw = process.env.DATA_ENCRYPTION_KEY || process.env.ADMIN_JWT_SECRET || 'fahamu-shamba-dev-encryption-key';

  if (/^[a-fA-F0-9]{64}$/.test(raw)) {
    return Buffer.from(raw, 'hex');
  }

  try {
    const b64 = Buffer.from(raw, 'base64');
    if (b64.length === 32) return b64;
  } catch (error) {
    // ignore invalid base64
  }

  return crypto.createHash('sha256').update(raw).digest();
}

const DATA_ENCRYPTION_KEY = resolveEncryptionKey();
const ENCRYPTION_PREFIX = 'enc:v1:';

function encryptSensitiveField(value) {
  if (value === undefined || value === null || value === '') return value;
  const plainText = String(value);

  if (!DATA_ENCRYPTION_KEY) {
    return plainText;
  }

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', DATA_ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${ENCRYPTION_PREFIX}${Buffer.concat([iv, authTag, encrypted]).toString('base64')}`;
}

function decryptSensitiveField(value) {
  if (value === undefined || value === null || value === '') return value;
  const cipherText = String(value);

  if (!cipherText.startsWith(ENCRYPTION_PREFIX) || !DATA_ENCRYPTION_KEY) {
    return cipherText;
  }

  try {
    const payload = Buffer.from(cipherText.slice(ENCRYPTION_PREFIX.length), 'base64');
    const iv = payload.subarray(0, 12);
    const authTag = payload.subarray(12, 28);
    const encrypted = payload.subarray(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', DATA_ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
  } catch (error) {
    return cipherText;
  }
}

function toPublicFarmerProfile(profile) {
  if (!profile) return profile;
  const sanitized = { ...profile };
  delete sanitized.password_hash;
  sanitized.id_number = decryptSensitiveField(sanitized.id_number);
  sanitized.date_of_birth = decryptSensitiveField(sanitized.date_of_birth);
  return sanitized;
}

/**
 * Hash password using PBKDF2 (with backward-compatible verification support)
 */
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.pbkdf2Sync(password, salt, 120000, 64, 'sha512').toString('hex');
  return `pbkdf2$${salt}$${derived}`;
}

/**
 * Verify password
 */
function verifyPassword(password, hash) {
  if (!hash) return false;

  if (hash.startsWith('pbkdf2$')) {
    const [, salt, expected] = hash.split('$');
    if (!salt || !expected) return false;
    const actual = crypto.pbkdf2Sync(password, salt, 120000, 64, 'sha512').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'));
  }

  // Legacy hash support (sha256 without salt).
  const legacy = crypto.createHash('sha256').update(password).digest('hex');
  return legacy === hash;
}

/**
 * Enhanced Farmer Database Schema
 */
export function initializeEnhancedFarmerDatabase(db) {
  db.serialize(() => {
    // Main farmers profile table
    db.run(`CREATE TABLE IF NOT EXISTS farmer_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      farmer_id TEXT UNIQUE NOT NULL,
      phone_number TEXT UNIQUE NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      email TEXT,
      date_of_birth DATE,
      gender TEXT,
      id_number TEXT,
      national_id_type TEXT DEFAULT 'national_id',
      sub_county TEXT NOT NULL,
      ward TEXT,
      soil_type TEXT,
      farm_size REAL,
      farm_size_unit TEXT DEFAULT 'acres',
      water_source TEXT,
      water_source_type TEXT,
      crops_grown TEXT,
      livestock_kept TEXT,
      annual_income REAL,
      budget REAL,
      preferred_language TEXT DEFAULT 'english',
      contact_method TEXT DEFAULT 'sms',
      passport_photo_data LONGBLOB,
      passport_photo_url TEXT,
      passport_photo_mime_type TEXT,
      photo_uploaded_date DATETIME,
      profile_completion_percentage INTEGER DEFAULT 0,
      profile_verified BOOLEAN DEFAULT 0,
      verified_by TEXT,
      verified_at DATETIME,
      is_active BOOLEAN DEFAULT 1,
      last_updated_by TEXT,
      last_login DATETIME,
      login_count INTEGER DEFAULT 0,
      failed_login_attempts INTEGER DEFAULT 0,
      locked_until DATETIME,
      password_changed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) console.error('Error creating farmer_profiles table:', err);
      else console.log('✅ Enhanced farmer_profiles table ready');
    });

    // Farmer activity log
    db.run(`CREATE TABLE IF NOT EXISTS farmer_activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      farmer_id TEXT NOT NULL,
      activity_type TEXT NOT NULL,
      description TEXT,
      metadata TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(farmer_id) REFERENCES farmer_profiles(farmer_id) ON DELETE CASCADE
    )`, (err) => {
      if (err) console.error('Error creating farmer_activity_logs table:', err);
      else console.log('✅ farmer_activity_logs table ready');
    });

    // Farmer farm details table
    db.run(`CREATE TABLE IF NOT EXISTS farmer_farms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      farmer_id TEXT NOT NULL,
      farm_name TEXT,
      farm_location TEXT,
      farm_size REAL,
      farm_size_unit TEXT DEFAULT 'acres',
      soil_type TEXT,
      water_source TEXT,
      terrain_type TEXT,
      registration_number TEXT,
      is_primary BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(farmer_id) REFERENCES farmer_profiles(farmer_id) ON DELETE CASCADE
    )`, (err) => {
      if (err) console.error('Error creating farmer_farms table:', err);
      else console.log('✅ farmer_farms table ready');
    });

    // Password reset tokens for farmers
    db.run(`CREATE TABLE IF NOT EXISTS farmer_password_resets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      farmer_id TEXT NOT NULL,
      reset_code TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      used_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(farmer_id) REFERENCES farmer_profiles(farmer_id) ON DELETE CASCADE
    )`, (err) => {
      if (err) console.error('Error creating farmer_password_resets table:', err);
      else console.log('✅ farmer_password_resets table ready');
    });

    db.run(`CREATE TABLE IF NOT EXISTS farmer_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      farmer_id TEXT NOT NULL,
      session_id TEXT UNIQUE NOT NULL,
      role TEXT DEFAULT 'farmer' CHECK(role IN ('farmer', 'admin')),
      ip_address TEXT,
      user_agent TEXT,
      last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL,
      is_revoked BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(farmer_id) REFERENCES farmer_profiles(farmer_id) ON DELETE CASCADE
    )`, (err) => {
      if (err) console.error('Error creating farmer_sessions table:', err);
      else console.log('✅ farmer_sessions table ready');
    });

    db.run(`CREATE TABLE IF NOT EXISTS farmer_security_audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      farmer_id TEXT,
      actor_role TEXT NOT NULL,
      action TEXT NOT NULL,
      status TEXT DEFAULT 'success',
      details TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) console.error('Error creating farmer_security_audit_logs table:', err);
      else console.log('✅ farmer_security_audit_logs table ready');
    });

    // Backward compatible migration for older databases.
    db.run(`ALTER TABLE farmer_profiles ADD COLUMN failed_login_attempts INTEGER DEFAULT 0`, () => {});
    db.run(`ALTER TABLE farmer_profiles ADD COLUMN locked_until DATETIME`, () => {});
    db.run(`ALTER TABLE farmer_profiles ADD COLUMN password_changed_at DATETIME`, () => {});

    // Create indexes for performance
    db.run(`CREATE INDEX IF NOT EXISTS idx_farmer_profiles_phone ON farmer_profiles(phone_number)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_farmer_profiles_email ON farmer_profiles(email)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_farmer_profiles_subcounty ON farmer_profiles(sub_county)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_farmer_profiles_active ON farmer_profiles(is_active)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_farmer_profiles_farmer_id ON farmer_profiles(farmer_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_farmer_activity_logs_farmer ON farmer_activity_logs(farmer_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_farmer_farms_farmer ON farmer_farms(farmer_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_farmer_password_resets_farmer ON farmer_password_resets(farmer_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_farmer_sessions_farmer ON farmer_sessions(farmer_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_farmer_sessions_session ON farmer_sessions(session_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_farmer_audit_farmer ON farmer_security_audit_logs(farmer_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_farmer_audit_created ON farmer_security_audit_logs(created_at)`);
  });
}

/**
 * Generate unique farmer ID
 */
function generateFarmerId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `FR-${timestamp}-${random}`.toUpperCase();
}

/**
 * Calculate profile completion percentage
 */
function calculateProfileCompletion(profileData) {
  const requiredFields = [
    'firstName', 'lastName', 'email', 'subCounty', 'farmSize'
  ];
  
  const optionalFields = [
    'dateOfBirth', 'gender', 'idNumber', 'ward', 'soilType', 
    'waterSource', 'cropsGrown', 'livestockKept', 'annualIncome', 'budget'
  ];

  let completedRequired = 0;
  requiredFields.forEach(field => {
    if (profileData[field] && profileData[field].toString().trim() !== '') {
      completedRequired++;
    }
  });

  let completedOptional = 0;
  optionalFields.forEach(field => {
    if (profileData[field] && profileData[field].toString().trim() !== '') {
      completedOptional++;
    }
  });

  const requiredPercentage = (completedRequired / requiredFields.length) * 60;
  const optionalPercentage = (completedOptional / optionalFields.length) * 40;
  
  return Math.round(requiredPercentage + optionalPercentage);
}

/**
 * Register a new farmer with full profile
 */
export async function registerFarmerProfile(dbAsync, farmerData) {
  try {
    const {
      phoneNumber,
      firstName,
      lastName,
      password,
      email,
      dateOfBirth,
      gender,
      idNumber,
      nationalIdType = 'national_id',
      subCounty,
      ward,
      soilType,
      farmSize,
      farmSizeUnit = 'acres',
      waterSource,
      waterSourceType,
      cropsGrown,
      livestockKept,
      annualIncome,
      budget,
      preferredLanguage = 'english',
      contactMethod = 'sms',
      passportPhotoUrl,
      passportPhotoMimeType
    } = farmerData;

    // Validation
    if (!phoneNumber || !firstName || !lastName || !subCounty || !farmSize || !password) {
      throw new Error('Missing required fields: phoneNumber, firstName, lastName, subCounty, farmSize, password');
    }

    const passwordPolicy = validatePasswordPolicy(password);
    if (!passwordPolicy.valid) {
      throw new Error(`Password policy failed: ${passwordPolicy.reasons.join('; ')}`);
    }

    // Check if farmer already exists
    const existingFarmer = await dbAsync.get(
      `SELECT farmer_id FROM farmer_profiles WHERE phone_number = ? OR email = ?`,
      [phoneNumber, email]
    );
    
    if (existingFarmer) {
      throw new Error('Farmer with this phone number or email already exists');
    }

    const farmerId = generateFarmerId();
    const passwordHash = hashPassword(password);
    
    const profileData = {
      firstName, lastName, email, dateOfBirth, gender, idNumber,
      subCounty, ward, soilType, farmSize, waterSource, 
      cropsGrown, livestockKept, annualIncome, budget
    };
    const completionPercentage = calculateProfileCompletion(profileData);

    const photoUploadedDate = passportPhotoUrl ? new Date().toISOString() : null;

    const encryptedDateOfBirth = dateOfBirth ? encryptSensitiveField(dateOfBirth) : null;
    const encryptedIdNumber = idNumber ? encryptSensitiveField(idNumber) : null;

    const result = await dbAsync.run(
      `INSERT INTO farmer_profiles (
        farmer_id, phone_number, first_name, last_name, password_hash, email, date_of_birth,
        gender, id_number, national_id_type, sub_county, ward, soil_type,
        farm_size, farm_size_unit, water_source, water_source_type,
        crops_grown, livestock_kept, annual_income, budget,
        preferred_language, contact_method, passport_photo_url, passport_photo_mime_type,
        photo_uploaded_date, profile_completion_percentage
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        farmerId, phoneNumber, firstName, lastName, passwordHash, email, encryptedDateOfBirth,
        gender, encryptedIdNumber, nationalIdType, subCounty, ward, soilType,
        farmSize, farmSizeUnit, waterSource, waterSourceType,
        cropsGrown, livestockKept, annualIncome, budget,
        preferredLanguage, contactMethod, passportPhotoUrl, passportPhotoMimeType,
        photoUploadedDate, completionPercentage
      ]
    );

    // Log activity
    await logFarmerActivity(dbAsync, farmerId, 'PROFILE_CREATED', 'Farmer profile registered');

    return {
      farmerId,
      phoneNumber,
      firstName,
      lastName,
      profileCompletion: completionPercentage,
      passportPhotoUrl,
      message: 'Farmer profile registered successfully'
    };
  } catch (error) {
    throw new Error(`Failed to register farmer profile: ${error.message}`);
  }
}

/**
 * Get farmer profile by phone number
 */
export async function getFarmerProfileByPhone(dbAsync, phoneNumber) {
  try {
    const profile = await dbAsync.get(
      `SELECT * FROM farmer_profiles WHERE phone_number = ? AND is_active = 1`,
      [phoneNumber]
    );
    return toPublicFarmerProfile(profile);
  } catch (error) {
    throw new Error(`Failed to get farmer profile: ${error.message}`);
  }
}

/**
 * Get farmer profile by farmer ID
 */
export async function getFarmerProfileById(dbAsync, farmerId) {
  try {
    const profile = await dbAsync.get(
      `SELECT * FROM farmer_profiles WHERE farmer_id = ? AND is_active = 1`,
      [farmerId]
    );

    if (!profile) return null;

    // Get associated farms
    const farms = await dbAsync.all(
      `SELECT * FROM farmer_farms WHERE farmer_id = ?`,
      [farmerId]
    );

    // Get recent activity
    const recentActivity = await dbAsync.all(
      `SELECT * FROM farmer_activity_logs WHERE farmer_id = ? ORDER BY created_at DESC LIMIT 10`,
      [farmerId]
    );

    return {
      ...toPublicFarmerProfile(profile),
      farms,
      recentActivity
    };
  } catch (error) {
    throw new Error(`Failed to get farmer profile: ${error.message}`);
  }
}

/**
 * Update farmer profile
 */
export async function updateFarmerProfile(dbAsync, farmerId, profileData, updatedBy) {
  try {
    const {
      firstName,
      lastName,
      email,
      dateOfBirth,
      gender,
      idNumber,
      subCounty,
      ward,
      soilType,
      farmSize,
      farmSizeUnit,
      waterSource,
      waterSourceType,
      cropsGrown,
      livestockKept,
      annualIncome,
      budget,
      preferredLanguage,
      contactMethod
    } = profileData;

    // Get current profile for completion calculation
    const currentProfile = await dbAsync.get(
      `SELECT * FROM farmer_profiles WHERE farmer_id = ?`,
      [farmerId]
    );

    if (!currentProfile) {
      throw new Error('Farmer not found');
    }

    // Merge and calculate new completion
    const mergedData = { ...toPublicFarmerProfile(currentProfile), ...profileData };
    const completionPercentage = calculateProfileCompletion(mergedData);

    const updates = [];
    const values = [];

    if (firstName !== undefined) {
      updates.push('first_name = ?');
      values.push(firstName);
    }
    if (lastName !== undefined) {
      updates.push('last_name = ?');
      values.push(lastName);
    }
    if (email !== undefined) {
      updates.push('email = ?');
      values.push(email);
    }
    if (dateOfBirth !== undefined) {
      updates.push('date_of_birth = ?');
      values.push(dateOfBirth ? encryptSensitiveField(dateOfBirth) : null);
    }
    if (gender !== undefined) {
      updates.push('gender = ?');
      values.push(gender);
    }
    if (idNumber !== undefined) {
      updates.push('id_number = ?');
      values.push(idNumber ? encryptSensitiveField(idNumber) : null);
    }
    if (subCounty !== undefined) {
      updates.push('sub_county = ?');
      values.push(subCounty);
    }
    if (ward !== undefined) {
      updates.push('ward = ?');
      values.push(ward);
    }
    if (soilType !== undefined) {
      updates.push('soil_type = ?');
      values.push(soilType);
    }
    if (farmSize !== undefined) {
      updates.push('farm_size = ?');
      values.push(farmSize);
    }
    if (farmSizeUnit !== undefined) {
      updates.push('farm_size_unit = ?');
      values.push(farmSizeUnit);
    }
    if (waterSource !== undefined) {
      updates.push('water_source = ?');
      values.push(waterSource);
    }
    if (waterSourceType !== undefined) {
      updates.push('water_source_type = ?');
      values.push(waterSourceType);
    }
    if (cropsGrown !== undefined) {
      updates.push('crops_grown = ?');
      values.push(cropsGrown);
    }
    if (livestockKept !== undefined) {
      updates.push('livestock_kept = ?');
      values.push(livestockKept);
    }
    if (annualIncome !== undefined) {
      updates.push('annual_income = ?');
      values.push(annualIncome);
    }
    if (budget !== undefined) {
      updates.push('budget = ?');
      values.push(budget);
    }
    if (preferredLanguage !== undefined) {
      updates.push('preferred_language = ?');
      values.push(preferredLanguage);
    }
    if (contactMethod !== undefined) {
      updates.push('contact_method = ?');
      values.push(contactMethod);
    }

    if (updates.length === 0) {
      throw new Error('No fields to update');
    }

    updates.push('profile_completion_percentage = ?');
    values.push(completionPercentage);

    updates.push('last_updated_by = ?');
    values.push(updatedBy);

    updates.push('updated_at = CURRENT_TIMESTAMP');

    values.push(farmerId);

    const sql = `UPDATE farmer_profiles SET ${updates.join(', ')} WHERE farmer_id = ?`;
    await dbAsync.run(sql, values);

    // Log activity
    await logFarmerActivity(dbAsync, farmerId, 'PROFILE_UPDATED', 'Farmer profile updated', { updatedBy });

    return {
      farmerId,
      message: 'Farmer profile updated successfully',
      profileCompletion: completionPercentage
    };
  } catch (error) {
    throw new Error(`Failed to update farmer profile: ${error.message}`);
  }
}

/**
 * Get all farmer profiles with pagination and filters
 */
export async function getAllFarmerProfiles(dbAsync, filters = {}, limit = 50, offset = 0) {
  try {
    let query = `SELECT * FROM farmer_profiles WHERE is_active = 1`;
    const params = [];

    if (filters.subCounty) {
      query += ` AND sub_county = ?`;
      params.push(filters.subCounty);
    }

    if (filters.soilType) {
      query += ` AND soil_type = ?`;
      params.push(filters.soilType);
    }

    if (filters.searchTerm) {
      query += ` AND (first_name LIKE ? OR last_name LIKE ? OR phone_number LIKE ? OR email LIKE ?)`;
      const searchTerm = `%${filters.searchTerm}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (filters.verified !== undefined) {
      query += ` AND profile_verified = ?`;
      params.push(filters.verified ? 1 : 0);
    }

    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as count');
    const countResult = await dbAsync.get(countQuery, params);

    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const profiles = (await dbAsync.all(query, params)).map((profile) => toPublicFarmerProfile(profile));

    return {
      data: profiles,
      pagination: {
        limit,
        offset,
        total: countResult.count,
        hasMore: offset + limit < countResult.count
      }
    };
  } catch (error) {
    throw new Error(`Failed to get farmer profiles: ${error.message}`);
  }
}

/**
 * Verify farmer profile
 */
export async function verifyFarmerProfile(dbAsync, farmerId, verifiedBy) {
  try {
    await dbAsync.run(
      `UPDATE farmer_profiles 
       SET profile_verified = 1, verified_by = ?, verified_at = CURRENT_TIMESTAMP
       WHERE farmer_id = ?`,
      [verifiedBy, farmerId]
    );

    await logFarmerActivity(dbAsync, farmerId, 'PROFILE_VERIFIED', 'Farmer profile verified', { verifiedBy });

    return { message: 'Farmer profile verified successfully' };
  } catch (error) {
    throw new Error(`Failed to verify farmer profile: ${error.message}`);
  }
}

/**
 * Deactivate farmer profile
 */
export async function deactivateFarmerProfile(dbAsync, farmerId, reason, deactivatedBy) {
  try {
    await dbAsync.run(
      `UPDATE farmer_profiles 
       SET is_active = 0, last_updated_by = ?
       WHERE farmer_id = ?`,
      [deactivatedBy, farmerId]
    );

    await logFarmerActivity(dbAsync, farmerId, 'PROFILE_DEACTIVATED', reason || 'Profile deactivated', { deactivatedBy });

    return { message: 'Farmer profile deactivated successfully' };
  } catch (error) {
    throw new Error(`Failed to deactivate farmer profile: ${error.message}`);
  }
}

/**
 * Reactivate farmer profile
 */
export async function reactivateFarmerProfile(dbAsync, farmerId, reactivatedBy) {
  try {
    await dbAsync.run(
      `UPDATE farmer_profiles 
       SET is_active = 1, last_updated_by = ?
       WHERE farmer_id = ?`,
      [reactivatedBy, farmerId]
    );

    await logFarmerActivity(dbAsync, farmerId, 'PROFILE_REACTIVATED', 'Profile reactivated', { reactivatedBy });

    return { message: 'Farmer profile reactivated successfully' };
  } catch (error) {
    throw new Error(`Failed to reactivate farmer profile: ${error.message}`);
  }
}

/**
 * Log farmer activity
 */
async function logFarmerActivity(dbAsync, farmerId, activityType, description, metadata = {}) {
  try {
    await dbAsync.run(
      `INSERT INTO farmer_activity_logs (farmer_id, activity_type, description, metadata)
       VALUES (?, ?, ?, ?)`,
      [farmerId, activityType, description, JSON.stringify(metadata)]
    );
  } catch (error) {
    console.error('Failed to log farmer activity:', error);
  }
}

/**
 * Get farmer statistics
 */
export async function getFarmerStatistics(dbAsync) {
  try {
    const totalFarmers = await dbAsync.get(
      `SELECT COUNT(*) as count FROM farmer_profiles WHERE is_active = 1`
    );

    const verifiedFarmers = await dbAsync.get(
      `SELECT COUNT(*) as count FROM farmer_profiles WHERE profile_verified = 1 AND is_active = 1`
    );

    const farmersBySubCounty = await dbAsync.all(
      `SELECT sub_county, COUNT(*) as count FROM farmer_profiles 
       WHERE is_active = 1 GROUP BY sub_county ORDER BY count DESC LIMIT 10`
    );

    const farmersBySoilType = await dbAsync.all(
      `SELECT soil_type, COUNT(*) as count FROM farmer_profiles 
       WHERE is_active = 1 AND soil_type IS NOT NULL GROUP BY soil_type ORDER BY count DESC`
    );

    const avgFarmSize = await dbAsync.get(
      `SELECT AVG(farm_size) as average, MIN(farm_size) as min, MAX(farm_size) as max 
       FROM farmer_profiles WHERE farm_size > 0 AND is_active = 1`
    );

    const avgBudget = await dbAsync.get(
      `SELECT AVG(budget) as average, MIN(budget) as min, MAX(budget) as max 
       FROM farmer_profiles WHERE budget > 0 AND is_active = 1`
    );

    const profileCompletionStats = await dbAsync.get(
      `SELECT AVG(profile_completion_percentage) as avg_completion FROM farmer_profiles WHERE is_active = 1`
    );

    return {
      totalFarmers: totalFarmers.count,
      verifiedFarmers: verifiedFarmers.count,
      verificationRate: totalFarmers.count > 0 ? Math.round((verifiedFarmers.count / totalFarmers.count) * 100) : 0,
      farmersBySubCounty,
      farmersBySoilType,
      farmSizeStats: {
        average: avgFarmSize.average || 0,
        min: avgFarmSize.min || 0,
        max: avgFarmSize.max || 0
      },
      budgetStats: {
        average: avgBudget.average || 0,
        min: avgBudget.min || 0,
        max: avgBudget.max || 0
      },
      profileCompletionStats: {
        average: Math.round(profileCompletionStats.avg_completion) || 0
      }
    };
  } catch (error) {
    throw new Error(`Failed to get farmer statistics: ${error.message}`);
  }
}

/**
 * Search farmers
 */
export async function searchFarmerProfiles(dbAsync, searchTerm) {
  try {
    const rows = await dbAsync.all(
      `SELECT * FROM farmer_profiles 
       WHERE is_active = 1 AND (
         first_name LIKE ? OR 
         last_name LIKE ? OR 
         phone_number LIKE ? OR 
         email LIKE ? OR 
         farmer_id LIKE ?
       ) ORDER BY created_at DESC LIMIT 50`,
      [
        `%${searchTerm}%`,
        `%${searchTerm}%`,
        `%${searchTerm}%`,
        `%${searchTerm}%`,
        `%${searchTerm}%`
      ]
    );
    return rows.map((profile) => toPublicFarmerProfile(profile));
  } catch (error) {
    throw new Error(`Failed to search farmer profiles: ${error.message}`);
  }
}

/**
 * Export farmer data
 */
export async function exportFarmerData(dbAsync, filters = {}) {
  try {
    const profiles = await getAllFarmerProfiles(dbAsync, filters, 10000, 0);
    return profiles.data;
  } catch (error) {
    throw new Error(`Failed to export farmer data: ${error.message}`);
  }
}

/**
 * Register a farmer group with members
 */
export async function registerFarmerGroup(dbAsync, groupData) {
	  try {
	    const {
	      groupName,
	      groupRegNumber,
	      groupDescription,
	      leaderFirstName,
	      leaderLastName,
	      leaderPhone,
	      leaderEmail,
	      subCounty,
	      ward,
	      members,
	      leaderPhotoUrl,
	      leaderPhotoMimeType,
	      password
	    } = groupData;

	    // SQLite-only schema bootstrap (Postgres uses migrations in backend/db/postgres-schema.js).
	    if (dbAsync.dialect === 'sqlite') {
	      await dbAsync.run(`
	        CREATE TABLE IF NOT EXISTS farmer_groups (
	          id INTEGER PRIMARY KEY AUTOINCREMENT,
	          group_name TEXT NOT NULL,
	          group_reg_number TEXT,
	          group_description TEXT,
	          leader_first_name TEXT NOT NULL,
	          leader_last_name TEXT NOT NULL,
	          leader_phone TEXT UNIQUE NOT NULL,
	          leader_email TEXT,
	          sub_county TEXT NOT NULL,
	          ward TEXT,
	          leader_photo_url TEXT,
	          leader_photo_mime_type TEXT,
	          password_hash TEXT,
	          member_count INTEGER DEFAULT 0,
	          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
	          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
	          is_active BOOLEAN DEFAULT 1
	        )
	      `);

	      try {
	        await dbAsync.run(`ALTER TABLE farmer_groups ADD COLUMN password_hash TEXT`);
	      } catch (error) {
	        // Ignore if column already exists.
	      }
	    }

	    if (!password) {
	      throw new Error('Password is required for group registration');
	    }

	    const passwordHash = hashPassword(password);

	    // Check if group already exists
	    const existingGroup = await dbAsync.get(
	      `SELECT id FROM farmer_groups WHERE leader_phone = ?`,
	      [leaderPhone]
    );

    if (existingGroup) {
      throw new Error(`Group with phone ${leaderPhone} already exists`);
    }

	    if (dbAsync.dialect === 'sqlite') {
	      await dbAsync.run(`
	        CREATE TABLE IF NOT EXISTS group_members (
	          id INTEGER PRIMARY KEY AUTOINCREMENT,
	          group_id INTEGER NOT NULL,
	          member_name TEXT NOT NULL,
	          member_phone TEXT NOT NULL,
	          farm_size REAL,
	          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
	          FOREIGN KEY (group_id) REFERENCES farmer_groups(id)
	        )
	      `);
	    }

	    // Insert group
	    const groupResult = await dbAsync.run(
	      `INSERT INTO farmer_groups (group_name, group_reg_number, group_description, 
	       leader_first_name, leader_last_name, leader_phone, leader_email, 
	       sub_county, ward, leader_photo_url, leader_photo_mime_type, password_hash, member_count)
	       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
	      [
	        groupName,
	        groupRegNumber,
	        groupDescription,
	        leaderFirstName,
	        leaderLastName,
	        leaderPhone,
	        leaderEmail,
	        subCounty,
	        ward,
	        leaderPhotoUrl || null,
	        leaderPhotoMimeType || null,
	        passwordHash,
	        members.length
	      ]
	    );

    const groupId = groupResult.lastID;

    // Insert group members
    for (const member of members) {
      await dbAsync.run(
        `INSERT INTO group_members (group_id, member_name, member_phone, farm_size)
         VALUES (?, ?, ?, ?)`,
        [groupId, member.name, member.phone, member.farmSize || 0]
      );
    }

	    // Fetch and return the created group with members
	    const group = await dbAsync.get(
	      `SELECT * FROM farmer_groups WHERE id = ?`,
	      [groupId]
	    );

    const groupMembers = await dbAsync.all(
      `SELECT * FROM group_members WHERE group_id = ?`,
      [groupId]
    );

	    return {
	      group_id: group.id,
	      group_name: group.group_name,
	      group_reg_number: group.group_reg_number,
	      group_description: group.group_description,
	      leader_first_name: group.leader_first_name,
	      leader_last_name: group.leader_last_name,
	      leader_name: `${group.leader_first_name} ${group.leader_last_name}`,
	      leader_phone: group.leader_phone,
	      leader_email: group.leader_email,
	      sub_county: group.sub_county,
	      ward: group.ward,
	      leader_photo_url: group.leader_photo_url,
	      leader_photo_mime_type: group.leader_photo_mime_type,
	      member_count: groupMembers.length,
	      members: groupMembers,
	      created_at: group.created_at
	    };
	    } catch (error) {
	    throw new Error(`Failed to register farmer group: ${error.message}`);
	    }
	    }

/**
 * Login a farmer group (leader phone/email + password)
 */
export async function loginFarmerGroup(dbAsync, loginData) {
  try {
    const { phoneOrEmail, password } = loginData;

    if (!phoneOrEmail || !password) {
      throw new Error('Phone/Email and password are required');
    }

    const group = await dbAsync.get(
      `SELECT * FROM farmer_groups
       WHERE (leader_phone = ? OR leader_email = ?) AND is_active = 1`,
      [phoneOrEmail, phoneOrEmail]
    );

    if (!group) {
      throw new Error('Invalid phone/email or password');
    }

    if (!verifyPassword(password, group.password_hash)) {
      throw new Error('Invalid phone/email or password');
    }

    const groupMembers = await dbAsync.all(
      `SELECT * FROM group_members WHERE group_id = ?`,
      [group.id]
    );

    return {
      group_id: group.id,
      group_name: group.group_name,
      group_reg_number: group.group_reg_number,
      group_description: group.group_description,
      leader_first_name: group.leader_first_name,
      leader_last_name: group.leader_last_name,
      leader_name: `${group.leader_first_name} ${group.leader_last_name}`,
      leader_phone: group.leader_phone,
      leader_email: group.leader_email,
      sub_county: group.sub_county,
      ward: group.ward,
      leader_photo_url: group.leader_photo_url,
      leader_photo_mime_type: group.leader_photo_mime_type,
      member_count: groupMembers.length,
      members: groupMembers,
      created_at: group.created_at
    };
  } catch (error) {
    throw new Error(`Failed to login farmer group: ${error.message}`);
  }
}

    /**
    * Login farmer with phone/email and password
    */
export async function loginFarmer(dbAsync, loginData) {
  try {
    const { phoneOrEmail, password } = loginData;

    if (!phoneOrEmail || !password) {
      throw new Error('Phone/Email and password are required');
    }

    const farmer = await dbAsync.get(
      `SELECT * FROM farmer_profiles WHERE (phone_number = ? OR email = ?) AND is_active = 1`,
      [phoneOrEmail, phoneOrEmail]
    );

    if (!farmer) {
      throw new Error('Invalid phone/email or password');
    }

    if (farmer.locked_until && new Date(farmer.locked_until).getTime() > Date.now()) {
      const retryAfterSec = Math.ceil((new Date(farmer.locked_until).getTime() - Date.now()) / 1000);
      throw new Error(`Account temporarily locked. Try again in ${retryAfterSec} seconds`);
    }

    if (!verifyPassword(password, farmer.password_hash)) {
      const failedAttempts = Number(farmer.failed_login_attempts || 0) + 1;
      const shouldLock = failedAttempts >= FARMER_LOCKOUT_MAX_ATTEMPTS;
      const lockedUntil = shouldLock
        ? new Date(Date.now() + FARMER_LOCKOUT_MINUTES * 60 * 1000).toISOString()
        : null;

      await dbAsync.run(
        `UPDATE farmer_profiles
         SET failed_login_attempts = ?,
             locked_until = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE farmer_id = ?`,
        [failedAttempts, lockedUntil, farmer.farmer_id]
      );

      throw new Error('Invalid phone/email or password');
    }

    if (!String(farmer.password_hash || '').startsWith('pbkdf2$')) {
      const upgradedHash = hashPassword(password);
      await dbAsync.run(
        `UPDATE farmer_profiles
         SET password_hash = ?, password_changed_at = COALESCE(password_changed_at, CURRENT_TIMESTAMP)
         WHERE farmer_id = ?`,
        [upgradedHash, farmer.farmer_id]
      );
    }

    await dbAsync.run(
      `UPDATE farmer_profiles
       SET last_login = CURRENT_TIMESTAMP,
           login_count = login_count + 1,
           failed_login_attempts = 0,
           locked_until = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE farmer_id = ?`,
      [farmer.farmer_id]
    );

    return {
      success: true,
      farmerId: farmer.farmer_id,
      firstName: farmer.first_name,
      lastName: farmer.last_name,
      phoneNumber: farmer.phone_number,
      email: farmer.email,
      passportPhotoUrl: farmer.passport_photo_url,
      passportPhotoMimeType: farmer.passport_photo_mime_type,
      photoUploadedDate: farmer.photo_uploaded_date,
      role: 'farmer',
      message: 'Login successful'
    };
  } catch (error) {
    throw new Error(`Login failed: ${error.message}`);
  }
}

/**
 * Create and persist a password reset code for a farmer
 */
export async function requestFarmerPasswordReset(dbAsync, phoneOrEmail) {
  try {
    if (!phoneOrEmail) {
      throw new Error('Phone number or email is required');
    }

    const farmer = await dbAsync.get(
      `SELECT farmer_id, email, first_name FROM farmer_profiles
       WHERE is_active = 1 AND (phone_number = ? OR email = ?)`,
      [phoneOrEmail, phoneOrEmail]
    );

    if (!farmer) {
      return { success: true, userExists: false };
    }

    if (!farmer.email) {
      return { success: true, userExists: true, hasEmail: false };
    }

    const resetCode = `${Math.floor(100000 + Math.random() * 900000)}`;
    const expiresAt = new Date(Date.now() + (10 * 60 * 1000)).toISOString();

    // Invalidate previous unused codes
    await dbAsync.run(
      `UPDATE farmer_password_resets
       SET used_at = CURRENT_TIMESTAMP
       WHERE farmer_id = ? AND used_at IS NULL`,
      [farmer.farmer_id]
    );

    await dbAsync.run(
      `INSERT INTO farmer_password_resets (farmer_id, reset_code, expires_at)
       VALUES (?, ?, ?)`,
      [farmer.farmer_id, resetCode, expiresAt]
    );

    return {
      success: true,
      userExists: true,
      hasEmail: true,
      farmerId: farmer.farmer_id,
      email: farmer.email,
      firstName: farmer.first_name,
      resetCode,
      expiresAt
    };
  } catch (error) {
    throw new Error(`Failed to request password reset: ${error.message}`);
  }
}

/**
 * Reset farmer password using OTP code
 */
export async function resetFarmerPassword(dbAsync, resetData) {
  try {
    const { phoneOrEmail, resetCode, newPassword } = resetData;

    if (!phoneOrEmail || !resetCode || !newPassword) {
      throw new Error('Phone/Email, reset code, and new password are required');
    }

    const policy = validatePasswordPolicy(newPassword);
    if (!policy.valid) {
      throw new Error(`New password does not meet policy: ${policy.reasons.join('; ')}`);
    }

    const farmer = await dbAsync.get(
      `SELECT farmer_id FROM farmer_profiles
       WHERE is_active = 1 AND (phone_number = ? OR email = ?)`,
      [phoneOrEmail, phoneOrEmail]
    );

    if (!farmer) {
      throw new Error('Invalid reset request');
    }

    const resetRecord = await dbAsync.get(
      `SELECT id, expires_at
       FROM farmer_password_resets
       WHERE farmer_id = ? AND reset_code = ? AND used_at IS NULL
       ORDER BY created_at DESC
       LIMIT 1`,
      [farmer.farmer_id, resetCode]
    );

    if (!resetRecord) {
      throw new Error('Invalid or expired reset code');
    }

    if (new Date(resetRecord.expires_at).getTime() < Date.now()) {
      throw new Error('Reset code has expired');
    }

    const newHash = hashPassword(newPassword);

    await dbAsync.run(
      `UPDATE farmer_profiles
       SET password_hash = ?, password_changed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE farmer_id = ?`,
      [newHash, farmer.farmer_id]
    );

    await dbAsync.run(
      `UPDATE farmer_password_resets
       SET used_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [resetRecord.id]
    );

    await logFarmerActivity(
      dbAsync,
      farmer.farmer_id,
      'PASSWORD_RESET',
      'Farmer password reset successfully'
    );

    return { success: true, message: 'Password reset successful' };
  } catch (error) {
    throw new Error(`Failed to reset password: ${error.message}`);
  }
}

export async function createFarmerSession(dbAsync, farmerId, sessionId, role = 'farmer', ipAddress = null, userAgent = null) {
  const expiresAt = new Date(Date.now() + FARMER_SESSION_TTL_HOURS * 60 * 60 * 1000).toISOString();
  await dbAsync.run(
    `INSERT INTO farmer_sessions (farmer_id, session_id, role, ip_address, user_agent, expires_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [farmerId, sessionId, role, ipAddress, userAgent, expiresAt]
  );
  return { farmerId, sessionId, expiresAt };
}

export async function getFarmerSession(dbAsync, sessionId) {
  return dbAsync.get(
    `SELECT * FROM farmer_sessions
     WHERE session_id = ? AND is_revoked = 0 AND expires_at > CURRENT_TIMESTAMP`,
    [sessionId]
  );
}

export async function touchFarmerSession(dbAsync, sessionId) {
  await dbAsync.run(
    `UPDATE farmer_sessions
     SET last_activity = CURRENT_TIMESTAMP
     WHERE session_id = ?`,
    [sessionId]
  );
}

export async function revokeFarmerSession(dbAsync, sessionId) {
  await dbAsync.run(
    `UPDATE farmer_sessions
     SET is_revoked = 1, last_activity = CURRENT_TIMESTAMP
     WHERE session_id = ?`,
    [sessionId]
  );
}

export async function logFarmerSecurityEvent(
  dbAsync,
  { farmerId = null, actorRole = 'farmer', action, status = 'success', details = {}, ipAddress = null, userAgent = null }
) {
  await dbAsync.run(
    `INSERT INTO farmer_security_audit_logs (farmer_id, actor_role, action, status, details, ip_address, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [farmerId, actorRole, action, status, JSON.stringify(details || {}), ipAddress, userAgent]
  );
}
