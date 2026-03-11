# 🔧 Admin Dashboard - Troubleshooting & Advanced Config

## 🐛 Common Issues & Solutions

### Login Issues

#### Problem: "Invalid credentials" error on correct password
**Cause**: Account doesn't exist or password was hashed incorrectly

**Solution**:
```bash
# Check if account exists
sqlite3 fahamu_shamba.db
SELECT * FROM admin_users WHERE email = 'admin@example.com';

# If missing, recreate it
node backend/setup-admin.js

# If password is wrong, update it
# First get the hash of new password:
node -e "console.log(require('./backend/admin-auth.js').hashPassword('NewPassword123'))"

# Then update:
UPDATE admin_users 
SET password_hash = 'the_hash_from_above' 
WHERE email = 'admin@example.com';
```

#### Problem: "Account is locked" after failed logins
**Cause**: 5 failed login attempts in 15 minutes

**Solution**:
```bash
# Option 1: Wait 15 minutes for auto-unlock

# Option 2: Manually unlock (super admin only)
sqlite3 fahamu_shamba.db
UPDATE admin_users SET status = 'active', failed_login_attempts = 0 
WHERE email = 'admin@example.com';
```

#### Problem: Login page keeps showing
**Cause**: Session not being set or token invalid

**Solution**:
```bash
# Check browser console (F12) for errors
# Clear browser cache: Ctrl+Shift+Delete
# Check if token is being sent correctly

# Verify server is responding:
curl http://localhost:5000/api/test

# Check logs:
tail -50 backend/server.log
tail -50 logs/admin-security.log
```

#### Problem: "Token expired" immediately after login
**Cause**: System time is incorrect or JWT secrets are wrong

**Solution**:
```bash
# Check system time
date

# Verify JWT secrets in .env
cat backend/.env | grep JWT

# Make sure secrets are 32+ characters
# Regenerate if needed with:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

### MFA Issues

#### Problem: MFA code never arrives or doesn't work
**Cause**: Token expired (5 min limit) or code not matching

**Solution**:
```bash
# Check the dev token in response (development only)
# It's in __dev_token field

# In development, you can see the token in console:
# Click login -> check browser console -> look for dev token

# Token expires after 5 minutes, so be quick

# If you need to debug, enable verbose logging:
# Edit admin-routes.js and add:
console.log('MFA Token sent:', mfaToken);
```

#### Problem: MFA locked after 3 failed attempts
**Cause**: 3 incorrect attempts in 5 minutes

**Solution**:
```bash
# Wait 5 minutes for auto-unlock

# Or disable MFA temporarily:
sqlite3 fahamu_shamba.db
UPDATE admin_users SET mfa_enabled = 0 WHERE email = 'admin@example.com';

# User can re-enable from settings after login
```

#### Problem: Lost authenticator app with MFA enabled
**Cause**: Device lost/reset without backup codes

**Solution** (super admin):
```bash
# Disable MFA for the user
sqlite3 fahamu_shamba.db
UPDATE admin_users SET mfa_enabled = 0, mfa_secret = NULL 
WHERE email = 'affected@example.com';

# Delete any pending MFA tokens
DELETE FROM mfa_tokens WHERE admin_id = (
  SELECT id FROM admin_users WHERE email = 'affected@example.com'
);

# User can now login with password only
# Advise them to set up new authenticator
```

#### Problem: TOTP code mismatch errors
**Cause**: Server time and authenticator app time out of sync

**Solution**:
```bash
# Synchronize server time
ntpdate -u pool.ntp.org
# or
timedatectl set-ntp true  # On systemd systems

# Have user re-sync authenticator app time
# In Google Authenticator: Settings > Time correction for codes > Sync now

# Delete old MFA tokens if they accumulate:
DELETE FROM mfa_tokens WHERE expires_at < CURRENT_TIMESTAMP;
```

---

### Database Issues

#### Problem: "Database connection failed" in API
**Cause**: Database file missing or corrupted

**Solution**:
```bash
# Check if database exists
ls -la backend/fahamu_shamba.db

