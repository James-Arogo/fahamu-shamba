# Admin OTP Authentication - Quick Reference

## 🚀 Quick Start

### Setup Email (One-time)
1. Go to https://myaccount.google.com/security
2. Generate App Password for Gmail
3. Add to `.env`:
   ```env
   EMAIL_USER=cjoarogo@gmail.com
   EMAIL_PASSWORD=your-app-password
   ```
4. Restart server

### Login Steps
1. **Email:** `cjoarogo@gmail.com`
2. **Password:** `Jemo@721`
3. **System sends 6-digit OTP** to email
4. **Enter OTP** (expires in 5 minutes)
5. ✅ **Logged in!**

---

## 📋 Default Credentials

| Field | Value |
|-------|-------|
| Email | cjoarogo@gmail.com |
| Password | Jemo@721 |
| Role | Super Admin |
| OTP Expiry | 5 minutes |

---

## 🔗 API Endpoints

### Login
```bash
POST /api/admin/login
{
  "email": "cjoarogo@gmail.com",
  "password": "Jemo@721"
}
```
**Response:** `requiresOTP: true` + OTP sent to email

### Verify OTP
```bash
POST /api/admin/verify-otp
{
  "email": "cjoarogo@gmail.com",
  "otp": "a1b2c3"
}
```
**Response:** Access token + Session ID

### Logout
```bash
POST /api/admin/logout
Headers: Authorization: Bearer <access-token>
```

---

## ⚙️ Configuration

### .env Requirements
```env
EMAIL_USER=cjoarogo@gmail.com
EMAIL_PASSWORD=your-16-char-app-password
ADMIN_JWT_SECRET=your-secret
ADMIN_REFRESH_SECRET=your-refresh-secret
```

### Security Settings
- OTP: 6 characters, 5 minute expiry
- Login rate limit: 5 attempts per 15 minutes
- OTP rate limit: 3 attempts per 5 minutes
- Account lock: After 5 failed attempts
- Session expiry: 24 hours

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| OTP not received | Check spam folder or .env config |
| OTP expired | Request new one by logging in again |
| Rate limit exceeded | Wait 5 minutes |
| Account locked | Contact admin or reset DB |
| Email service error | Check .env EMAIL_USER & EMAIL_PASSWORD |

---

## 📱 Frontend Example

```javascript
// Step 1: Login
const loginRes = await fetch('/api/admin/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'cjoarogo@gmail.com',
    password: 'Jemo@721'
  })
});

// Step 2: Verify OTP
const otpRes = await fetch('/api/admin/verify-otp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'cjoarogo@gmail.com',
    otp: 'a1b2c3' // from email
  })
});

// Step 3: Use token
const token = otpRes.accessToken;
```

---

## 📊 Database Tables

- **admin_users** - Admin credentials
- **mfa_tokens** - OTP codes (auto-expire after 5 min)
- **admin_sessions** - Active sessions (24 hour expiry)
- **system_audit_logs** - All login/OTP events

---

## 📧 Gmail App Password Setup

1. Enable 2-Step Verification: https://myaccount.google.com/security
2. Create App Password: https://myaccount.google.com/apppasswords
3. Select "Mail" + "Windows Computer" 
4. Copy 16-character password
5. Add to `.env` as `EMAIL_PASSWORD`

**Don't use your regular Gmail password!**

---

## 🔑 Admin Management

### Create new admin (requires auth):
```bash
POST /api/admin/admins
{
  "email": "newadmin@example.com",
  "password": "StrongPassword123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "admin"
}
```

### Roles:
- `super_admin` - Full access
- `admin` - Limited access
- `moderator` - Basic access

---

## 📝 Session Tokens

- **Access Token:** 15 min expiry
- **Refresh Token:** 7 day expiry
- **Session:** 24 hour expiry

### Refresh Access Token
```bash
POST /api/admin/refresh-token
{
  "refreshToken": "<refresh-token>"
}
```

---

## 🚨 Security Features

✅ SHA-256 password hashing  
✅ OTP verification required  
✅ Rate limiting (login + OTP)  
✅ Account lockout protection  
✅ Session management  
✅ CSRF protection  
✅ Audit logging  
✅ Security alerts via email  

---

## 📞 Getting Help

### OTP not working?
1. Check server console for OTP code
2. Verify `.env` has EMAIL_USER and EMAIL_PASSWORD
3. Check Gmail spam folder
4. Try requesting new OTP (login again)

### Can't log in?
1. Verify credentials: `cjoarogo@gmail.com` / `Jemo@721`
2. Check if account is locked (contact admin)
3. Wait if rate limited (5 min)

---

**Status:** ✅ Active  
**Last Updated:** 2025-12-04
