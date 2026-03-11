# MFA (Multi-Factor Authentication) Setup Guide

**Status:** ✅ MFA is now ENABLED

---

## What is MFA?

MFA (Multi-Factor Authentication) = 2-Factor Authentication

**It means:** Login requires **2 different ways** to verify you are who you say you are:

1. **Factor 1:** Email + Password (something you know)
2. **Factor 2:** OTP Code (something you have - sent to your email)

---

## How the MFA Login Works

```
Step 1: User enters email + password
         ↓
Step 2: System verifies credentials
         ↓
Step 3: System generates 6-digit OTP code
         ↓
Step 4: OTP sent to email (or console if not configured)
         ↓
Step 5: User enters OTP code within 5 minutes
         ↓
Step 6: OTP verified
         ↓
Step 7: ✅ User logged in with JWT tokens
         ↓
Step 8: Full access to admin dashboard
```

---

## Enable MFA (Already Done! ✅)

You just enabled MFA by running:
```bash
node enable-mfa.js
```

This set the `mfa_enabled` flag to `1` in the database.

---

## What Changed

### Before (MFA Disabled)
- Login with email + password only
- No OTP verification required
- Single-factor authentication

### After (MFA Enabled) ✅
- Login with email + password
- OTP code sent to email
- OTP verification required (5 minute expiry)
- Two-factor authentication

---

## Login Flow with MFA Enabled

### Step 1: Initial Login
```bash
curl -X POST http://localhost:5000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "cjoarogo@gmail.com",
    "password": "Jemo@721"
  }'
```

**Response:**
```json
{
  "success": true,
  "requiresOTP": true,
  "message": "OTP sent to your email. Please verify.",
  "emailSent": false,
  "expiresIn": 300
}
```

### Step 2: Check Email for OTP
- Check **Gmail inbox** for email from Fahamu Shamba
- Or check **server console** for: `🔐 OTP Code for cjoarogo@gmail.com: XXXXXX`
- Copy the 6-digit code
- **Note:** Code expires in 5 minutes

### Step 3: Verify OTP
```bash
curl -X POST http://localhost:5000/api/admin/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "cjoarogo@gmail.com",
    "otp": "a1b2c3"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "OTP verified successfully",
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "sessionId": "abc123..."
}
```

### Step 4: Use Access Token
```bash
curl -X GET http://localhost:5000/api/admin/dashboard \
  -H "Authorization: Bearer eyJhbGc..."
```

---

## MFA Settings

### Current Settings
- **Status:** Enabled ✅
- **OTP Length:** 6 characters (hex)
- **OTP Expiry:** 5 minutes
- **OTP Delivery:** Email (fallback: console)
- **Rate Limit (Login):** 5 attempts per 15 minutes
- **Rate Limit (OTP):** 3 attempts per 5 minutes
- **Account Lockout:** After 5 failed password attempts

---

## Email Configuration (For Production)

By default, OTP appears in **server console**. To send via email:

### 1. Get Gmail App Password
Go to: https://myaccount.google.com/apppasswords
- Select: **Mail** and **Windows Computer**
- Copy: 16-character password

### 2. Add to `backend/.env`
```env
EMAIL_USER=cjoarogo@gmail.com
EMAIL_PASSWORD=xxxx-xxxx-xxxx-xxxx
```

### 3. Restart Server
```bash
npm run dev
```

**Wait for:**
```
✅ Email service configured and ready
```

---

## Testing MFA

### Manual Test with Curl

```bash
# Terminal 1: Start server
npm run dev

# Terminal 2: Test login
curl -X POST http://localhost:5000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"cjoarogo@gmail.com","password":"Jemo@721"}'

# Look in Terminal 1 console for:
# 🔐 OTP Code for cjoarogo@gmail.com: a1b2c3

# Terminal 2: Verify OTP
curl -X POST http://localhost:5000/api/admin/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"cjoarogo@gmail.com","otp":"a1b2c3"}'

# Should get tokens and be logged in!
```

---

## Admin Dashboard Display

In your admin dashboard, you should now see:

- **MFA Status:** Enabled ✅
- **Login Method:** Email + OTP
- **Session Duration:** 24 hours
- **Access Token Duration:** 15 minutes

---

## API Endpoints for MFA

### 1. Login
```
POST /api/admin/login
Input: { email, password }
Output: { requiresOTP: true, expiresIn: 300 }
```

### 2. Verify OTP
```
POST /api/admin/verify-otp
Input: { email, otp }
Output: { accessToken, refreshToken, sessionId }
```

### 3. Logout
```
POST /api/admin/logout
Headers: Authorization: Bearer <token>
Output: { success: true }
```

### 4. Dashboard (Protected)
```
GET /api/admin/dashboard
Headers: Authorization: Bearer <token>
Output: Dashboard data
```

---

## Security Benefits of MFA

✅ **Stronger Security**
- Even if password is compromised, account is safe
- Attacker needs both password AND email access

✅ **Protection Against**
- Brute force attacks (rate limiting)
- Phishing attempts (OTP expires in 5 minutes)
- Account lockouts (after 5 failed attempts)

✅ **Audit Trail**
- All login attempts logged
- All OTP verification logged
- IP addresses and user agents recorded

---

## Disable MFA (If Needed)

If you need to disable MFA:

```bash
cat > disable-mfa.js << 'EOF'
import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('./fahamu_shamba.db');
db.run(
  `UPDATE admin_users SET mfa_enabled = 0 WHERE email = 'cjoarogo@gmail.com'`,
  function(err) {
    if (err) console.error('Error:', err);
    else console.log('✅ MFA disabled');
    db.close();
  }
);
EOF

node disable-mfa.js
npm run dev
```

---

## Troubleshooting

### "Invalid OTP" Error
- Check OTP code is correct (copy-paste)
- Check code hasn't expired (5 minute limit)
- Check server console for correct code

### "Too many OTP attempts"
- Wait 5 minutes
- Try login again

### "Account is locked"
- Too many failed password attempts (5)
- Contact admin or reset database

### OTP Not Received in Email
- Check spam/trash folder
- Check .env has EMAIL_USER and EMAIL_PASSWORD
- Check server shows: `✅ Email service configured and ready`

---

## Security Checklist

- [x] MFA enabled
- [x] OTP configured (5 min expiry)
- [x] Rate limiting active
- [x] Account lockout protection
- [x] Audit logging enabled
- [x] JWT tokens configured
- [x] Session management enabled
- [ ] Email configured (optional for dev, needed for production)
- [ ] HTTPS enabled (for production)

---

## Next Steps

1. **Restart Server**
   ```bash
   npm run dev
   ```

2. **Test Login**
   - Use credentials: cjoarogo@gmail.com / Jemo@721
   - Get OTP from console or email
   - Enter OTP to verify

3. **Configure Email (Optional)**
   - Follow email configuration steps above
   - Or run: `bash SETUP_EMAIL_OTP.sh`

4. **Build Admin UI**
   - Create login form with email/password
   - Create OTP verification form
   - Use API endpoints documented above

---

## Related Documentation

- **ADMIN_OTP_SETUP_GUIDE.md** - Complete OTP setup
- **ADMIN_OTP_QUICK_REFERENCE.md** - Quick reference
- **ADMIN_OTP_TEST_GUIDE.md** - Testing procedures
- **TROUBLESHOOT_LOGIN.md** - Troubleshooting

---

**Status:** ✅ MFA Enabled  
**Date:** December 4, 2025  
**Last Action:** Ran `node enable-mfa.js`

---

*MFA is now active for all admin logins. Every login requires email + password + OTP verification.*