# If missing, recreate it
rm backend/fahamu_shamba.db  # Delete if corrupted
npm start  # Recreates on startup

# Check database integrity
sqlite3 backend/fahamu_shamba.db "PRAGMA integrity_check;"

# If corrupted, backup and restore
cp backend/fahamu_shamba.db backend/fahamu_shamba.db.backup
# Then recreate by starting server
```

#### Problem: "table already exists" errors on startup
**Cause**: Tables created by multiple server instances

**Solution**:
```bash
# This is normal - CREATE TABLE IF NOT EXISTS prevents errors

# To clean up, view what tables exist:
sqlite3 fahamu_shamba.db ".tables"

# If you need to reset admin database only:
sqlite3 fahamu_shamba.db << EOF
DROP TABLE IF EXISTS admin_users;
DROP TABLE IF EXISTS mfa_tokens;
DROP TABLE IF EXISTS admin_sessions;
DROP TABLE IF EXISTS system_audit_logs;
DROP TABLE IF EXISTS system_alerts;
DROP TABLE IF EXISTS system_config;
DROP TABLE IF EXISTS admin_permissions;
EOF

# Then restart server to recreate tables
```

#### Problem: Out of disk space error
**Cause**: Logs growing too large

**Solution**:
```bash
# Check disk usage
df -h

# Backup logs
tar czf logs-backup-$(date +%Y%m%d).tar.gz logs/

# Clear old logs (keep 30 days)
node -e "require('./backend/admin-audit-logger.js').clearOldLogs(30)"

# Or manually remove:
rm logs/admin-*.log
```

---

### Session & CSRF Issues

#### Problem: "CSRF token validation failed"
**Cause**: Missing or invalid CSRF token header

**Solution**:
```bash
# Make sure requests include:
# 1. Session ID header: X-Session-ID
# 2. CSRF token header: X-CSRF-Token
# 3. Authorization header: Bearer {token}

# Example correct request:
curl -X POST http://localhost:5000/api/admin/system-alerts \
  -H "Authorization: Bearer eyJ..." \
  -H "X-Session-ID: abc123..." \
  -H "X-CSRF-Token: xyz..." \
  -H "Content-Type: application/json" \
  -d '{"alertType":"test"}'
```

#### Problem: Session expires too quickly
**Cause**: Configured timeout is too short

**Solution**:
```bash
# Check session timeout settings in admin-routes.js
# Search for: expiresAt = new Date(Date.now() + ...

# Current settings:
# Session: 24 hours
# Activity: 30 minutes (configurable)

# To adjust, edit admin-database.js:
// Change this line:
const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
// To your preferred duration
```

#### Problem: "Session invalid" after switching tabs
**Cause**: Session not being maintained properly

**Solution**:
```bash
# Make sure session ID is stored and sent with each request
# In browser, check Application > Local Storage for sessionId

# If missing, clear cache and login again
# Ctrl+Shift+Delete > Clear all

# Check that X-Session-ID header is being sent:
# Open DevTools > Network > watch requests
# Should see X-Session-ID in headers
```

---

### Performance Issues

#### Problem: Dashboard loads very slowly
**Cause**: Large database or inefficient queries

**Solution**:
```bash
# Check database size
du -h backend/fahamu_shamba.db

# Check audit logs size
wc -l logs/admin-*.log

# Optimize database
sqlite3 fahamu_shamba.db "VACUUM;"

# Archive old logs
tar czf logs/archive-$(date +%Y%m).tar.gz logs/admin-*.log
# Delete archived logs

# Check query performance
sqlite3 fahamu_shamba.db "EXPLAIN QUERY PLAN SELECT * FROM system_audit_logs LIMIT 100;"
```

#### Problem: High memory usage by server
**Cause**: Sessions or logs accumulating in memory

**Solution**:
```bash
# Restart server to clear session memory
npm start  # Kill and restart

