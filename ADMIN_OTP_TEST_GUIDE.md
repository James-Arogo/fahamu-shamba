# Admin OTP Authentication - Test Guide

---

## Quick Start Test (2 minutes)

### Without Email Configuration (Console-based testing)

```bash
# Terminal 1: Start server
cd backend
npm start

# Wait for:
# ⚠️  Email service not configured
# OTP codes will be logged to console instead
```

```bash
# Terminal 2: Test login
curl -X POST http://localhost:5000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "cjoarogo@gmail.com",
    "password": "Jemo@721"
  }'

# Expected response:
# {
#   "success": true,
#   "requiresOTP": true,
#   "message": "OTP sent to your email. Please verify.",
#   "emailSent": false,
#   "expiresIn": 300
# }

# Check Terminal 1 server logs for:
# 🔐 OTP Code for cjoarogo@gmail.com: a1b2c3
```

```bash
# Use the OTP from console logs
curl -X POST http://localhost:5000/api/admin/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "cjoarogo@gmail.com",
    "otp": "a1b2c3"
  }'

# Expected response with tokens:
# {
#   "success": true,
#   "message": "OTP verified successfully",
#   "accessToken": "eyJhbGc...",
#   "refreshToken": "eyJhbGc...",
#   "sessionId": "...",
#   "admin": {
#     "id": 1,
#     "email": "cjoarogo@gmail.com",
#     "name": "System Administrator",
#     "role": "super_admin"
#   }
# }
```

---

## Full Test Suite

### Test 1: Valid Login (Should send OTP)

```bash
curl -X POST http://localhost:5000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "cjoarogo@gmail.com",
    "password": "Jemo@721"
  }'
```

**Expected:**
- ✅ `success: true`
- ✅ `requiresOTP: true`
- ✅ Check console for OTP code
- ✅ `expiresIn: 300`

---

### Test 2: Invalid Email (Should reject)

```bash
curl -X POST http://localhost:5000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "wrong@example.com",
    "password": "Jemo@721"
  }'
```

**Expected:**
- ✅ `success: false`
- ✅ `message: "Invalid credentials"`
- ✅ HTTP 401

---

### Test 3: Invalid Password (Should reject)

```bash
curl -X POST http://localhost:5000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "cjoarogo@gmail.com",
    "password": "WrongPassword"
  }'
```

**Expected:**
- ✅ `success: false`
- ✅ `message: "Invalid credentials"`
- ✅ HTTP 401
- ✅ Failed attempt counter increments

---

### Test 4: Valid OTP (Should grant access)

```bash
# First, get OTP from login endpoint
RESPONSE=$(curl -s -X POST http://localhost:5000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "cjoarogo@gmail.com",
    "password": "Jemo@721"
  }')

# Check server console for: 🔐 OTP Code for cjoarogo@gmail.com: XXXXXX
# Use that OTP code (replace a1b2c3 below)

curl -X POST http://localhost:5000/api/admin/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "cjoarogo@gmail.com",
    "otp": "a1b2c3"
  }'
```

**Expected:**
- ✅ `success: true`
- ✅ `accessToken` provided
- ✅ `refreshToken` provided
- ✅ `sessionId` provided
- ✅ Admin data returned

---

### Test 5: Invalid OTP (Should reject)

```bash
curl -X POST http://localhost:5000/api/admin/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "cjoarogo@gmail.com",
    "otp": "invalid"
  }'
```

**Expected:**
- ✅ `success: false`
- ✅ `message: "Invalid or expired OTP"`
- ✅ HTTP 401

---

### Test 6: Expired OTP (Wait 5+ minutes)

```bash
# 1. Login to get OTP
curl -X POST http://localhost:5000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "cjoarogo@gmail.com",
    "password": "Jemo@721"
  }'

# 2. Wait 5 minutes

# 3. Try to verify OTP (should fail)
curl -X POST http://localhost:5000/api/admin/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "cjoarogo@gmail.com",
    "otp": "a1b2c3"
  }'
```

**Expected:**
- ✅ `success: false`
- ✅ `message: "Invalid or expired OTP"`

---

### Test 7: Rate Limiting - OTP (3+ attempts in 5 minutes)

