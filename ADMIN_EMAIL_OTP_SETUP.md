# 🔐 Admin Dashboard - Email OTP Setup Guide

## Overview

The admin dashboard now uses **email-based One-Time Password (OTP)** for secure login verification. When an admin logs in, a 6-digit OTP is sent to their email address and must be verified within 5 minutes.

## Quick Start

### Step 1: Configure Gmail (Recommended)

#### For Gmail Account:

1. **Enable 2-Factor Authentication** on your Gmail account
   - Go to https://myaccount.google.com/
   - Click "Security" on the left
   - Enable "2-Step Verification"

2. **Generate App Password**
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" and "Windows Computer" (or other device)
   - Google will generate a 16-character password
   - Copy this password

3. **Update .env file**
   ```env
   EMAIL_USER=cjoarogo@gmail.com
   EMAIL_PASSWORD=your-16-character-app-password
   ```

### Step 2: Create Default Admin Account

```bash
cd backend
node create-default-admin.js
```

This creates an admin account with:
- **Email:** cjoarogo@gmail.com
- **Password:** Jemo@721
- **Role:** Super Admin

### Step 3: Start the Server

```bash
npm start
```

You should see:
```
📧 Initializing email service...
✅ Email service configured and ready
```

### Step 4: Test Login

1. Go to http://localhost:5000/admin
2. Enter email: `cjoarogo@gmail.com`
3. Enter password: `Jemo@721`
4. Check your email for the OTP code
5. Enter the 6-digit code within 5 minutes

---

## Email Configuration Details

### Gmail Setup

**Gmail App Password** is required because Google blocks "less secure apps" by default.

#### Steps to get App Password:

1. **Enable 2-Factor Authentication first** (required by Google)
   ```
   https://myaccount.google.com/security
   ```

2. **Go to App Passwords**
   ```
   https://myaccount.google.com/apppasswords
   ```

3. **Select App and Device**
   - Select "Mail"
   - Select your device type
   - Click "Generate"

4. **Copy the 16-character password**

5. **Add to .env**
   ```
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=your-16-char-password
   ```

### Alternative Email Providers

#### Using Other Email Services

Edit `email-service.js` to use different providers:

**Outlook/Office365:**
```javascript
const transporter = nodemailer.createTransport({
  service: 'outlook',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});
```

**Yahoo Mail:**
```javascript
const transporter = nodemailer.createTransport({
  service: 'yahoo',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});
```

**Custom SMTP Server:**
```javascript
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});
```

---

## Environment Variables

Add these to your `.env` file:

```env
# Email Configuration (required for OTP via email)
EMAIL_USER=cjoarogo@gmail.com
EMAIL_PASSWORD=your-app-password

# Optional: For custom SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
```

### Getting Your Email Configuration