# Limit in-memory session storage
# Currently stores in Map - switch to database for production

# Add to admin-routes.js:
// Use database sessions instead of Map
const getSession = async (sessionId) => {
  return await adminDB.getAdminSession(dbAsync, sessionId);
};
```

#### Problem: Rate limiting blocks legitimate requests
**Cause**: Rate limit threshold too low

**Solution**:
```bash
# Adjust rate limits in admin-auth.js:

// Login attempts per 15 minutes:
export const loginLimiter = new RateLimiter(5, 15 * 60 * 1000);
// Change first param to higher number (e.g., 10)

// MFA attempts per 5 minutes:
export const mfaLimiter = new RateLimiter(3, 5 * 60 * 1000);
// Change first param to higher number (e.g., 5)
```

---

## ⚙️ Advanced Configuration

### Custom JWT Secrets

```bash
# Generate secure secrets
node -e "
const crypto = require('crypto');
console.log('Access Token Secret:', crypto.randomBytes(32).toString('hex'));
console.log('Refresh Secret:', crypto.randomBytes(32).toString('hex'));
console.log('Password Salt:', crypto.randomBytes(32).toString('hex'));
"

# Add to .env
ADMIN_JWT_SECRET=your_generated_secret_here
ADMIN_REFRESH_SECRET=your_generated_secret_here
PASSWORD_SALT=your_generated_salt_here
```

### Customize Security Headers

Edit `admin-middleware.js`, function `securityHeaders()`:

```javascript
// Add custom headers
res.setHeader('X-Custom-Header', 'value');

// Adjust CSP for your resources
res.setHeader('Content-Security-Policy', "default-src 'self'; ...");

// Modify HSTS timeout
res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
```

### Adjust Role Permissions

Edit `admin-database.js`, function `initializeDefaultPermissions()`:

```javascript
const permissions = {
  'custom_role': [
    'custom_permission_1',
    'custom_permission_2'
  ]
};
```

### Configure Log Retention

Edit `.env` or add cron job:

```bash
# Keep logs for N days (in cron job)
0 2 * * * node /path/to/clear-old-logs.js 90
```

### Email Notifications (Future)

```javascript
// Add to admin-audit-logger.js
async function sendAlert(alertType, details) {
  // Integrate with mail service
  // Nodemailer, SendGrid, AWS SES, etc.
}
```

---

## 🔍 Debugging Tips

### Enable Verbose Logging

```bash
# Add debug statements to admin-routes.js
console.log('DEBUG: Login attempt for:', email);
console.log('DEBUG: Password hash:', passwordHash);
console.log('DEBUG: Query result:', admin);

# Use NODE_DEBUG
NODE_DEBUG=* npm start
```

### Monitor Database Queries

```bash
# View all queries being executed
sqlite3 fahamu_shamba.db ".mode list"
sqlite3 fahamu_shamba.db ".trace on"

# Then run operations and see queries
```

### Check Token Validity

```bash
# Install jwt-cli
npm install -g jwt-cli

# Decode token
jwt-decode "your_token_here"

# Or use online: https://jwt.io
```

### Trace Network Requests

```bash
# Browser DevTools (F12)
# Network tab > filter by XHR
# Check request/response headers
# Verify status codes

# From command line
curl -v http://localhost:5000/api/admin/login
```

---

## 🆘 Emergency Procedures

### Compromised Admin Account

```bash
# 1. Disable the account immediately
sqlite3 fahamu_shamba.db
UPDATE admin_users SET status = 'locked' WHERE email = 'compromised@example.com';

# 2. Revoke all sessions
DELETE FROM admin_sessions WHERE admin_id = (
  SELECT id FROM admin_users WHERE email = 'compromised@example.com'
);

# 3. Reset password
UPDATE admin_users 
SET password_hash = 'new_hash_here',
    failed_login_attempts = 0
WHERE email = 'compromised@example.com';

