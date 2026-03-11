# 🔐 Admin Dashboard - Quick Reference Card

## Access Points

```
🌐 Admin Dashboard:  http://localhost:5000/admin
📊 User Dashboard:   http://localhost:5000/farmer-dashboard
⚙️  API Tester:       http://localhost:5000/api-tester
```

---

## First Time Setup

```bash
# 1. Install dependencies
cd backend && npm install

# 2. Create initial admin account
node setup-admin.js

# 3. Start server
npm start

# 4. Open browser and login
# http://localhost:5000/admin
```

---

## Default Test Credentials

```
Email:    admin@fahamu-shamba.com
Password: [Created during setup-admin.js]
MFA:      Optional (enable after login)
```

⚠️ **Change these before production!**

---

## Quick Commands

```bash
# View admin users
sqlite3 fahamu_shamba.db "SELECT email, role, status FROM admin_users;"

# Lock/unlock account
sqlite3 fahamu_shamba.db "UPDATE admin_users SET status = 'locked' WHERE email = 'user@example.com';"

# Reset failed login attempts
sqlite3 fahamu_shamba.db "UPDATE admin_users SET failed_login_attempts = 0, status = 'active' WHERE email = 'user@example.com';"

# Disable MFA for user
sqlite3 fahamu_shamba.db "UPDATE admin_users SET mfa_enabled = 0 WHERE email = 'user@example.com';"

# View recent audit logs
sqlite3 fahamu_shamba.db "SELECT * FROM system_audit_logs ORDER BY created_at DESC LIMIT 20;"

# View security alerts
sqlite3 fahamu_shamba.db "SELECT * FROM system_alerts WHERE resolved = 0;"

# Check database size
du -h backend/fahamu_shamba.db

# View server logs
tail -f backend/server.log

# View audit logs
tail -f logs/admin-audit.log

# Stop server
pkill -f "node server.js"
```

---

## Login Attempts & Lockout

| Event | Limit | Duration | Action |
|-------|-------|----------|--------|
| Failed Logins | 5 | 15 minutes | Account locked |
| MFA Attempts | 3 | 5 minutes | Rate limited |
| MFA Code Valid | - | 5 minutes | Expires |

---

## Security Headers

```
X-Frame-Options:               DENY
X-Content-Type-Options:        nosniff
X-XSS-Protection:              1; mode=block
Content-Security-Policy:       default-src 'self'
Referrer-Policy:               strict-origin-when-cross-origin
Strict-Transport-Security:     max-age=31536000 (HTTPS only)
```

---

## Role Permissions Matrix

### Super Admin (Full Access)
- ✅ Dashboard, Admins, Config, Logs, Alerts
- ✅ Create/modify admin accounts
- ✅ System configuration
- ✅ Manage all users

### Admin (Standard Access)
- ✅ Dashboard, Audit Logs, Alerts
- ✅ Farmer management
- ✅ Data export
- ❌ Cannot manage other admins

### Moderator (Limited Access)
- ✅ Dashboard, Audit Logs
- ✅ Farmer profile management
- ✅ View basic alerts
- ❌ No admin management

---

## Database Tables Summary

| Table | Purpose | Key Field |
|-------|---------|-----------|
| `admin_users` | Admin accounts | email (unique) |
| `mfa_tokens` | MFA codes | admin_id, token |
| `admin_sessions` | Active sessions | session_id (unique) |
| `system_audit_logs` | Action history | created_at |
| `system_alerts` | System alerts | alert_type, severity |
| `system_config` | Configuration | config_key (unique) |
| `admin_permissions` | Role permissions | role, permission |

---

## Environment Variables Required

```env
# Critical (change before production!)
ADMIN_JWT_SECRET=your-32-character-secret-key
ADMIN_REFRESH_SECRET=your-32-character-secret
PASSWORD_SALT=your-32-character-salt

# Optional
SMS_PROVIDER=auto                    # twilio, safaricom, auto
NODE_ENV=development                 # development, production
PORT=5000                            # Server port
```

---

## Troubleshooting Checklist

