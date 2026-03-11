/**
 * Farmer Profile Dashboard Routes
 * Enhanced API endpoints for farmer registration and profile management
 */

import express from 'express';
import * as farmerProfileDB from './farmer-profile-dashboard.js';
import { sanitizeInput, getClientIP, createRateLimitMiddleware } from './admin-middleware.js';
import { enqueueJob } from './job-queue.js';
import { verifyAccessToken } from './admin-auth.js';
import { generateFarmerAccessToken, generateFarmerSessionId, validatePasswordPolicy, verifyFarmerAccessToken } from './farmer-auth.js';
import * as adminDB from './admin-database.js';

const router = express.Router();
const farmerLoginLimiter = createRateLimitMiddleware({
  windowMs: 15 * 60 * 1000,
  maxRequests: 8,
  keyGenerator: (req) => `${getClientIP(req)}:${(req.body?.phoneOrEmail || req.body?.phone || req.body?.email || '').toLowerCase()}`,
  label: 'farmer_login'
});
const farmerResetLimiter = createRateLimitMiddleware({
  windowMs: 15 * 60 * 1000,
  maxRequests: 10,
  keyGenerator: (req) => getClientIP(req),
  label: 'farmer_password_reset'
});

function getBearerToken(req) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice(7).trim();
}

async function authenticateFarmerOrAdmin(req, res, next) {
  try {
    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token is required'
      });
    }

    const adminDecoded = verifyAccessToken(token);
    if (adminDecoded) {
      const sessionId = req.headers['x-session-id'];
      if (!sessionId) {
        return res.status(401).json({
          success: false,
          message: 'Admin session ID is required'
        });
      }

      const adminSession = await adminDB.getAdminSession(req.dbAsync, sessionId);
      if (!adminSession || Number(adminSession.admin_id) !== Number(adminDecoded.adminId)) {
        return res.status(401).json({
          success: false,
          message: 'Admin session invalid or expired'
        });
      }

      req.actor = {
        role: 'admin',
        adminId: adminDecoded.adminId,
        email: adminDecoded.email
      };
      req.admin = adminDecoded;
      return next();
    }

    const farmerDecoded = verifyFarmerAccessToken(token);
    if (!farmerDecoded) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    const sessionId = req.headers['x-farmer-session-id'];
    if (!sessionId) {
      return res.status(401).json({
        success: false,
        message: 'Farmer session ID is required'
      });
    }

    const session = await farmerProfileDB.getFarmerSession(req.dbAsync, sessionId);
    if (!session || session.farmer_id !== farmerDecoded.farmerId) {
      return res.status(401).json({
        success: false,
        message: 'Session invalid or expired'
      });
    }

    await farmerProfileDB.touchFarmerSession(req.dbAsync, sessionId);
    req.actor = {
      role: 'farmer',
      farmerId: farmerDecoded.farmerId,
      phoneNumber: farmerDecoded.phoneNumber,
      email: farmerDecoded.email
    };
    req.farmer = farmerDecoded;
    return next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Authentication check failed'
    });
  }
}

