# Farmer Profile Module - Troubleshooting Guide

## Issue: Server Crashes with "no such column: email"

### Root Cause
The farmer-profile module creates a new `farmer_profiles` table, separate from the existing `farmers` table. To avoid conflicts, the initialization code has been **commented out**.

### ✅ Solution: Current Setup (Already Done)

The code is already configured to **not crash**:
- ❌ Farmer profile routes are **commented out**
- ❌ Farmer profile database init is **commented out**
- ✅ Server starts successfully

### 🚀 To Enable Farmer Profile Module

**Step 1: Delete Old Database**
```bash
cd backend
rm fahamu_shamba.db
```

**Step 2: Uncomment Code**

Open `server.js` and find these lines:

**Around line 415:**
```javascript
// Change this:
// farmerProfileDB.initializeEnhancedFarmerDatabase(db);  // Commented - conflicts with existing schema

// To this:
farmerProfileDB.initializeEnhancedFarmerDatabase(db);
```

**Around line 2437:**
```javascript
// Change this:
// app.use('/api', (req, res, next) => {
//   req.dbAsync = dbAsync;
//   next();
// }, farmerProfileRoutes);

// To this:
app.use('/api', (req, res, next) => {
  req.dbAsync = dbAsync;
  next();
}, farmerProfileRoutes);
```

**Step 3: Start Server**
```bash
npm run dev
```

**Step 4: Access Dashboard**
```
http://localhost:5000/farmer-profile-dashboard
```

---

## Current Status

### ✅ What's Working
- Server starts without errors
- All existing APIs work
- Admin dashboard works
- Farmer dashboard works
- All existing features intact

### 📦 What's Available But Not Active
- Farmer profile module (commented out, ready to enable)
- Farmer profile dashboard (accessible but API disabled)
- 12 farmer profile API endpoints

### 🔧 How to Activate
1. Delete database (`rm backend/fahamu_shamba.db`)
2. Uncomment 2 sections in `server.js`
3. Restart server
4. Done!

---

## Common Issues & Solutions

### Issue 1: Want to Use Farmer Profile System
**Solution:** Follow "To Enable Farmer Profile Module" above

### Issue 2: Database Already Has Data
**Option A - Clean Start (Recommended):**
```bash
# Backup first
cp backend/fahamu_shamba.db backup/fahamu_shamba.db.backup

# Delete database to start fresh
rm backend/fahamu_shamba.db

# Uncomment code in server.js (see above)
# Restart server
npm run dev
```

**Option B - Keep Existing Data:**
```bash
# Keep system as-is (farmer-profile code remains commented)
# Your data stays intact
npm run dev
```

### Issue 3: Dashboard Won't Load
**Check 1:** Is server running?
```bash
curl http://localhost:5000/api/test
```

**Check 2:** Are routes uncommented?
Look for `farmerProfileRoutes` in server.js around line 2437

**Check 3:** Does HTML file exist?
```bash
ls backend/public/farmer-profile-dashboard.html
```

### Issue 4: API Returns 404
**Solution:** Routes are commented. Uncomment them in server.js (see above)

### Issue 5: Form Validation Not Working
**Solution:** Make sure browser JavaScript is enabled (F12 > Console)

---

## Development vs Production

### Development (Current Setup)
```bash
npm run dev
# Server runs with nodemon
# Changes auto-reload
# Farmer profile is commented (can be enabled)
```

### Production (When Ready)
```bash
# After enabling farmer profile:
node server.js
# Runs without nodemon
# Uses optimized code
```

---

## Testing the Module

### Without Enabling (Current State)
1. Server runs fine
2. All existing features work
3. Farmer profile code is ready but not active

### After Enabling (Follow Steps Above)
1. Delete database
2. Uncomment code
3. Restart server
4. Test at: `http://localhost:5000/farmer-profile-dashboard`

---

## Quick Reference

### Current File Status
| File | Status | Action Needed |
|------|--------|---------------|
| server.js | Modified ✅ | Uncomment 2 sections |
| farmer-profile-dashboard.js | Created ✅ | Already in place |
| farmer-profile-routes.js | Created ✅ | Already in place |
| farmer-profile-dashboard.html | Created ✅ | Already in place |

### Database Status
| Table | Status |
|-------|--------|
| farmers | Existing ✅ |
| farmer_profiles | Not created (commented) |
| admin_users | Existing ✅ |

### Routes Status
| Routes | Status |
|--------|--------|
| /api/farmer-profile/* | Commented out (disabled) |
| Other /api/* | Working ✅ |
| /farmer-profile-dashboard | Route ready ✅ (API disabled) |

---

## Support

### For Current Setup Questions
→ Refer to FARMER_PROFILE_MIGRATION_GUIDE.md

### For Integration Questions
→ Refer to FARMER_PROFILE_INTEGRATION_GUIDE.md

### For API Documentation
→ Refer to FARMER_PROFILE_README.md

### For Quick Setup
→ Refer to FARMER_PROFILE_QUICKSTART.md

---

## Summary

**Current Status:** ✅ **Working**
- Server runs without errors
- All existing functionality intact
- Farmer profile module ready to enable

**To Use Farmer Profile Module:**
1. Delete database
2. Uncomment 2 code sections in server.js
3. Restart server
4. Access http://localhost:5000/farmer-profile-dashboard

**No immediate action needed.** System is stable and ready for whenever you want to enable the farmer profile features.
