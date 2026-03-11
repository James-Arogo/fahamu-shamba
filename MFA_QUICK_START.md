# MFA Quick Start

## ✅ MFA is Now Enabled!

Your admin account now requires **2-Factor Authentication**.

---

## Login Flow (3 Steps)

### Step 1: Enter Email + Password
```
Email: cjoarogo@gmail.com
Password: Jemo@721
```

### Step 2: Receive OTP Code
- Check **Gmail inbox** (or)
- Check **server console** for: `🔐 OTP Code for cjoarogo@gmail.com: XXXXXX`

### Step 3: Enter OTP
- Enter 6-digit code
- Code expires in 5 minutes
- Cannot be reused

---

## Test with Curl

```bash
# Terminal 1: Start server
npm run dev

# Terminal 2: Login
curl -X POST http://localhost:5000/api/admin/login \
  -d '{"email":"cjoarogo@gmail.com","password":"Jemo@721"}'

# Check Terminal 1 for OTP code

# Verify OTP (replace XXXXXX)
curl -X POST http://localhost:5000/api/admin/verify-otp \
  -d '{"email":"cjoarogo@gmail.com","otp":"XXXXXX"}'
```

---

## Send OTP via Gmail (Optional)

```bash
# 1. Get app password: https://myaccount.google.com/apppasswords
# 2. Add to backend/.env:
EMAIL_USER=cjoarogo@gmail.com
EMAIL_PASSWORD=your-app-password

# 3. Restart: npm run dev
```

---

## MFA Features

✅ 6-digit OTP code  
✅ 5-minute expiry  
✅ Rate limiting (3 attempts per 5 min)  
✅ Email delivery (Gmail SMTP)  
✅ Audit logging  
✅ Account lockout protection  

---

**Status:** ✅ Enabled  
**Credentials:** cjoarogo@gmail.com / Jemo@721
