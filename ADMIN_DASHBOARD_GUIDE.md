# Fahamu Shamba - Admin Dashboard & Security Guide

## 🔐 Overview

The Admin Dashboard is a secure, enterprise-grade administration panel for Fahamu Shamba system administrators. It provides comprehensive system management, audit logging, security monitoring, and user administration capabilities.

### Key Features

- **Multi-Factor Authentication (MFA)** - TOTP-based 2FA for all admin accounts
- **Role-Based Access Control** - Three admin tiers: Super Admin, Admin, Moderator
- **Comprehensive Audit Logging** - Full audit trail of all admin actions
- **Security Event Monitoring** - Real-time security alerts and anomaly detection
- **Session Management** - Secure session handling with CSRF protection
- **Rate Limiting** - Brute-force protection with progressive lockout
- **Secure Logs** - Integrity-verified, tamper-evident logging system

---

## 🛠️ Installation & Setup

### Step 1: Install Dependencies

```bash
cd backend
npm install jsonwebtoken
```

### Step 2: Configure Environment Variables

Create/update `.env` file with admin credentials:

```env
# Admin JWT Secrets (CHANGE IN PRODUCTION!)
ADMIN_JWT_SECRET=your-super-secret-jwt-key-min-32-chars
ADMIN_REFRESH_SECRET=your-refresh-token-secret-min-32-chars
PASSWORD_SALT=your-password-salt-for-hashing

# Optional: SMS Provider Configuration
SMS_PROVIDER=auto
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=+1234567890
```

### Step 3: Initialize Admin Database

The admin database tables are automatically created on first server start:

- `admin_users` - Admin account information
- `mfa_tokens` - Multi-factor authentication tokens
- `admin_sessions` - Active user sessions
- `system_audit_logs` - Complete audit trail
- `system_alerts` - System alerts and notifications
- `system_config` - System configuration storage
- `admin_permissions` - Role-based permissions

### Step 4: Create Initial Super Admin

You need to manually create the first super admin user. Add this code to a startup script:

```javascript
import * as adminDB from './admin-database.js';
import { hashPassword } from './admin-auth.js';

const email = 'admin@fahamu-shamba.com';
const password = hashPassword('SecurePassword123!');

await adminDB.createAdminUser(
  dbAsync,
  email,
  password,
  'System',
  'Administrator',
  'super_admin',
  'system'
);

console.log('Super admin created: admin@fahamu-shamba.com');
```

Or use the SQL command directly:

```sql
INSERT INTO admin_users (email, password_hash, first_name, last_name, role, created_by)
VALUES (
  'admin@fahamu-shamba.com',
  'hashed_password_here',
  'System',
  'Administrator',
  'super_admin',
  'system'
);
```

---

## 📋 Admin Roles & Permissions

### Super Admin
Full system access including:
- User administration
- System configuration
- Security settings
- Password resets
- Database backups

### Admin
Standard administrative access:
- Dashboard overview
- Audit log viewing
- Farmer management
- Alert management
- Data export

### Moderator
Limited operational access:
- Dashboard viewing
- Farmer profile management
- Basic alert viewing
- Limited audit log access

---

## 🔒 Security Features

### 1. Multi-Factor Authentication (MFA)

All admin accounts support optional or mandatory MFA using Time-based One-Time Password (TOTP).

**Enable MFA:**
```bash
# MFA is verified during login
# If enabled, user receives 6-digit code
# Code expires after 5 minutes
# Rate limited to 3 attempts per 5 minutes
```

### 2. Session Management

- **Session Duration**: 24 hours
- **Idle Timeout**: Configurable (default: 30 minutes)
- **Session Tokens**: Cryptographically secure, random 32-byte tokens
- **CSRF Protection**: Unique CSRF token per session

### 3. Password Security

- **Hashing**: SHA-256 with salt
- **Storage**: Never stored in plaintext
- **Minimum Requirements**: 8+ characters (configurable)
- **Reset**: Secure token-based password reset flow

### 4. Rate Limiting

**Login Attempts:**
- 5 attempts per 15 minutes
- Account locks after exceeding limit
- Requires admin intervention to unlock

**MFA Attempts:**
- 3 attempts per 5 minutes
- Progressive delays between attempts

### 5. Audit Logging

Complete audit trail including:
- Login/logout events
- Failed authentication attempts
- Configuration changes
- Data access
- Admin actions with IP address and user agent

### 6. Security Event Monitoring

Tracks and alerts on:
- Failed login attempts
- Account lockouts
- CSRF violations
- Rate limit breaches
- Unauthorized access attempts
- Configuration modifications

