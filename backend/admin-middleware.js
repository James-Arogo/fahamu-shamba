import { verifyAccessToken, verifyRefreshToken, generateAccessToken } from './admin-auth.js';
import { logAuditEvent, logSecurityEvent } from './admin-audit-logger.js';
import crypto from 'crypto';

/**
 * Middleware to verify admin access token
 */
export function authenticateAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    logSecurityEvent('unauthorized_access_attempt', {
      endpoint: req.path,
      method: req.method,
      ipAddress: getClientIP(req)
    }, 'warning');
    return res.status(401).json({
      success: false,
      message: 'Authorization header missing'
    });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({
      success: false,
      message: 'Invalid authorization format'
    });
  }

  const token = parts[1];
  const decoded = verifyAccessToken(token);

  if (!decoded) {
    logSecurityEvent('invalid_token_attempt', {
      endpoint: req.path,
      ipAddress: getClientIP(req)
    }, 'warning');
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }

  req.admin = decoded;
  next();
}

/**
 * Middleware to require specific admin role
 */
export function requireRole(requiredRole) {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    const roleHierarchy = {
      moderator: 1,
      admin: 2,
      super_admin: 3
    };
    const userRank = roleHierarchy[req.admin.role] || 0;
    const requiredRank = roleHierarchy[requiredRole] || 0;
    const isAllowed = requiredRole === 'any' || userRank >= requiredRank;

    if (!isAllowed) {
      logAuditEvent(
        req.admin.adminId,
        req.admin.email,
        'unauthorized_role_access',
        { requiredRole, userRole: req.admin.role, endpoint: req.path },
        'failure',
        getClientIP(req)
      );
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    next();
  };
}

/**
 * Middleware to verify CSRF token
 */
export function verifyCSRFToken(req, res, next) {
  // Only check for state-changing requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const csrfToken = req.headers['x-csrf-token'];
  const sessionCSRF = req.session?.csrfToken;

  if (!csrfToken || csrfToken !== sessionCSRF) {
    logSecurityEvent('csrf_token_mismatch', {
      endpoint: req.path,
      method: req.method,
      ipAddress: getClientIP(req)
    }, 'warning');
    return res.status(403).json({
      success: false,
      message: 'CSRF token validation failed'
    });
  }

  next();
}

/**
 * Middleware to log API calls
 */
export function logAPICall(req, res, next) {
  // Store original end function
  const originalEnd = res.end;

  // Override end function to log
  res.end = function(...args) {
    if (req.admin) {
      logAuditEvent(
        req.admin.adminId,
        req.admin.email,
        'api_call',
        {
          method: req.method,
          endpoint: req.path,
          statusCode: res.statusCode
        },
        res.statusCode >= 200 && res.statusCode < 300 ? 'success' : 'failure',
        getClientIP(req),
        req.headers['user-agent']
      );
    }
    return originalEnd.apply(res, args);
  };

  next();
}

/**
 * Middleware for rate limiting
 */
export function rateLimit(limiter) {
  return (req, res, next) => {
    const identifier = req.admin?.adminId || getClientIP(req);

    if (!limiter.checkLimit(identifier)) {
      const retryAfter = limiter.getRetryAfter(identifier);
      logSecurityEvent('rate_limit_exceeded', {
        identifier,
        endpoint: req.path,
        ipAddress: getClientIP(req)
      }, 'warning');
      return res.status(429).json({
        success: false,
        message: 'Too many requests. Please try again later.',
        retryAfter
      });
    }

    next();
  };
}

/**
 * Middleware to sanitize input
 */
export function sanitizeInput(req, res, next) {
  // Sanitize all request inputs
  sanitizeObject(req.body);
  sanitizeObject(req.query);
  sanitizeObject(req.params);

  next();
}

/**
 * Middleware to add security headers
 */
export function securityHeaders(req, res, next) {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Content Security Policy
  // Allow local/data/blob image sources so farmer passport photos can render safely in dashboards.
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:"
  );

  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Additional hardening headers.
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  res.setHeader('X-DNS-Prefetch-Control', 'off');

  // Permissions Policy
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  // HSTS (only in production)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  next();
}

