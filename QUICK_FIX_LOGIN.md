# Quick Fix - "Invalid Credentials" Error

**TL;DR:** Your credentials work! Follow these steps to fix the error.

---

## 🔧 Quick Fixes (Try in Order)

### Fix #1: Create/Recreate Admin User (Most Common)
```bash
cd backend
node create-default-admin.js
```

**Expected output:**
```
✅ Admin account created successfully!
Email:    cjoarogo@gmail.com
Password: Jemo@721
```

Then test login again.

---

### Fix #2: Start the Server
```bash
cd backend
npm start
```

**Wait for this message:**
```
✅ Connected to SQLite database
🚀 Server running on port 5000
```

Then test login in another terminal.

---

### Fix #3: Verify Credentials (Copy-Paste Exactly)
```bash
curl -X POST http://localhost:5000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"cjoarogo@gmail.com","password":"Jemo@721"}'
```

**Change NOTHING:**
- Email: `cjoarogo@gmail.com` (exact, with .com)
- Password: `Jemo@721` (exact case)

---

### Fix #4: Reset Database (Nuclear Option)
```bash
cd backend
rm fahamu_shamba.db
npm start &
sleep 3
node create-default-admin.js
kill %1
```

---

## ✅ Test Login (3 Steps)

**Terminal 1:**
```bash
cd backend && npm start
```

**Terminal 2:**
```bash
# Step 1: Login
curl -X POST http://localhost:5000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"cjoarogo@gmail.com","password":"Jemo@721"}'

# Step 2: Check Terminal 1 for OTP (look for: 🔐 OTP Code for...)
# Copy the code (e.g., 39374b)

# Step 3: Verify OTP (replace XXXXXX with actual code)
curl -X POST http://localhost:5000/api/admin/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"cjoarogo@gmail.com","otp":"XXXXXX"}'
```

---

## 📋 Checklist

- [ ] Ran `node create-default-admin.js`? 
- [ ] Server running with `npm start`?
- [ ] Using exact credentials (copy-paste)?
- [ ] Waiting 3+ seconds after starting server?
- [ ] Checking server console for OTP code?

---

## 🎯 Correct Credentials

```
Email:    cjoarogo@gmail.com
Password: Jemo@721
```

NOT:
- ❌ cjoarogo@gmail
- ❌ Jemo@721 (with typo)
- ❌ jemo@721 (lowercase)

---

## 💡 What "Invalid Credentials" Actually Means

1. Admin doesn't exist in database → Run `create-default-admin.js`
2. Server not running → Run `npm start`
3. Password doesn't match → Check database was initialized
4. Account locked → Too many failed attempts
5. Database corrupted → Delete and recreate

---

## 🆘 Still Not Working?

1. Read: **TROUBLESHOOT_LOGIN.md** (comprehensive guide)
2. Read: **ADMIN_OTP_SETUP_GUIDE.md** (full setup)
3. Run: **SETUP_EMAIL_OTP.sh** (email configuration)

All files are in the root directory.

---

**Status:** ✅ Credentials verified working  
**Solution:** Follow Fix #1, #2, or #3 above