```bash
# Attempt 1
curl -X POST http://localhost:5000/api/admin/verify-otp \
  -d '{"email":"cjoarogo@gmail.com","otp":"wrong1"}'

# Attempt 2
curl -X POST http://localhost:5000/api/admin/verify-otp \
  -d '{"email":"cjoarogo@gmail.com","otp":"wrong2"}'

# Attempt 3
curl -X POST http://localhost:5000/api/admin/verify-otp \
  -d '{"email":"cjoarogo@gmail.com","otp":"wrong3"}'

# Attempt 4 (should be rate limited)
curl -X POST http://localhost:5000/api/admin/verify-otp \
  -d '{"email":"cjoarogo@gmail.com","otp":"wrong4"}'
```

**Expected:**
- ✅ First 3 attempts: `message: "Invalid or expired OTP"`
- ✅ 4th attempt: `message: "Too many OTP attempts"`
- ✅ HTTP 429 (Too Many Requests)
- ✅ `retryAfter` indicates seconds to wait

---

### Test 8: Missing Credentials (Should reject)

```bash
# No email
curl -X POST http://localhost:5000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"password": "Jemo@721"}'

# No password
curl -X POST http://localhost:5000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email": "cjoarogo@gmail.com"}'

# Empty body
curl -X POST http://localhost:5000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected:**
- ✅ `success: false`
- ✅ `message: "Email and password required"`
- ✅ HTTP 400

---

### Test 9: Account Lockout (5 failed password attempts)

```bash
# Failed login attempts
for i in {1..5}; do
  curl -X POST http://localhost:5000/api/admin/login \
    -H "Content-Type: application/json" \
    -d '{
      "email": "cjoarogo@gmail.com",
      "password": "WrongPassword"
    }'
  echo "Attempt $i failed"
done

# Check database to see if locked
sqlite3 backend/fahamu_shamba.db \
  "SELECT email, status, failed_login_attempts FROM admin_users WHERE email='cjoarogo@gmail.com';"

# Should show: cjoarogo@gmail.com|locked|5

# Try to login with correct password
curl -X POST http://localhost:5000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "cjoarogo@gmail.com",
    "password": "Jemo@721"
  }'
```

**Expected:**
- ✅ First 5 attempts fail with "Invalid credentials"
- ✅ Account status changes to "locked"
- ✅ 6th attempt fails with "Account is locked. Contact administrator."

---

### Test 10: Database State Verification

```bash
# Check admin users table
sqlite3 backend/fahamu_shamba.db \
  "SELECT id, email, role, status, login_count FROM admin_users;"

# Check OTP tokens (should be empty or used)
sqlite3 backend/fahamu_shamba.db \
  "SELECT admin_id, token, used, expires_at FROM mfa_tokens ORDER BY created_at DESC LIMIT 5;"

# Check sessions
sqlite3 backend/fahamu_shamba.db \
  "SELECT admin_id, session_id, ip_address, expires_at FROM admin_sessions;"

# Check audit logs
sqlite3 backend/fahamu_shamba.db \
  "SELECT admin_id, email, action, status, created_at FROM system_audit_logs ORDER BY created_at DESC LIMIT 10;"
```

---

## Postman Testing

### Setup Postman Collection

#### Request 1: Login
```
Method: POST
URL: http://localhost:5000/api/admin/login
Headers: 
  Content-Type: application/json
Body (JSON):
{
  "email": "cjoarogo@gmail.com",
  "password": "Jemo@721"
}
```

#### Request 2: Verify OTP
```
Method: POST
URL: http://localhost:5000/api/admin/verify-otp
Headers:
  Content-Type: application/json
Body (JSON):
{
  "email": "cjoarogo@gmail.com",
  "otp": "a1b2c3"
}
```

#### Request 3: Logout
```
Method: POST
URL: http://localhost:5000/api/admin/logout
Headers:
  Authorization: Bearer {{accessToken}}
  Content-Type: application/json
```

#### Request 4: Get Dashboard
```
Method: GET
URL: http://localhost:5000/api/admin/dashboard
Headers:
  Authorization: Bearer {{accessToken}}
```

### Postman Variables
```
accessToken = (from verify-otp response)
refreshToken = (from verify-otp response)
sessionId = (from verify-otp response)
```

---

## JavaScript Testing

```javascript
// Login test
async function testAdminLogin() {
  try {
    const response = await fetch('http://localhost:5000/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'cjoarogo@gmail.com',
        password: 'Jemo@721'
      })
    });
    
    const data = await response.json();
    console.log('Login Response:', data);
    
    if (data.success && data.requiresOTP) {
      console.log('✅ OTP required. Check console for code.');
      return data;
    }
  } catch (error) {
    console.error('Login error:', error);
  }
}