function requireActorRole(allowedRoles = []) {
  return (req, res, next) => {
    const role = req.actor?.role;
    if (!role || !allowedRoles.includes(role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }
    return next();
  };
}

async function auditFarmerRoute(req, action, status = 'success', details = {}) {
  try {
    await farmerProfileDB.logFarmerSecurityEvent(req.dbAsync, {
      farmerId: req.actor?.farmerId || req.params?.farmerId || null,
      actorRole: req.actor?.role || 'anonymous',
      action,
      status,
      details,
      ipAddress: getClientIP(req),
      userAgent: req.headers['user-agent'] || null
    });
  } catch (error) {
    // best effort only
  }
}

function ensureSelfForFarmerIdParam(req, res, next) {
  if (req.actor?.role === 'farmer' && req.params.farmerId !== req.actor.farmerId) {
    return res.status(403).json({
      success: false,
      message: 'You can only access your own profile'
    });
  }
  return next();
}

function ensureSelfForPhoneParam(req, res, next) {
  if (req.actor?.role === 'farmer') {
    const requestedPhone = (req.params.phoneNumber || '').replace(/\s+/g, '');
    const tokenPhone = (req.actor.phoneNumber || '').replace(/\s+/g, '');
    if (!requestedPhone || requestedPhone !== tokenPhone) {
      return res.status(403).json({
        success: false,
        message: 'You can only access your own profile'
      });
    }
  }
  return next();
}

/**
 * POST /api/farmer-profile/register
 * Register a new farmer with complete profile
 */
router.post('/farmer-profile/register', sanitizeInput, async (req, res) => {
  try {
    const {
      phoneNumber,
      firstName,
      lastName,
      email,
      password,
      dateOfBirth,
      gender,
      idNumber,
      nationalIdType,
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
    } = req.body;

    // Validate required fields
    if (!phoneNumber || !firstName || !lastName || !subCounty || !farmSize || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: phoneNumber, firstName, lastName, subCounty, farmSize, email, password'
      });
    }

    const passwordPolicy = validatePasswordPolicy(password);
    if (!passwordPolicy.valid) {
      return res.status(400).json({
        success: false,
        message: `Password policy failed: ${passwordPolicy.reasons.join('; ')}`
      });
    }

    // Handle passport photo if provided (as base64 string)
    let passportPhotoUrl = req.body.passportPhotoUrl || null;
    let passportPhotoMimeType = req.body.passportPhotoMimeType || null;

    const result = await farmerProfileDB.registerFarmerProfile(req.dbAsync, {
      phoneNumber,
      firstName,
      lastName,
      email,
      password,
      dateOfBirth,
      gender,
      idNumber,
      nationalIdType,
      subCounty,
      ward,
      soilType,
      farmSize: parseFloat(farmSize),
      farmSizeUnit,
      waterSource,
      waterSourceType,
      cropsGrown,
      livestockKept,
      annualIncome: annualIncome ? parseFloat(annualIncome) : undefined,
      budget: budget ? parseFloat(budget) : undefined,
      preferredLanguage,
      contactMethod,
      passportPhotoUrl,
      passportPhotoMimeType
    });

    res.status(201).json({
      success: true,
      message: 'Farmer profile registered successfully',
      data: result
    });
  } catch (error) {
    console.error('❌ Farmer profile registration error:', error.message);
    console.error('Full error:', error);
    console.error('Stack:', error.stack);
    
    // Check if error is due to duplicate entry
    if (error.message.includes('already exists')) {
      return res.status(409).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to register farmer profile',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * GET /api/farmer-profile/:farmerId
 * Get complete farmer profile by farmer ID
 */
router.get(
  '/farmer-profile/:farmerId(FR-[A-Za-z0-9-]+)',
  authenticateFarmerOrAdmin,
  requireActorRole(['farmer', 'admin']),
  ensureSelfForFarmerIdParam,
  async (req, res) => {
  try {
    const { farmerId } = req.params;

    if (!farmerId) {
      return res.status(400).json({
        success: false,
        message: 'Farmer ID is required'
      });
    }

    const profile = await farmerProfileDB.getFarmerProfileById(req.dbAsync, farmerId);
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Farmer profile not found'
      });
    }

    res.json({
      success: true,
      data: profile
    });
    await auditFarmerRoute(req, 'profile_read_by_id');
  } catch (error) {
    await auditFarmerRoute(req, 'profile_read_by_id', 'failure', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get farmer profile',
      error: error.message
    });
  }
});

/**
 * GET /api/farmer-profile/phone/:phoneNumber
 * Get farmer profile by phone number
 */
router.get(
  '/farmer-profile/phone/:phoneNumber',
  authenticateFarmerOrAdmin,
  requireActorRole(['farmer', 'admin']),
  ensureSelfForPhoneParam,
  async (req, res) => {
  try {
    const { phoneNumber } = req.params;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    const profile = await farmerProfileDB.getFarmerProfileByPhone(req.dbAsync, phoneNumber);
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Farmer profile not found'
      });
    }

    res.json({
      success: true,
      data: profile
    });
    await auditFarmerRoute(req, 'profile_read_by_phone');
  } catch (error) {
    await auditFarmerRoute(req, 'profile_read_by_phone', 'failure', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get farmer profile',
      error: error.message
    });
  }
});

