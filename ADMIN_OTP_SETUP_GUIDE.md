# Admin OTP Authentication Setup Guide

## Overview
The admin login system now requires **OTP (One-Time Password) verification via email** for enhanced security. When an admin enters valid credentials, an OTP code is automatically sent to their email. The code expires after **5 minutes**.

## Default Admin Credentials
- **Email:** `cjoarogo@gmail.com`
- **Password:** `Jemo@721`
- **Role:** Super Admin (Full Access)

## How It Works

### 1. Login Flow
```
Admin enters email & password
          ↓
System validates credentials
          ↓
If valid: OTP generated & sent to email
          ↓
Response: "requiresOTP: true" + email sent confirmation
          ↓
Admin enters OTP within 5 minutes
          ↓
OTP verified
          ↓
Session created + JWT tokens issued
          ↓
Admin logged in successfully
```

### 2. OTP Details
- **OTP Length:** 6 characters (hex format)
- **Expiry:** 5 minutes (300 seconds)
- **Delivery Method:** Email (Gmail SMTP)
- **Fallback:** Console logging if email not configured
- **Rate Limit:** 3 OTP attempts per 5 minutes

## Email Configuration

### Gmail SMTP Setup (Recommended)

1. **Create a Gmail App Password:**
   - Go to https://myaccount.google.com/security
   - Enable "2-Step Verification" if not already enabled
   - Go to "App passwords" and select "Mail" + "Windows Computer"
   - Generate and copy the 16-character app password

2. **Update `.env` file:**
   ```env
   EMAIL_USER=cjoarogo@gmail.com
   EMAIL_PASSWORD=your-16-char-app-password
   ```

   Replace `your-16-char-app-password` with the actual App Password from Gmail.

3. **Verify Configuration:**
   When the server starts, you should see:
   ```
   ✅ Email service configured and ready
   ```

### Without Email Configuration (Development)

If you don't configure email, OTP codes will be logged to the console:
```
🔐 OTP Code for cjoarogo@gmail.com: a1b2c3
```

You can then use the code `a1b2c3` to verify in the UI.

## API Endpoints

### 1. POST `/api/admin/login`
**Login with email and password**

**Request:**
```json
{
  "email": "cjoarogo@gmail.com",
  "password": "Jemo@721"
}
```

**Response (Success - OTP Sent):**
```json
{
  "success": true,
  "requiresOTP": true,
  "message": "OTP sent to your email. Please verify.",
  "emailSent": true,
  "expiresIn": 300
}
```

**Response (Invalid Credentials):**
```json
{
  "success": false,
  "message": "Invalid credentials"
}
```

### 2. POST `/api/admin/verify-otp`
**Verify OTP and complete login**

**Request:**
```json
{
  "email": "cjoarogo@gmail.com",
  "otp": "a1b2c3"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "OTP verified successfully",
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "sessionId": "...",
  "admin": {
    "id": 1,
    "email": "cjoarogo@gmail.com",
    "name": "System Administrator",
    "role": "super_admin"
  }
}
```

**Response (Invalid/Expired OTP):**
```json
{
  "success": false,
  "message": "Invalid or expired OTP"
}
```

## Frontend Implementation

### Example: HTML Form

```html
<!-- Step 1: Login Form -->
<form id="loginForm">
  <input type="email" name="email" placeholder="Email" required />
  <input type="password" name="password" placeholder="Password" required />
  <button type="submit">Login</button>
</form>

<!-- Step 2: OTP Form (shown after successful login) -->
<form id="otpForm" style="display: none;">
  <input type="text" name="otp" placeholder="Enter 6-digit OTP" maxlength="6" required />
  <button type="submit">Verify OTP</button>
</form>

<script>
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = e.target.email.value;
  const password = e.target.password.value;
  
  try {
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (data.success && data.requiresOTP) {
      // Hide login form, show OTP form
      document.getElementById('loginForm').style.display = 'none';
      document.getElementById('otpForm').style.display = 'block';
      
      // Store email for OTP verification
      localStorage.setItem('adminEmail', email);
    } else {
      alert('Login failed: ' + data.message);
    }
  } catch (error) {
    alert('Error: ' + error.message);
  }
});

document.getElementById('otpForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = localStorage.getItem('adminEmail');
  const otp = e.target.otp.value;
  
  try {
    const response = await fetch('/api/admin/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Store tokens
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('sessionId', data.sessionId);
      
      // Redirect to dashboard
      window.location.href = '/admin/dashboard';
    } else {
      alert('OTP verification failed: ' + data.message);
    }
  } catch (error) {
    alert('Error: ' + error.message);
  }
});
</script>
```

## Security Features

