# 🔐 Admin Dashboard - Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### Step 1: Install Dependencies (If not already done)

```bash
cd backend
npm install
```

### Step 2: Create Initial Admin Account

```bash
node setup-admin.js
```

Follow the interactive prompts:
- Enter email (e.g., `admin@fahamu-shamba.com`)
- Enter name (first and last)
- Create a strong password (min 8 chars, 1 uppercase, 1 number)
- Select role (1 = Super Admin, 2 = Admin, 3 = Moderator)

### Step 3: Start the Server

```bash
npm start
```

You should see:
```
🚀 User Dashboard: http://localhost:5000/farmer-dashboard
🔐 Admin Dashboard: http://localhost:5000/admin
```

### Step 4: Access Admin Dashboard

Open in browser: **http://localhost:5000/admin**

---

## 📋 Default Test Credentials

For development/testing:

```
Email: admin@fahamu-shamba.com
Password: Admin@12345 (created during setup)
MFA: Optional (enable in dashboard settings)
```

**⚠️ IMPORTANT:** Change these credentials before production deployment!

---

## 🎯 First Things To Do

### 1. Enable Multi-Factor Authentication

1. Login to admin dashboard
2. Click account settings (top right)
3. Enable MFA
4. Scan QR code with authenticator app (Google Authenticator, Authy, etc.)
5. Enter verification code to confirm

### 2. Create Additional Admin Accounts

1. Go to "Admin Users" section
2. Click "+ New Admin"
3. Fill in details:
   - Email: new admin's email
   - Password: strong password
   - First/Last Name: full name
   - Role: select appropriate role
4. Click "Create"

### 3. Review System Logs

1. Go to "Audit Logs" to see all admin actions
2. Go to "Security Logs" to check for security events
3. Look for any failed login attempts or anomalies

### 4. Check System Status

1. Go to "System Status" tab
2. Verify server is running normally
3. Check database is connected
4. View uptime information

---

## 🔐 Security Quick Checklist

- [ ] Created initial admin account
- [ ] Logged in successfully
- [ ] Enabled MFA for all admin accounts
- [ ] Reviewed audit logs
- [ ] Created backup admin account
- [ ] Changed default password
- [ ] Updated JWT secrets in `.env` file
- [ ] Configured SMS provider (optional)
- [ ] Set up email alerts (future feature)
- [ ] Reviewed security policies

---

## 📱 MFA Setup (Optional but Recommended)

### Using Google Authenticator

1. Install Google Authenticator app
2. In admin dashboard, enable MFA
3. Scan QR code with app (or enter code manually)
4. App generates 6-digit code
5. Enter code in admin dashboard
6. Save backup codes securely

### Using Authy

1. Install Authy app
2. Same process as Google Authenticator
3. Authy provides cloud backup of codes

### Backup Codes

When enabling MFA, you get backup codes. **Store these safely!**
- Print and keep in secure location
- Don't share with anyone
- Use only if you lose access to MFA device

---

## 🛠️ Useful Commands

### Create Admin from Command Line

```bash
# Interactive setup
node setup-admin.js

# Or insert directly into database
sqlite3 fahamu_shamba.db
INSERT INTO admin_users (email, password_hash, first_name, last_name, role, created_by)
VALUES ('admin@example.com', 'hashed_password', 'First', 'Last', 'admin', 'system');
```

### Reset Admin Password

```bash
sqlite3 fahamu_shamba.db
UPDATE admin_users 
SET password_hash = 'new_hashed_password' 
WHERE email = 'admin@example.com';
```

### View Admin Logs

```bash
# Audit logs
tail -f logs/admin-audit.log | jq .

# Security logs
tail -f logs/admin-security.log | jq .
```

### Check Database Status

```bash
sqlite3 fahamu_shamba.db
SELECT * FROM admin_users;
SELECT COUNT(*) FROM system_audit_logs;
SELECT * FROM system_alerts WHERE resolved = 0;
```

---

## 🚨 Troubleshooting

### "Admin not found" Error

**Problem:** Login fails with "Invalid credentials"

**Solution:**
1. Check email spelling
2. Verify account exists: `SELECT * FROM admin_users WHERE email = '...';`
3. If missing, create new admin: `node setup-admin.js`