/**
 * PUT /api/farmer-profile/:farmerId
 * Update farmer profile
 */
router.put(
  '/farmer-profile/:farmerId(FR-[A-Za-z0-9-]+)',
  authenticateFarmerOrAdmin,
  requireActorRole(['farmer', 'admin']),
  ensureSelfForFarmerIdParam,
  sanitizeInput,
  async (req, res) => {
  try {
    const { farmerId } = req.params;

    if (!farmerId) {
      return res.status(400).json({
        success: false,
        message: 'Farmer ID is required'
      });
    }

    // Get current profile to verify it exists
    const profile = await farmerProfileDB.getFarmerProfileById(req.dbAsync, farmerId);
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Farmer profile not found'
      });
    }

    // Prepare update data
    const updateData = {};
    const allowedFields = [
      'firstName', 'lastName', 'email', 'dateOfBirth', 'gender', 'idNumber',
      'subCounty', 'ward', 'soilType', 'farmSize', 'farmSizeUnit',
      'waterSource', 'waterSourceType', 'cropsGrown', 'livestockKept',
      'annualIncome', 'budget', 'preferredLanguage', 'contactMethod'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    // Parse numeric fields
    if (updateData.farmSize) updateData.farmSize = parseFloat(updateData.farmSize);
    if (updateData.annualIncome) updateData.annualIncome = parseFloat(updateData.annualIncome);
    if (updateData.budget) updateData.budget = parseFloat(updateData.budget);

    const result = await farmerProfileDB.updateFarmerProfile(
      req.dbAsync,
      farmerId,
      updateData,
      req.actor?.email || req.actor?.farmerId || 'system'
    );

    // Get updated profile
    const updatedProfile = await farmerProfileDB.getFarmerProfileById(req.dbAsync, farmerId);

    res.json({
      success: true,
      message: 'Farmer profile updated successfully',
      data: {
        ...result,
        profile: updatedProfile
      }
    });
    await auditFarmerRoute(req, 'profile_updated', 'success', { fields: Object.keys(updateData) });
  } catch (error) {
    console.error('Farmer profile update error:', error);
    await auditFarmerRoute(req, 'profile_updated', 'failure', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to update farmer profile',
      error: error.message
    });
  }
});

/**
 * GET /api/farmer-profile
 * Get all farmer profiles with filters and pagination
 */
router.get('/farmer-profile', authenticateFarmerOrAdmin, requireActorRole(['admin']), async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    
    const filters = {};
    if (req.query.subCounty) filters.subCounty = req.query.subCounty;
    if (req.query.soilType) filters.soilType = req.query.soilType;
    if (req.query.searchTerm) filters.searchTerm = req.query.searchTerm;
    if (req.query.verified !== undefined) filters.verified = req.query.verified === 'true';

    const result = await farmerProfileDB.getAllFarmerProfiles(req.dbAsync, filters, limit, offset);

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
    await auditFarmerRoute(req, 'profile_list_view', 'success', { count: result.data.length });
  } catch (error) {
    await auditFarmerRoute(req, 'profile_list_view', 'failure', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get farmer profiles',
      error: error.message
    });
  }
});

/**
 * GET /api/farmer-profile/search/:searchTerm
 * Search farmer profiles
 */
router.get('/farmer-profile/search/:searchTerm', authenticateFarmerOrAdmin, requireActorRole(['admin']), async (req, res) => {
  try {
    const { searchTerm } = req.params;

    if (!searchTerm || searchTerm.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Search term is required'
      });
    }

    const farmers = await farmerProfileDB.searchFarmerProfiles(req.dbAsync, searchTerm);

    res.json({
      success: true,
      data: farmers,
      count: farmers.length
    });
    await auditFarmerRoute(req, 'profile_search', 'success', { count: farmers.length });
  } catch (error) {
    await auditFarmerRoute(req, 'profile_search', 'failure', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to search farmer profiles',
      error: error.message
    });
  }
});