```
❓ Can't login?
   ✓ Check account exists: SELECT * FROM admin_users WHERE email = '...'
   ✓ Check if account is locked: Check status field
   ✓ Reset password if needed

❓ MFA not working?
   ✓ Check server time: date
   ✓ Verify authenticator app time sync
   ✓ Check token hasn't expired (5 min limit)
   ✓ Check rate limit (3 attempts per 5 min)

❓ Dashboard won't load?
   ✓ Check server is running: curl http://localhost:5000/api/test
   ✓ Check browser console for errors (F12)
   ✓ Clear cache: Ctrl+Shift+Delete
   ✓ Check port 5000 is not blocked

❓ Database connection error?
   ✓ Check database exists: ls -la backend/fahamu_shamba.db
   ✓ Check disk space: df -h
   ✓ Restart server: npm start

❓ Account locked after failed attempts?
   ✓ Wait 15 minutes for auto-unlock
   ✓ Or manually unlock via SQL
```

---

## API Quick Test

```bash
# Test API is working
curl http://localhost:5000/api/test

# Login (get token)
curl -X POST http://localhost:5000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Password123"}'

# Access protected endpoint
curl http://localhost:5000/api/admin/dashboard \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Create alert
curl -X POST http://localhost:5000/api/admin/system-alerts \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"alertType":"test","severity":"info","title":"Test Alert","message":"Testing"}'
```

---

## Security Best Practices

✅ **DO:**
- Enable MFA for all accounts
- Review audit logs weekly
- Rotate passwords quarterly
- Monitor failed login attempts
- Keep server software updated
- Use strong passwords (12+ chars)
- Store passwords securely
- Backup database regularly

❌ **DON'T:**
- Share admin credentials
- Leave sessions open unattended
- Use default passwords in production
- Expose JWT secrets in code
- Skip MFA for convenience
- Ignore security alerts
- Store passwords in plaintext
- Run production without HTTPS

---

## File Locations

```
Backend Files:
  /backend/admin-auth.js
  /backend/admin-audit-logger.js
  /backend/admin-middleware.js
  /backend/admin-database.js
  /backend/admin-routes.js
  /backend/setup-admin.js
  /backend/public/admin-dashboard.html

Logs:
  /logs/admin-audit.log
  /logs/admin-security.log

Database:
  /backend/fahamu_shamba.db

Documentation:
  /ADMIN_DASHBOARD_GUIDE.md
  /ADMIN_QUICKSTART.md
  /ADMIN_IMPLEMENTATION_SUMMARY.md
  /ADMIN_TROUBLESHOOTING.md
```

---

## Key Endpoints Cheat Sheet

```
Authentication:
  POST   /api/admin/login           - Login with email/password
  POST   /api/admin/verify-mfa      - Verify MFA code
  POST   /api/admin/logout          - Logout

Dashboard:
  GET    /api/admin/dashboard       - Get dashboard data

Logs:
  GET    /api/admin/audit-logs      - View audit logs
  GET    /api/admin/security-logs   - View security events

Alerts:
  GET    /api/admin/system-alerts   - View alerts
  POST   /api/admin/system-alerts   - Create alert
  PUT    /api/admin/system-alerts/{id} - Resolve alert

Users:
  GET    /api/admin/admins          - List admins
  POST   /api/admin/admins          - Create admin
```

---

## Default Settings

| Setting | Value | Location |
|---------|-------|----------|
| Session Timeout | 24 hours | admin-database.js |
| Idle Timeout | 30 min (configurable) | admin-middleware.js |
| Login Attempts | 5 per 15 min | admin-auth.js |
| MFA Attempts | 3 per 5 min | admin-auth.js |
| MFA Code Expiry | 5 minutes | admin-routes.js |
| Token Expiry | 15 minutes | admin-auth.js |
| Refresh Expiry | 7 days | admin-auth.js |
| Log Retention | 90 days | admin-audit-logger.js |

---

## Contact & Documentation

**Documentation Files:**
- `ADMIN_DASHBOARD_GUIDE.md` - Complete guide (500+ lines)
- `ADMIN_QUICKSTART.md` - Quick setup (300+ lines)
- `ADMIN_TROUBLESHOOTING.md` - Troubleshooting (400+ lines)

**External Resources:**
- JWT: https://jwt.io
- OWASP: https://owasp.org
- Express: https://expressjs.com

---

**Version:** 1.0  
**Last Updated:** 2025-12-04  
**Status:** Production Ready ✅