1. **Password Hashing:** SHA-256 with salt
2. **Rate Limiting:** 5 login attempts per 15 minutes
3. **OTP Expiry:** 5 minutes (300 seconds)
4. **OTP Rate Limit:** 3 attempts per 5 minutes
5. **Account Lockout:** After 5 failed login attempts
6. **Session Management:** 24-hour expiry with CSRF protection
7. **Audit Logging:** All login attempts and OTP events logged
8. **Security Alerts:** Email notification on suspicious activity

## Database Tables

### admin_users
- Stores admin user credentials and settings
- Fields: email, password_hash, role, mfa_enabled, status, etc.

### mfa_tokens
- Stores OTP codes with expiry times
- Auto-cleaned up after expiry
- One-time use (marked as `used` after verification)

### admin_sessions
- Stores active admin sessions
- Tracks IP address and user agent
- 24-hour expiry

### system_audit_logs
- Logs all admin activities
- Includes: login attempts, OTP verification, configuration changes, etc.

## Testing OTP Authentication

### Via curl:

```bash
# Step 1: Request login (will send OTP to email or console)
curl -X POST http://localhost:5000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "cjoarogo@gmail.com",
    "password": "Jemo@721"
  }'

# Step 2: Verify OTP (use code from email or console)
curl -X POST http://localhost:5000/api/admin/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "cjoarogo@gmail.com",
    "otp": "a1b2c3"
  }'
```

### Via Postman:

1. Create POST request to `http://localhost:5000/api/admin/login`
2. Body (JSON): `{"email": "cjoarogo@gmail.com", "password": "Jemo@721"}`
3. Look for OTP in console or email
4. Create POST request to `http://localhost:5000/api/admin/verify-otp`
5. Body (JSON): `{"email": "cjoarogo@gmail.com", "otp": "code-from-email"}`

## Troubleshooting

### "Email service not configured" message
**Solution:** Add `EMAIL_USER` and `EMAIL_PASSWORD` to `.env` file

### OTP not received in email
**Possible causes:**
- Email credentials not set in `.env`
- Gmail App Password is incorrect
- 2-Step Verification not enabled on Gmail account
- Check spam/trash folder

**Solution:** Check console for OTP (logs there as fallback)

### "OTP rate limit exceeded"
**Cause:** More than 3 OTP verification attempts in 5 minutes

**Solution:** Wait 5 minutes before retrying, or request a new OTP by logging in again

### "Account is locked"
**Cause:** More than 5 failed login password attempts

**Solution:** Contact super admin to unlock account, or reset via database:
```sql
UPDATE admin_users SET status = 'active', failed_login_attempts = 0 
WHERE email = 'cjoarogo@gmail.com';
```

## Environment Variables

Required in `.env` for email functionality:

```env
# Email Configuration
EMAIL_USER=cjoarogo@gmail.com
EMAIL_PASSWORD=your-16-char-app-password-from-gmail

# JWT Secrets (optional, defaults provided)
ADMIN_JWT_SECRET=your-secret-key-change-in-production
ADMIN_REFRESH_SECRET=your-refresh-secret-key

# Password Salt (optional)
PASSWORD_SALT=your-salt-change-in-production
```

## Next Steps

1. ✅ **Setup Email:** Configure `EMAIL_USER` and `EMAIL_PASSWORD` in `.env`
2. ✅ **Start Server:** Run `npm start` in the backend directory
3. ✅ **Test Login:** Visit `http://localhost:5000/admin`
4. ✅ **Use Credentials:**
   - Email: `cjoarogo@gmail.com`
   - Password: `Jemo@721`
5. ✅ **Verify OTP:** Check email for 6-digit code (or console if email not configured)
6. ✅ **Access Dashboard:** After OTP verification, you're logged in!

## Admin Account Management

### Create Additional Admin Users

Via API (requires authentication):
```bash
curl -X POST http://localhost:5000/api/admin/admins \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access-token>" \
  -d '{
    "email": "newadmin@example.com",
    "password": "SecurePassword123",
    "firstName": "John",
    "lastName": "Doe",
    "role": "admin"
  }'
```

### Roles Available
- **super_admin:** Full system access
- **admin:** Limited admin access (manage farmers, view logs, manage alerts)
- **moderator:** Basic access (view dashboard, manage farmers, view logs)

## Session Management

- **Access Token Expiry:** 15 minutes
- **Refresh Token Expiry:** 7 days
- **Session Expiry:** 24 hours

To refresh access token:
```bash
curl -X POST http://localhost:5000/api/admin/refresh-token \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "<refresh-token>"}'
```

## Audit Trail

All login attempts and OTP events are logged in the database for security auditing. View logs via:

```bash
curl -X GET http://localhost:5000/api/admin/audit-logs \
  -H "Authorization: Bearer <access-token>"
```

---

**Last Updated:** 2025-12-04
**Status:** ✅ OTP Email Authentication Active