/**
 * POST /api/farmer-profile/:farmerId/verify
 * Verify farmer profile
 */
router.post('/farmer-profile/:farmerId(FR-[A-Za-z0-9-]+)/verify', authenticateFarmerOrAdmin, requireActorRole(['admin']), sanitizeInput, async (req, res) => {
  try {
    const { farmerId } = req.params;

    if (!farmerId) {
      return res.status(400).json({
        success: false,
        message: 'Farmer ID is required'
      });
    }

    const profile = await farmerProfileDB.getFarmerProfileById(req.dbAsync, farmerId);
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Farmer profile not found'
      });
    }

    const result = await farmerProfileDB.verifyFarmerProfile(
      req.dbAsync,
      farmerId,
      req.actor?.email || 'system'
    );

    res.json({
      success: true,
      message: result.message,
      data: {
        farmerId,
        verified: true
      }
    });
    await auditFarmerRoute(req, 'profile_verified', 'success', { farmerId });
  } catch (error) {
    await auditFarmerRoute(req, 'profile_verified', 'failure', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to verify farmer profile',
      error: error.message
    });
  }
});

/**
 * POST /api/farmer-profile/:farmerId/deactivate
 * Deactivate farmer profile
 */
router.post('/farmer-profile/:farmerId(FR-[A-Za-z0-9-]+)/deactivate', authenticateFarmerOrAdmin, requireActorRole(['admin']), sanitizeInput, async (req, res) => {
  try {
    const { farmerId } = req.params;
    const { reason } = req.body;

    if (!farmerId) {
      return res.status(400).json({
        success: false,
        message: 'Farmer ID is required'
      });
    }

    const profile = await farmerProfileDB.getFarmerProfileById(req.dbAsync, farmerId);
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Farmer profile not found'
      });
    }

    const result = await farmerProfileDB.deactivateFarmerProfile(
      req.dbAsync,
      farmerId,
      reason,
      req.actor?.email || 'system'
    );

    res.json({
      success: true,
      message: result.message,
      data: {
        farmerId,
        active: false
      }
    });
    await auditFarmerRoute(req, 'profile_deactivated', 'success', { farmerId });
  } catch (error) {
    await auditFarmerRoute(req, 'profile_deactivated', 'failure', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to deactivate farmer profile',
      error: error.message
    });
  }
});

/**
 * POST /api/farmer-profile/:farmerId/reactivate
 * Reactivate farmer profile
 */
router.post('/farmer-profile/:farmerId(FR-[A-Za-z0-9-]+)/reactivate', authenticateFarmerOrAdmin, requireActorRole(['admin']), sanitizeInput, async (req, res) => {
  try {
    const { farmerId } = req.params;

    if (!farmerId) {
      return res.status(400).json({
        success: false,
        message: 'Farmer ID is required'
      });
    }

    const profile = await farmerProfileDB.getFarmerProfileById(req.dbAsync, farmerId);
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Farmer profile not found'
      });
    }

    const result = await farmerProfileDB.reactivateFarmerProfile(
      req.dbAsync,
      farmerId,
      req.actor?.email || 'system'
    );

    res.json({
      success: true,
      message: result.message,
      data: {
        farmerId,
        active: true
      }
    });
    await auditFarmerRoute(req, 'profile_reactivated', 'success', { farmerId });
  } catch (error) {
    await auditFarmerRoute(req, 'profile_reactivated', 'failure', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to reactivate farmer profile',
      error: error.message
    });
  }
});

/**
 * POST /api/farmer-profile/register-group
 * Register a farmer group with members
 */
