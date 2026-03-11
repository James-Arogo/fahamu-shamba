# Farmer Profile Module - Migration & Integration Guide

## Issue Identified

The Farmer Profile Module uses a **separate database table** (`farmer_profiles`) from the existing `farmers` table. This was intentional to:
- Avoid conflicts with existing farmer data
- Maintain backward compatibility
- Create an enhanced schema with more fields

However, running both simultaneously requires careful integration.

## Solution: Two Approach Options

### Option 1: Use Farmer Profile Module (Recommended for New Installations)

If you're starting fresh or want to migrate to the enhanced system:

**Step 1: Delete existing database**
```bash
rm backend/fahamu_shamba.db
```

**Step 2: Re-enable farmer profile initialization**

Edit `backend/server.js` and uncomment:
```javascript
// Change from:
// farmerProfileDB.initializeEnhancedFarmerDatabase(db);  // Commented

// To:
farmerProfileDB.initializeEnhancedFarmerDatabase(db);
```

**Step 3: Re-enable farmer profile routes**

Edit `backend/server.js` and uncomment:
```javascript
// Change from:
// app.use('/api', (req, res, next) => {
//   req.dbAsync = dbAsync;
//   next();
// }, farmerProfileRoutes);

// To:
app.use('/api', (req, res, next) => {
  req.dbAsync = dbAsync;
  next();
}, farmerProfileRoutes);
```

**Step 4: Start server**
```bash
npm run dev
```

**Step 5: Access dashboard**
```
http://localhost:5000/farmer-profile-dashboard
```

### Option 2: Keep Existing System + Add Farmer Profile as Optional

If you want to keep your existing farmer data and add the profile system alongside:

**Step 1: Keep commented code as-is**

The farmer-profile routes and database initialization remain commented.

**Step 2: Access farmer profile dashboard via direct HTML**

Open directly in browser (without API integration):
```
file:///path/to/backend/public/farmer-profile-dashboard.html
```

**Step 3: Use API separately**

When ready to integrate, enable routes by uncommenting in `server.js`.

## Integration Steps (For Option 1)

### 1. Fresh Start

```bash
# Remove old database
rm backend/fahamu_shamba.db

# Edit server.js - uncomment two sections:
# 1. Line ~415: farmerProfileDB.initializeEnhancedFarmerDatabase(db);
# 2. Line ~2437: app.use('/api', ..., farmerProfileRoutes);

# Start server
npm run dev
```

### 2. Enable on Existing Installation

If you already have data:

```bash
# Backup your database first!
cp backend/fahamu_shamba.db backend/fahamu_shamba.db.backup

# Then either:
# Option A: Delete and start fresh (data loss)
rm backend/fahamu_shamba.db

# Option B: Manually add tables (advanced)
# Run database migration script (see below)
```

### 3. Database Migration (Advanced)

If you want to keep existing data, manually create the farmer_profiles table:

```sql
-- Add this to SQLite manually:
CREATE TABLE IF NOT EXISTS farmer_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  farmer_id TEXT UNIQUE NOT NULL,
  phone_number TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  date_of_birth DATE,
  gender TEXT CHECK(gender IN ('male', 'female', 'other')),
  id_number TEXT,
  national_id_type TEXT DEFAULT 'national_id',
  sub_county TEXT NOT NULL,
  ward TEXT,
  soil_type TEXT,
  farm_size REAL,
  farm_size_unit TEXT DEFAULT 'acres',
  water_source TEXT,
  water_source_type TEXT,
  crops_grown TEXT,
  livestock_kept TEXT,
  annual_income REAL,
  budget REAL,
  preferred_language TEXT DEFAULT 'english',
  contact_method TEXT DEFAULT 'sms',
  profile_completion_percentage INTEGER DEFAULT 0,
  profile_verified BOOLEAN DEFAULT 0,
  verified_by TEXT,
  verified_at DATETIME,
  is_active BOOLEAN DEFAULT 1,
  last_updated_by TEXT,
  last_login DATETIME,
  login_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS farmer_activity_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  farmer_id TEXT NOT NULL,
  activity_type TEXT NOT NULL,
  description TEXT,
  metadata TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(farmer_id) REFERENCES farmer_profiles(farmer_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS farmer_farms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  farmer_id TEXT NOT NULL,
  farm_name TEXT,
  farm_location TEXT,
  farm_size REAL,
  farm_size_unit TEXT DEFAULT 'acres',
  soil_type TEXT,
  water_source TEXT,
  terrain_type TEXT,
  registration_number TEXT,
  is_primary BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(farmer_id) REFERENCES farmer_profiles(farmer_id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_farmer_profiles_phone ON farmer_profiles(phone_number);
CREATE INDEX IF NOT EXISTS idx_farmer_profiles_email ON farmer_profiles(email);
CREATE INDEX IF NOT EXISTS idx_farmer_profiles_subcounty ON farmer_profiles(sub_county);
CREATE INDEX IF NOT EXISTS idx_farmer_profiles_active ON farmer_profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_farmer_activity_logs_farmer ON farmer_activity_logs(farmer_id);
```