# 4. Review audit logs for suspicious activity
SELECT * FROM system_audit_logs 
WHERE admin_id = (SELECT id FROM admin_users WHERE email = 'compromised@example.com')
ORDER BY created_at DESC;

# 5. Notify other admins
# 6. Change all JWT secrets
# 7. Review all system changes made by account
```

### Database Corruption

```bash
# 1. Backup current database
cp fahamu_shamba.db fahamu_shamba.db.corrupted

# 2. Check integrity
sqlite3 fahamu_shamba.db "PRAGMA integrity_check;"

# 3. If minor corruption, try repair
sqlite3 fahamu_shamba.db "VACUUM;"

# 4. If major corruption, restore from backup
# cp fahamu_shamba.db.backup fahamu_shamba.db

# 5. Restart server
npm start
```

### Total System Lockdown

```bash
# If suspicious activity detected:

# 1. Stop the server
npm stop
pkill -f "node server.js"

# 2. Disable all admin accounts except backup
sqlite3 fahamu_shamba.db
UPDATE admin_users SET status = 'locked';
UPDATE admin_users SET status = 'active' WHERE email = 'backup@example.com';

# 3. Clear all sessions
DELETE FROM admin_sessions;

# 4. Review security logs
cat logs/admin-security.log | tail -100

# 5. Investigate and fix issues

# 6. Restart server
npm start
```

---

## 📊 Monitoring & Metrics

### Key Metrics to Monitor

```javascript
// Failed login attempts
SELECT COUNT(*) as failed_logins FROM system_audit_logs 
WHERE action = 'login_failure' 
AND created_at > datetime('now', '-24 hours');

// Account lockouts
SELECT COUNT(*) as lockouts FROM system_audit_logs 
WHERE action = 'account_locked_too_many_attempts' 
AND created_at > datetime('now', '-24 hours');

// MFA failures
SELECT COUNT(*) as mfa_failures FROM system_audit_logs 
WHERE action = 'mfa_verification_failed' 
AND created_at > datetime('now', '-24 hours');

// Active sessions
SELECT COUNT(*) as active_sessions FROM admin_sessions 
WHERE expires_at > CURRENT_TIMESTAMP;

// Database size
.schema admin_users
.schema system_audit_logs
```

### Create Alert Rules

```javascript
// Example: Alert if >10 failed logins in 1 hour
const failedAttempts = await dbAsync.get(`
  SELECT COUNT(*) as count FROM system_audit_logs 
  WHERE action = 'login_failure' 
  AND created_at > datetime('now', '-1 hour')
`);

if (failedAttempts.count > 10) {
  await adminDB.createSystemAlert(
    dbAsync,
    'security_alert',
    'critical',
    'High Failed Login Attempts',
    `${failedAttempts.count} failed logins in last hour`
  );
}
```

---

## 🧪 Testing Procedures

### Load Testing

```bash
# Install Apache Bench
apt-get install apache2-utils

# Test login endpoint
ab -n 100 -c 10 -p login.json -T application/json \
  http://localhost:5000/api/admin/login
```

### Security Testing

```bash
# Test SQL injection
curl -X POST http://localhost:5000/api/admin/login \
  -d '{"email":"admin\' OR \\'1\\'=\\'1","password":"test"}'

# Should be sanitized - no results

# Test XSS
curl -X POST http://localhost:5000/api/admin/login \
  -d '{"email":"<script>alert(1)</script>","password":"test"}'

# Should be sanitized
```

---

## 📚 Additional Resources

- **SQLite Documentation**: https://www.sqlite.org/docs.html
- **Express Debugging**: https://expressjs.com/en/guide/debugging.html
- **Node.js Debugging**: https://nodejs.org/en/docs/guides/debugging-getting-started/
- **OWASP Testing Guide**: https://owasp.org/www-project-web-security-testing-guide/

---

**Last Updated**: 2025-12-04  
**Version**: 1.0.0
