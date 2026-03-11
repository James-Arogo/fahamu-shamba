# ⚡ Quick Registration Fix Guide

## The Problem
"❌ Failed to register farmer profile" error appears

## The Solutions (Try in Order)

### 1️⃣ Hard Refresh Browser (99% Fix)
**Windows/Linux**: `Ctrl + Shift + R`
**Mac**: `Cmd + Shift + R`

Then try registration again.

---

### 2️⃣ Fill ALL Required Fields
Before clicking register, ensure:
- ✅ Phone Number (10 digits, e.g., 0700123456)
- ✅ First Name
- ✅ Last Name
- ✅ Sub County (dropdown selection)
- ✅ Farm Size (positive number)
- ✅ Soil Type (dropdown selection)

---

### 3️⃣ Check Browser Console for Details
1. Press `F12`
2. Click "Console" tab
3. Look for messages with 📤 📥 ✅ ❌
4. Share the errors shown

---

### 4️⃣ Check Phone Format
- ✅ **Correct**: 0700123456 (exactly 10 digits)
- ❌ **Wrong**: +254700123456, 700123456, 07001234567

---

### 5️⃣ Restart Server (If Still Broken)
```bash
pkill -f "node.*server"
cd backend
node server.js
```

Wait 3 seconds, then try again.

---

## Success Means
You see: "✓ Registration successful! Farmer ID: FR-..."

Then you're automatically taken to the farmer dashboard.

---

## Still Have Issues?
Share:
1. Screenshot of the error
2. Browser console output (F12 → Console)
3. The data you entered

See `REGISTRATION_ERROR_TROUBLESHOOTING.md` for detailed help.