router.post('/farmer-profile/register-group', sanitizeInput, async (req, res) => {
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
	    } = req.body;

	    // Validate required fields
	    if (!groupName || !leaderFirstName || !leaderLastName || !leaderPhone || !subCounty || !password) {
	      return res.status(400).json({
	        success: false,
	        message: 'Missing required fields for group registration'
	      });
	    }

	    const passwordPolicy = validatePasswordPolicy(password);
	    if (!passwordPolicy.valid) {
	      return res.status(400).json({
	        success: false,
	        message: `Password policy failed: ${passwordPolicy.reasons.join('; ')}`
	      });
	    }

	    if (!members || members.length === 0) {
	      return res.status(400).json({
	        success: false,
	        message: 'At least one group member is required'
      });
    }

    // Register group in database
	    const result = await farmerProfileDB.registerFarmerGroup(req.dbAsync, {
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
	    });

	    res.status(201).json({
	      success: true,
	      message: 'Farmer group registered successfully',
	      data: result
	    });
	  } catch (error) {
    console.error('Group registration error:', error);

    if (error.message.includes('already exists')) {
      return res.status(409).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to register farmer group',
      error: error.message
    });
	  }
	});

/**
 * POST /api/farmer-profile/login-group
 * Login farmer group with leader phone/email and password
 */
router.post('/farmer-profile/login-group', sanitizeInput, farmerLoginLimiter, async (req, res) => {
  try {
    const phoneOrEmail = req.body.phoneOrEmail || req.body.phone || req.body.email;
    const { password } = req.body;

    if (!phoneOrEmail || !password) {
      return res.status(400).json({
        success: false,
        message: 'Phone/Email and password are required'
      });
    }

    const result = await farmerProfileDB.loginFarmerGroup(req.dbAsync, {
      phoneOrEmail,
      password
    });

    res.json({
      success: true,
      message: 'Login successful',
      accountType: 'group',
      data: result
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: error.message || 'Login failed',
      error: error.message
    });
  }
});

/**
 * GET /api/farmer-profile/statistics
 * Get farmer statistics
 */
router.get('/farmer-profile/statistics', authenticateFarmerOrAdmin, requireActorRole(['admin']), async (req, res) => {
  try {
    const stats = await farmerProfileDB.getFarmerStatistics(req.dbAsync);

    res.json({
      success: true,
      data: stats
    });
    await auditFarmerRoute(req, 'profile_statistics_view', 'success');
  } catch (error) {
    await auditFarmerRoute(req, 'profile_statistics_view', 'failure', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get farmer statistics',
      error: error.message
    });
  }
});

/**
 * GET /api/farmer-profile/export
 * Export farmer data (CSV ready)
 */
router.get('/farmer-profile/export', authenticateFarmerOrAdmin, requireActorRole(['admin']), async (req, res) => {
  try {
    const filters = {};
    if (req.query.subCounty) filters.subCounty = req.query.subCounty;
    if (req.query.soilType) filters.soilType = req.query.soilType;

    const data = await farmerProfileDB.exportFarmerData(req.dbAsync, filters);

    res.json({
      success: true,
      data,
      count: data.length
    });
    await auditFarmerRoute(req, 'profile_export', 'success', { count: data.length });
  } catch (error) {
    await auditFarmerRoute(req, 'profile_export', 'failure', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to export farmer data',
      error: error.message
    });
  }
});

async function handleFarmerLogin(req, res) {
  try {
    const phoneOrEmail = req.body.phoneOrEmail || req.body.phone || req.body.email;
    const { password } = req.body;

    if (!phoneOrEmail || !password) {
      return res.status(400).json({
        success: false,
        message: 'Phone/Email and password are required'
      });
    }

    const result = await farmerProfileDB.loginFarmer(req.dbAsync, {
      phoneOrEmail,
      password
    });

    const sessionId = generateFarmerSessionId();
    await farmerProfileDB.createFarmerSession(
      req.dbAsync,
      result.farmerId,
      sessionId,
      'farmer',
      getClientIP(req),
      req.headers['user-agent'] || null
    );

    const token = generateFarmerAccessToken({
      farmerId: result.farmerId,
      phoneNumber: result.phoneNumber,
      email: result.email,
      role: 'farmer'
    });

    await auditFarmerRoute(req, 'farmer_login', 'success', { farmerId: result.farmerId });

    res.json({
      success: true,
      message: 'Login successful',
      token,
      sessionId,
      expiresIn: '8h',
      data: result
    });
  } catch (error) {
    console.error('Farmer login error:', error.message);
    await auditFarmerRoute(req, 'farmer_login', 'failure', {
      identifier: req.body?.phoneOrEmail || req.body?.phone || req.body?.email || null
    });
    
    res.status(401).json({
      success: false,
      message: error.message || 'Login failed',
      error: error.message
    });
  }
}