## Recommended Workflow

### For Development
1. Delete database (`rm fahamu_shamba.db`)
2. Uncomment farmer profile code
3. Start fresh with new system
4. Test all farmer profile features

### For Production
1. **Backup your database first!** `cp fahamu_shamba.db fahamu_shamba.db.backup`
2. Decide which approach:
   - **Option A**: Start fresh (cleanest)
   - **Option B**: Keep existing system (safer)
   - **Option C**: Manual migration (complex)

### For Testing
Use the farmer-profile dashboard at:
```
http://localhost:5000/farmer-profile-dashboard
```

## Troubleshooting

### Server Won't Start
```bash
# Solution 1: Uncomment code in server.js
# Solution 2: Delete database and start fresh
rm backend/fahamu_shamba.db
npm run dev
```

### Dashboard Returns 404
```bash
# Make sure farmer-profile-dashboard.html exists:
ls backend/public/farmer-profile-dashboard.html

# Make sure routes are uncommented in server.js
```

### Database Error
```bash
# Check current database schema:
sqlite3 backend/fahamu_shamba.db ".schema"

# If conflicts exist, backup and delete:
cp backend/fahamu_shamba.db backend/fahamu_shamba.db.backup
rm backend/fahamu_shamba.db
npm run dev
```

## Code Changes Summary

### server.js Changes Made

**Added imports:**
```javascript
import farmerProfileRoutes from './farmer-profile-routes.js';
import * as farmerProfileDB from './farmer-profile-dashboard.js';
```

**Status:** ✅ Done

**Database initialization:**
```javascript
// Currently COMMENTED - uncomment to enable
// farmerProfileDB.initializeEnhancedFarmerDatabase(db);
```

**Route registration:**
```javascript
// Currently COMMENTED - uncomment to enable
// app.use('/api', (req, res, next) => {
//   req.dbAsync = dbAsync;
//   next();
// }, farmerProfileRoutes);
```

**Dashboard route:**
```javascript
app.get('/farmer-profile-dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'farmer-profile-dashboard.html'));
});
```

**Status:** ✅ Done

## Quick Fix Instructions

To get the system working immediately:

```bash
# 1. Delete database
cd backend
rm fahamu_shamba.db

# 2. Uncomment in server.js (lines ~415 and ~2437)
# Edit server.js and remove:
# - The // comments on farmerProfileDB.initializeEnhancedFarmerDatabase(db);
# - The // comments on app.use('/api', ..., farmerProfileRoutes);

# 3. Start server
npm run dev

# 4. Access dashboard
# Open browser to: http://localhost:5000/farmer-profile-dashboard
```

## Files Involved

| File | Change | Status |
|------|--------|--------|
| server.js | Added imports, routes, initialization (commented) | ✅ |
| farmer-profile-dashboard.js | New file | ✅ |
| farmer-profile-routes.js | New file | ✅ |
| farmer-profile-dashboard.html | New file | ✅ |

## Next Steps

1. **Immediate**: Server runs as-is (with existing system)
2. **To Enable Farmer Profile**: Follow "Option 1" above
3. **Questions**: Refer to FARMER_PROFILE_QUICKSTART.md

## Summary

- ✅ Module is **fully created and integrated**
- ⚠️ Currently **commented out** to avoid conflicts
- 🚀 **Easy to enable** by uncommenting 2 sections in server.js
- 💾 **Requires fresh database** (or manual migration)

Choose your approach and follow the steps above!