### MFA Code Expires Too Quickly

**Problem:** Code works for 5 minutes then expires

**Solution:**
- This is by design for security
- Enter code immediately after receiving
- Check system time is synchronized

### Account Locked After Failed Logins

**Problem:** Account locked after 5 failed login attempts

**Solution:**
1. Wait 15 minutes for lockout to expire, OR
2. Super admin unlocks: `UPDATE admin_users SET status = 'active' WHERE email = '...';`

### Forgot MFA Device

**Problem:** Lost access to MFA authenticator app

**Solution:**
1. Use backup code if you have one
2. Super admin can disable MFA: `UPDATE admin_users SET mfa_enabled = 0 WHERE email = '...';`
3. User logs in with password only
4. Re-enable MFA with new device

### Can't Access Admin Dashboard

**Problem:** http://localhost:5000/admin returns 404

**Solution:**
1. Check server is running: `npm start`
2. Check port 5000 is not blocked
3. Verify backend files are in place
4. Check browser console for errors (F12)
5. Try: http://localhost:5000/admin-dashboard.html

---

## 🔄 Regular Maintenance

### Daily
- Check for active alerts
- Monitor login attempts
- Verify system health

### Weekly
- Review audit logs
- Check for failed logins
- Verify all admins are active

### Monthly
- Rotate admin passwords
- Update security policies
- Clean logs older than 90 days

### Quarterly
- Rotate JWT secrets
- Review admin permissions
- Security audit

---

## 📚 Role Descriptions

### Super Admin
- **Full System Access**
- Manage all admin accounts
- System configuration
- User administration
- Password resets
- Database backups
- View all logs

### Admin
- **Standard Access**
- Dashboard overview
- Manage farmers
- View audit logs
- Create system alerts
- Export data

### Moderator
- **Limited Access**
- Dashboard viewing
- Farmer management
- Alert viewing
- Basic log access

---

## 🔐 Password Policy

**Minimum Requirements:**
- 8+ characters
- At least 1 uppercase (A-Z)
- At least 1 lowercase (a-z)
- At least 1 number (0-9)
- At least 1 special character (optional but recommended)

**Examples of Strong Passwords:**
- `Fahamu@Shamba123`
- `SecurePass2025!`
- `AdminPanel#2025`

**Examples of Weak Passwords:**
- `password` (no numbers/capitals)
- `12345678` (no letters)
- `Admin` (too short)

---

## 🌐 API Integration

### Login via API

```bash
curl -X POST http://localhost:5000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@fahamu-shamba.com",
    "password": "Admin@12345"
  }'
```

Response:
```json
{
  "success": true,
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

### Access Protected Endpoints

```bash
curl http://localhost:5000/api/admin/dashboard \
  -H "Authorization: Bearer eyJhbGc..."
```

---

## 📞 Support

If you encounter issues:

1. **Check logs first:**
   ```bash
   tail -50 logs/admin-security.log
   tail -50 backend/server.log
   ```

2. **Verify database:**
   ```bash
   sqlite3 fahamu_shamba.db ".tables"
   ```

3. **Test API directly:**
   ```bash
   curl http://localhost:5000/api/test
   curl http://localhost:5000/api/health
   ```

---

## 🎓 Next Steps

1. ✅ Complete this quickstart
2. 📖 Read full Admin Dashboard Guide
3. 🔐 Enable MFA on all accounts
4. 📊 Monitor audit logs regularly
5. 🚀 Deploy to production with proper security

---

## 📋 Checklist for Production

Before going live:

- [ ] Change all default passwords
- [ ] Update JWT secrets in environment variables
- [ ] Enable HTTPS/SSL
- [ ] Configure firewall rules
- [ ] Set up backup procedures
- [ ] Configure email notifications
- [ ] Review and test recovery procedures
- [ ] Set up monitoring/alerting
- [ ] Document admin procedures
- [ ] Create admin user accounts
- [ ] Train admins on security policies
- [ ] Perform security audit

---

**Version:** 1.0  
**Last Updated:** 2025-12-04  
**Status:** Ready to Use