/**
 * POST /api/farmer-profile/login
 * Login farmer with phone/email and password
 */
router.post('/farmer-profile/login', sanitizeInput, farmerLoginLimiter, handleFarmerLogin);

/**
 * POST /api/auth/login
 * Backward-compatible farmer login endpoint
 */
router.post('/auth/login', sanitizeInput, farmerLoginLimiter, handleFarmerLogin);

router.post('/farmer-profile/logout', authenticateFarmerOrAdmin, requireActorRole(['farmer']), async (req, res) => {
  try {
    const sessionId = req.headers['x-farmer-session-id'];
    if (sessionId) {
      await farmerProfileDB.revokeFarmerSession(req.dbAsync, sessionId);
    }
    await auditFarmerRoute(req, 'farmer_logout', 'success');
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    await auditFarmerRoute(req, 'farmer_logout', 'failure', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
});

/**
 * POST /api/farmer-profile/forgot-password
 * Request password reset code
 */
router.post('/farmer-profile/forgot-password', sanitizeInput, farmerResetLimiter, async (req, res) => {
  try {
    const phoneOrEmail = req.body.phoneOrEmail || req.body.phone || req.body.email;

    if (!phoneOrEmail) {
      return res.status(400).json({
        success: false,
        message: 'Phone number or email is required'
      });
    }

    const resetResult = await farmerProfileDB.requestFarmerPasswordReset(req.dbAsync, phoneOrEmail);

    // Prevent account enumeration by always returning success.
    if (resetResult.userExists && resetResult.hasEmail) {
      enqueueJob(
        'password_reset_email',
        {
          email: resetResult.email,
          resetCode: resetResult.resetCode,
          firstName: resetResult.firstName
        },
        {
          maxAttempts: 4,
          backoffMs: 1000
        }
      );
    }

    const responsePayload = {
      success: true,
      message: 'If your account exists, a reset code has been sent to your registered email.'
    };

    if (process.env.NODE_ENV === 'development' && resetResult.userExists && resetResult.hasEmail) {
      responsePayload.devOtp = resetResult.resetCode;
      responsePayload.devOtpExpiresAt = resetResult.expiresAt;
      responsePayload.devNote = 'Development only: remove in production.';
    }

    await auditFarmerRoute(req, 'forgot_password_requested', 'success', {
      userExists: !!resetResult.userExists
    });

    res.json(responsePayload);
  } catch (error) {
    console.error('Farmer forgot-password error:', error.message);
    await auditFarmerRoute(req, 'forgot_password_requested', 'failure', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to process password reset request',
      error: error.message
    });
  }
});

/**
 * POST /api/farmer-profile/reset-password
 * Reset password using reset code
 */
router.post('/farmer-profile/reset-password', sanitizeInput, farmerResetLimiter, async (req, res) => {
  try {
    const phoneOrEmail = req.body.phoneOrEmail || req.body.phone || req.body.email;
    const { resetCode, newPassword } = req.body;

    if (!phoneOrEmail || !resetCode || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Phone/Email, reset code, and new password are required'
      });
    }

    const result = await farmerProfileDB.resetFarmerPassword(req.dbAsync, {
      phoneOrEmail,
      resetCode,
      newPassword
    });

    res.json({
      success: true,
      message: result.message || 'Password reset successful'
    });
    await auditFarmerRoute(req, 'password_reset_completed', 'success');
  } catch (error) {
    console.error('Farmer reset-password error:', error.message);
    await auditFarmerRoute(req, 'password_reset_completed', 'failure', { error: error.message });
    res.status(400).json({
      success: false,
      message: error.message || 'Password reset failed'
    });
  }
});

export default router;