### 7. API Security

**Implemented Protections:**
- CORS with origin whitelist
- HTTPS-ready (HSTS headers)
- XSS protection (Content-Security-Policy)
- Clickjacking protection (X-Frame-Options)
- MIME type sniffing prevention
- Input sanitization on all endpoints

---

## 🚀 Using the Admin Dashboard

### Access the Dashboard

```
http://localhost:5000/admin
```

### Login

1. Enter admin email and password
2. If MFA enabled, enter 6-digit code when prompted
3. Dashboard loads upon successful authentication

### Dashboard Features

#### Dashboard Tab
- System statistics (farmers, predictions, alerts)
- Recent activity log
- Quick health check

#### System Status Tab
- Server status
- Uptime information
- Database connectivity

#### Alerts Tab
- Active system alerts
- Alert severity indicators
- Quick resolution options

#### Audit Logs Tab
- Complete action history
- Filter by admin/action
- IP address tracking
- Status indicators (success/failure)

#### Security Logs Tab
- Security event timeline
- Critical event alerts
- Event severity levels
- Anomaly detection

#### Admin Users Tab
- List all admin accounts
- MFA status
- Last login information
- Account status (active/locked/inactive)
- Create new admin users

#### System Configuration Tab
- SMS provider selection
- MFA policy settings
- System behavior configuration

---

## 📊 Audit Logging

### Log Storage

Logs are stored in two locations:

1. **Database** (`system_audit_logs` table)
   - Queryable and filterable
   - Used for dashboard display

2. **File System** (`logs/` directory)
   - Immutable audit trail
   - Backup and compliance
   - `admin-audit.log` - user actions
   - `admin-security.log` - security events

### Log Format

```json
{
  "timestamp": "2025-12-04T10:30:45.123Z",
  "adminId": 1,
  "email": "admin@fahamu-shamba.com",
  "action": "login",
  "details": { "method": "email_password" },
  "status": "success",
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "hash": "integrity_hash"
}
```

### Exporting Logs

```javascript
import { exportLogsAsJSON } from './admin-audit-logger.js';

// Export all audit logs
const logs = exportLogsAsJSON('audit');

// Export by date range
const rangeLogs = exportLogsAsJSON('audit', '2025-12-01', '2025-12-04');

// Export security logs
const securityLogs = exportLogsAsJSON('security');
```

### Log Retention

```javascript
import { clearOldLogs } from './admin-audit-logger.js';

// Keep logs for 90 days (default)
clearOldLogs(90);

// Keep logs for 1 year
clearOldLogs(365);
```

---

## 🔄 API Endpoints

### Authentication

```
POST /api/admin/login
Content-Type: application/json

{
  "email": "admin@fahamu-shamba.com",
  "password": "SecurePassword123!"
}

Response:
{
  "success": true,
  "requiresMFA": false,
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "sessionId": "abc123...",
  "admin": {
    "id": 1,
    "email": "admin@fahamu-shamba.com",
    "name": "John Doe",
    "role": "super_admin"
  }
}
```

```
POST /api/admin/verify-mfa
Content-Type: application/json

{
  "email": "admin@fahamu-shamba.com",
  "mfaToken": "123456"
}
```

```
POST /api/admin/logout
Authorization: Bearer {accessToken}
X-Session-ID: {sessionId}
```

### Dashboard

```
GET /api/admin/dashboard
Authorization: Bearer {accessToken}

Response:
{
  "success": true,
  "data": {
    "statistics": {
      "totalFarmers": 150,
      "totalPredictions": 450,
      "activeAlerts": 2
    },
    "recentAlerts": [...],
    "recentActivity": [...]
  }
}
```

### Logs

```
GET /api/admin/audit-logs?limit=100&offset=0
Authorization: Bearer {accessToken}

GET /api/admin/security-logs?severity=critical&limit=100
Authorization: Bearer {accessToken}
```

### Alerts

```
GET /api/admin/system-alerts
Authorization: Bearer {accessToken}

POST /api/admin/system-alerts
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "alertType": "system",
  "severity": "warning",
  "title": "Database Size Warning",
  "message": "Database is 80% full"
}

PUT /api/admin/system-alerts/{alertId}
Authorization: Bearer {accessToken}
```

### Admin Users

```
GET /api/admin/admins
Authorization: Bearer {accessToken}
Role: super_admin

POST /api/admin/admins
Authorization: Bearer {accessToken}
Role: super_admin
Content-Type: application/json

{
  "email": "newadmin@fahamu-shamba.com",
  "password": "SecurePassword123!",
  "firstName": "Jane",
  "lastName": "Smith",
  "role": "admin"
}
```