**Gmail:**
- User: your-email@gmail.com
- Password: 16-character app password (from https://myaccount.google.com/apppasswords)

**Outlook:**
- User: your-email@outlook.com
- Password: Your Outlook password

**Yahoo:**
- User: your-email@yahoo.com
- Password: Your Yahoo password or app password

---

## How It Works

### Login Flow

```
1. Admin enters email & password
   ↓
2. System verifies credentials
   ↓
3. Generates 6-digit OTP
   ↓
4. Sends OTP via email
   ↓
5. Admin receives email with OTP
   ↓
6. Admin enters OTP (5-minute window)
   ↓
7. System verifies OTP
   ↓
8. Session created, logged in successfully
```

### OTP Characteristics

- **Length:** 6 digits (000000-999999)
- **Format:** Random, cryptographically secure
- **Expiration:** 5 minutes
- **Attempts:** 3 failed attempts per 5 minutes (rate limited)
- **Delivery:** Email
- **One-time use:** Token marked as used after verification

### Security Features

✅ **Rate Limiting**
- Max 3 OTP verification attempts per 5 minutes
- After 3 failures, must wait before trying again
- Security alert email sent on rate limit breach

✅ **Time-based Expiration**
- OTP valid for 5 minutes only
- Automatically expires after time window
- New OTP required for retry

✅ **Single Use**
- Each OTP can only be used once
- Token marked as used immediately
- Cannot be reused

✅ **Email Notifications**
- OTP sent via email
- Security alerts on suspicious activity
- Welcome emails for new admins

---

## Testing Email Without Gmail

### Console Fallback

If email is not configured, OTP codes are logged to console:

```
🔐 OTP Code for cjoarogo@gmail.com: 123456
```

You can then manually enter the code in the browser.

### Nodemailer Debug Mode

Enable debug logging:

```javascript
// In email-service.js
transporter.set('logger', true);
transporter.set('debug', true);
```

---

## Troubleshooting

### "SMTP Error: Invalid login"

**Problem:** Email credentials are incorrect

**Solution:**
1. Verify EMAIL_USER is correct (exact email address)
2. For Gmail: Use 16-character **App Password**, not regular password
3. Check if Gmail 2FA is enabled
4. Try password reset at: https://myaccount.google.com/security

### "Email service not configured"

**Problem:** EMAIL_USER or EMAIL_PASSWORD not set in .env

**Solution:**
1. Create `.env` file in backend directory if missing
2. Add EMAIL_USER and EMAIL_PASSWORD
3. Restart server: `npm start`

### Email not being received

**Problem:** OTP email not arriving in inbox

**Solution:**
1. Check spam/junk folder
2. Add `noreply@fahamu-shamba.com` to contacts
3. Check email account is receiving other messages
4. Verify .env file has correct credentials
5. Check server logs for errors

### "OTP expired" immediately

**Problem:** OTP expires before you can use it

**Solution:**
1. OTP is valid for 5 minutes
2. Act quickly after receiving email
3. Check system time is correct: `date`
4. If system time is wrong, fix it and get new OTP

### "Too many OTP attempts"

**Problem:** Locked out after 3 failed attempts

**Solution:**
1. Wait 5 minutes for rate limit to reset
2. Try with correct OTP code
3. Contact super admin if truly locked out
4. Super admin can reset by deleting failed tokens from DB:
   ```bash
   sqlite3 fahamu_shamba.db
   DELETE FROM mfa_tokens WHERE expires_at < CURRENT_TIMESTAMP;
   ```

---

## Advanced Configuration

### Customize Email Template

Edit `email-service.js`, function `sendOTPEmail()` to modify:
- Email subject
- HTML template
- Email body text
- Styling

### Change OTP Length

Edit `admin-auth.js`, function `generateMFAToken()`:

```javascript
// Change from 3 bytes (6 digits) to different length
export function generateMFAToken() {
  return crypto.randomBytes(4).toString('hex'); // 8-digit code
}
```

### Adjust Expiration Time

Edit `admin-routes.js`:

```javascript
// Current: 5 minutes
const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

// Change to 10 minutes:
const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
```

### Change Rate Limit

Edit `admin-auth.js`:

```javascript
// Current: 3 attempts per 5 minutes
export const mfaLimiter = new RateLimiter(3, 5 * 60 * 1000);

// Change to: 5 attempts per 5 minutes
export const mfaLimiter = new RateLimiter(5, 5 * 60 * 1000);
```

---

## Security Best Practices

✅ **DO:**
- Use strong, unique app passwords
- Keep EMAIL_PASSWORD secure (never commit to git)
- Monitor failed OTP attempts
- Enable 2FA on email account
- Keep credentials in .env (not in code)
- Regularly review access logs

❌ **DON'T:**
- Share email credentials
- Use regular Gmail password (use App Password)
- Commit .env to version control
- Disable email verification for "convenience"
- Store OTP codes anywhere
- Share OTP with others

---

## Integration with Admin System

The email OTP system is fully integrated:

- ✅ Login flow (password → OTP → session)
- ✅ Rate limiting (brute force protection)
- ✅ Audit logging (all OTP events logged)
- ✅ Security alerts (suspicious activity alerts)
- ✅ Session management (OTP verified → session created)

---

## API Endpoints

### Login (Password)
```
POST /api/admin/login
Content-Type: application/json

{
  "email": "cjoarogo@gmail.com",
  "password": "Jemo@721"
}

Response:
{
  "success": true,
  "requiresOTP": true,
  "message": "OTP sent to your email. Please verify.",
  "emailSent": true,
  "expiresIn": 300
}
```

### Verify OTP
```
POST /api/admin/verify-otp
Content-Type: application/json

{
  "email": "cjoarogo@gmail.com",
  "otp": "123456"
}

Response:
{
  "success": true,
  "message": "OTP verified successfully",
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "sessionId": "abc123...",
  "admin": { ... }
}
```

---

## Logs & Monitoring

### Monitor OTP Events

View logs in `/logs/admin-audit.log`:

```bash
grep "otp_sent" logs/admin-audit.log
grep "otp_verification" logs/admin-audit.log
```

View security events:

```bash
grep "otp_rate_limit_exceeded" logs/admin-security.log
```

### Database Queries

Check OTP tokens:
```sql
SELECT * FROM mfa_tokens WHERE admin_id = 1 ORDER BY created_at DESC;
```

Check login attempts:
```sql
SELECT * FROM system_audit_logs WHERE action LIKE '%otp%' ORDER BY created_at DESC;
```

---

## Default Credentials

**Email:** cjoarogo@gmail.com  
**Password:** Jemo@721  
**Role:** Super Admin

⚠️ **Change these credentials immediately after first login!**

---

## Next Steps

1. ✅ Configure email in .env
2. ✅ Create admin account: `node create-default-admin.js`
3. ✅ Start server: `npm start`
4. ✅ Test login at http://localhost:5000/admin
5. ✅ Check email for OTP
6. ✅ Monitor logs for success
7. ✅ Create additional admin accounts through dashboard

---

**Version:** 1.0  
**Last Updated:** 2025-12-04  
**Status:** Production Ready ✅