/**
 * Enforce HTTPS in production environments.
 * Keeps localhost/dev traffic on HTTP for easier local development.
 */
export function enforceHTTPS() {
  return (req, res, next) => {
    if (process.env.NODE_ENV !== 'production') {
      return next();
    }

    const forwardedProto = req.headers['x-forwarded-proto'];
    const isSecure = req.secure || forwardedProto === 'https';

    if (isSecure) {
      return next();
    }

    const host = req.headers.host;
    return res.redirect(301, `https://${host}${req.originalUrl}`);
  };
}

/**
 * Same-origin protection for state-changing requests.
 * This blocks cross-site browser requests without breaking server-to-server calls
 * where Origin is often absent.
 */
export function enforceSameOriginForMutations() {
  return (req, res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next();
    }

    const origin = req.headers.origin;
    if (!origin) {
      return next();
    }

    const host = req.headers.host;

    try {
      const originHost = new URL(origin).host;
      if (originHost !== host) {
        logSecurityEvent('cross_origin_mutation_blocked', {
          endpoint: req.path,
          method: req.method,
          origin,
          host,
          ipAddress: getClientIP(req)
        }, 'warning');

        return res.status(403).json({
          success: false,
          message: 'Cross-origin state-changing request blocked'
        });
      }
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Origin header'
      });
    }

    return next();
  };
}

/**
 * Generic in-memory API rate limiter.
 */
export function createRateLimitMiddleware(config = {}) {
  const {
    windowMs = 15 * 60 * 1000,
    maxRequests = 300,
    keyGenerator = (req) => getClientIP(req),
    label = 'api_global'
  } = config;

  const store = new Map();

  return (req, res, next) => {
    const now = Date.now();
    const key = keyGenerator(req) || 'unknown';
    const entry = store.get(key);

    if (!entry || entry.resetAt <= now) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (entry.count >= maxRequests) {
      const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader('Retry-After', retryAfterSec);

      logSecurityEvent('rate_limit_exceeded', {
        label,
        endpoint: req.path,
        method: req.method,
        key,
        ipAddress: getClientIP(req)
      }, 'warning');

      return res.status(429).json({
        success: false,
        message: 'Too many requests. Please try again later.',
        retryAfter: retryAfterSec
      });
    }

    entry.count += 1;
    store.set(key, entry);
    return next();
  };
}

/**
 * Generate a CSRF token value.
 */
export function generateCsrfTokenValue() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Token refresh middleware
 */
export function refreshTokenMiddleware(req, res, next) {
  const refreshToken = req.headers['x-refresh-token'];

  if (!refreshToken) {
    return next();
  }

  const decoded = verifyRefreshToken(refreshToken);

  if (!decoded) {
    return next();
  }

  // Generate new access token
  const newAccessToken = generateAccessToken(decoded.adminId, decoded.email);
  res.setHeader('X-New-Access-Token', newAccessToken);

  next();
}

/**
 * Middleware to check session validity
 */
export function validateSession(sessionStore) {
  return (req, res, next) => {
    if (!req.admin) {
      return next();
    }

    const sessionId = req.headers['x-session-id'];
    if (!sessionId) {
      return next();
    }

    const session = sessionStore.get(sessionId);
    if (!session || session.adminId !== req.admin.adminId) {
      logSecurityEvent('session_mismatch', {
        adminId: req.admin.adminId,
        ipAddress: getClientIP(req)
      }, 'warning');
      return res.status(401).json({
        success: false,
        message: 'Session invalid'
      });
    }

    // Update session last activity
    session.lastActivity = Date.now();
    sessionStore.set(sessionId, session);

    next();
  };
}

/**
 * Helper to get client IP address
 */
export function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    req.connection?.remoteAddress ||
    'unknown';
}

/**
 * Sanitize object recursively
 */
function sanitizeObject(obj) {
  if (!obj) return;

  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      // Remove potentially dangerous characters
      obj[key] = obj[key]
        .replace(/[<>\"'`]/g, '')
        .trim();
    } else if (typeof obj[key] === 'object') {
      sanitizeObject(obj[key]);
    }
  }
}