---

## 🚨 Security Best Practices

### For System Administrators

1. **Strong Passwords**
   - Minimum 12 characters
   - Mix of uppercase, lowercase, numbers, symbols
   - Unique per admin account
   - Never reuse across systems

2. **MFA Always Enabled**
   - Enable for all admin accounts
   - Store backup codes securely
   - Never share MFA device

3. **Regular Audits**
   - Review audit logs weekly
   - Monitor failed login attempts
   - Check for unauthorized configuration changes

4. **Session Security**
   - Logout when finished
   - Don't share sessions
   - Clear cache when on shared computers

5. **Credential Handling**
   - Never hardcode passwords
   - Use environment variables
   - Rotate secrets regularly

### For Developers

1. **Token Security**
   - Keep JWT secrets confidential
   - Rotate secrets quarterly
   - Use different secrets per environment

2. **Log Protection**
   - Encrypt logs in transit
   - Protect log file permissions (600)
   - Backup logs securely

3. **Monitoring**
   - Set up real-time alert notifications
   - Monitor for suspicious patterns
   - Alert on repeated failures

4. **Dependency Updates**
   - Keep dependencies current
   - Monitor security advisories
   - Test updates before production

---

## 📈 Monitoring & Alerts

### Critical Alerts

The system automatically creates alerts for:
- Failed login attempts (5+ in 15 minutes)
- Account lockouts
- Configuration changes by non-super-admins
- Multiple failed MFA attempts
- Unusual access patterns
- Database errors

### Email Notifications

Configure email alerts (future enhancement):
```javascript
// Send alert email on critical events
async function sendSecurityAlert(alertType, details) {
  // Implementation pending
}
```

---

## 🆘 Troubleshooting

### Admin Can't Login

1. Verify email is correct
2. Check if account is locked (5 failed attempts)
3. Verify password (case-sensitive)
4. Check if account status is 'active'
5. Review security logs for failed attempts

### MFA Not Working

1. Verify time synchronization on server
2. Check MFA token hasn't expired (5 min limit)
3. Ensure 6-digit code is correct
4. Check rate limit (3 attempts per 5 min)
5. Review MFA logs for verification failures

### Lost MFA Device

1. Super admin must manually disable MFA
2. Run SQL: `UPDATE admin_users SET mfa_enabled = 0 WHERE email = '...'`
3. User logs in with password only
4. Re-enable MFA with new device

### Forgotten Password

1. Super admin resets password using SQL:
   ```sql
   UPDATE admin_users 
   SET password_hash = '...' 
   WHERE email = '...';
   ```
2. User receives temporary password
3. User must change password on next login

---

## 📝 Maintenance Tasks

### Daily
- Review security alerts
- Monitor login attempts
- Check system health

### Weekly
- Review audit logs
- Check for failed authentication attempts
- Verify active sessions

### Monthly
- Rotate admin passwords
- Review and update permissions
- Clean old logs (>90 days)
- Audit admin account list

### Quarterly
- Rotate JWT secrets
- Review and update security policies
- Test backup and recovery procedures
- Security audit of access patterns

---

## 🔗 Integration with User System

The admin dashboard operates independently from the farmer dashboard:

- **Farmer Database**: `farmers`, `predictions`, `feedback` tables
- **Admin Database**: `admin_users`, `mfa_tokens`, `admin_sessions`, etc.
- **Audit Trail**: Separate from user activity logs

Both systems share:
- Database connection
- API infrastructure
- Core server instance

Admins can view farmer data through the dashboard, but cannot directly modify farmer accounts without audit logging.

---

## 📚 Additional Resources

- JWT Documentation: https://jwt.io
- TOTP RFC 6238: https://tools.ietf.org/html/rfc6238
- OWASP Security Headers: https://owasp.org/www-project-secure-headers/
- Express Security Best Practices: https://expressjs.com/en/advanced/best-practice-security.html

---

## Version History

- **v1.0.0** (2025-12-04) - Initial release
  - Multi-factor authentication
  - Role-based access control
  - Comprehensive audit logging
  - Security event monitoring
  - Session management
  - Rate limiting

---

## Support

For issues or questions regarding the admin dashboard:

1. Check the troubleshooting section
2. Review security logs for error details
3. Check server logs for backend errors
4. Contact system administrator

---

**Last Updated:** 2025-12-04
**Status:** Production Ready
**Security Level:** Enterprise Grade