// OTP verification test
async function testOTPVerification(email, otp) {
  try {
    const response = await fetch('http://localhost:5000/api/admin/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp })
    });
    
    const data = await response.json();
    console.log('OTP Response:', data);
    
    if (data.success) {
      console.log('✅ Login successful!');
      console.log('Access Token:', data.accessToken);
      console.log('Session ID:', data.sessionId);
    }
    return data;
  } catch (error) {
    console.error('OTP error:', error);
  }
}

// Run tests
testAdminLogin().then(loginData => {
  if (loginData) {
    // After getting OTP from console, call:
    // testOTPVerification('cjoarogo@gmail.com', 'a1b2c3')
  }
});
```

---

## Email Configuration Test

Once you add EMAIL_USER and EMAIL_PASSWORD to .env:

```bash
# Restart server
npm start

# Should show:
# ✅ Email service configured and ready

# Then test login
curl -X POST http://localhost:5000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "cjoarogo@gmail.com",
    "password": "Jemo@721"
  }'

# Check your email inbox for OTP
# Should receive email with subject: "🌱 Fahamu Shamba - Admin Login OTP"
```

---

## Test Results Checklist

### Basic Functionality
- [ ] Valid credentials send OTP
- [ ] Invalid email rejected
- [ ] Invalid password rejected
- [ ] Valid OTP grants access
- [ ] Invalid OTP rejected
- [ ] Expired OTP rejected
- [ ] Missing credentials rejected

### Security
- [ ] Rate limiting on OTP (3 attempts/5min)
- [ ] Rate limiting on login (5 attempts/15min)
- [ ] Account lockout after 5 failed attempts
- [ ] OTP expires after 5 minutes
- [ ] Sessions expire after 24 hours
- [ ] Tokens issued correctly

### Database
- [ ] Admin user created with correct credentials
- [ ] OTP tokens stored and marked as used
- [ ] Sessions created and stored
- [ ] Audit logs recorded
- [ ] Failed attempts tracked

### Email (if configured)
- [ ] OTP email received
- [ ] Email contains 6-digit code
- [ ] Email is from configured EMAIL_USER
- [ ] Email expires message shows 5 minutes

---

## Automated Test Script

Save as `test-otp.sh`:

```bash
#!/bin/bash

set -e

API_URL="http://localhost:5000"
EMAIL="cjoarogo@gmail.com"
PASSWORD="Jemo@721"

echo "Testing Admin OTP Authentication"
echo "=================================="

# Test 1: Login
echo "Test 1: Login with valid credentials..."
RESPONSE=$(curl -s -X POST $API_URL/api/admin/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

echo "Response: $RESPONSE"

if echo "$RESPONSE" | grep -q '"requiresOTP":true'; then
  echo "✅ OTP required"
  
  # Extract OTP from response or console
  echo "Check server logs for OTP code..."
else
  echo "❌ OTP not required"
  exit 1
fi

echo ""
echo "All basic tests passed! ✅"
```

Make executable:
```bash
chmod +x test-otp.sh
./test-otp.sh
```

---

## Performance Testing

### Load test (simulated users)

```bash
# Using Apache Bench (install with: apt install apache2-utils)
ab -n 100 -c 10 -m POST \
  -H "Content-Type: application/json" \
  -d '{"email":"cjoarogo@gmail.com","password":"Jemo@721"}' \
  http://localhost:5000/api/admin/login

# Results should show:
# - Reasonable response time (<100ms)
# - No errors (rate limiting after ~5-7 requests)
```

---

## Debugging Tips

### Check Server Logs
```bash
# Monitor logs in real-time
tail -f backend/server.log

# Look for:
# ✅ Email service configured
# 🔐 OTP Code for...
# ⚠️ Email service not configured
# Rate limit exceeded
```

### Check Database State
```bash
# View admin users
sqlite3 backend/fahamu_shamba.db "SELECT * FROM admin_users;"

# View OTP tokens
sqlite3 backend/fahamu_shamba.db "SELECT * FROM mfa_tokens;"

# View sessions
sqlite3 backend/fahamu_shamba.db "SELECT * FROM admin_sessions;"

# View audit logs
sqlite3 backend/fahamu_shamba.db "SELECT * FROM system_audit_logs;"
```

### Check Network
```bash
# Monitor network requests
curl -v -X POST http://localhost:5000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"cjoarogo@gmail.com","password":"Jemo@721"}'

# Shows full request/response including headers
```

---

## Conclusion

All tests should pass with console-based OTP (no email config needed).

Once email is configured, run again to verify email delivery.

---

**Ready to test?** Run: `npm start` in backend/ and follow Quick Start Test above.
