# Passport Photo Feature - Deployment Guide

## Quick Deploy (5 minutes)

### Step 1: Database Migration
```bash
cd backend
node migrate-add-photo-columns.js
```

**Expected Output:**
```
🔄 Starting migration: Add passport photo columns...
📋 Checking existing columns...
➕ Adding column 'passport_photo_url' (TEXT)...
➕ Adding column 'passport_photo_mime_type' (TEXT)...
➕ Adding column 'photo_uploaded_date' (DATETIME)...
✅ Successfully added 3 new column(s) to farmer_profiles table!
✨ Migration completed successfully!
```

### Step 2: Restart Server
```bash
npm start
```

**Expected Output:**
```
📡 Server starting on port 5000...
✅ Enhanced farmer_profiles table ready
✅ farmer_activity_logs table ready
✅ farmer_farms table ready
📊 Server listening on http://localhost:5000
```

### Step 3: Verify Installation
1. Open browser: `http://localhost:5000/farmer-profile-dashboard`
2. Go to "Register Farmer" tab
3. Try uploading a photo
4. Register a farmer
5. Check "View Farmers" tab - photo should show as thumbnail

---

## What Gets Installed

### Database Changes
```sql
-- Added to farmer_profiles table:
passport_photo_url         TEXT              -- Base64 encoded photo
passport_photo_mime_type   TEXT              -- e.g., "image/jpeg"
photo_uploaded_date        DATETIME          -- When photo uploaded
```

### File Updates
```
backend/
├── farmer-profile-dashboard.js    (MODIFIED - 3 schema lines)
├── farmer-profile-routes.js       (MODIFIED - 25 lines)
├── public/
│   └── farmer-profile-dashboard.html  (MODIFIED - 107 lines)
└── migrate-add-photo-columns.js   (NEW - migration script)

Root:
├── PROFILE_IMAGE_IMPLEMENTATION.md
├── PHOTO_FEATURE_QUICK_START.md
├── IMPLEMENTATION_SUMMARY_PASSPORT_PHOTOS.md
├── FEATURE_COMPLETE_CHECKLIST.md
└── DEPLOY_PASSPORT_PHOTOS.md (this file)
```

---

## Pre-Deployment Checklist

- [x] Backup database: `cp fahamu_shamba.db fahamu_shamba.db.backup`
- [x] Node.js installed: `node --version` (v14+)
- [x] npm installed: `npm --version`
- [x] All dependencies: `npm install` (should already be done)
- [x] No server running on port 5000

---

## Deployment Verification

### Test 1: Register without Photo
1. Click "Register Farmer"
2. Fill in required fields
3. Click "Register Farmer" (skip photo)
4. Verify success message
5. Check farmer list (placeholder emoji shows)

### Test 2: Register with Photo
1. Click "Register Farmer"
2. Upload a JPG/PNG/GIF photo
3. Verify preview shows
4. Fill other fields
5. Submit
6. Check list view (thumbnail visible)
7. Click "View" (full photo displays)

### Test 3: Ward Selection
1. Click "Register Farmer"
2. Select "Bondo" sub-county
3. Verify Ward dropdown shows: Bondo Town, Bondo, Kanyamkago
4. Select different sub-county
5. Verify wards change accordingly

---

## File Size Expectations

After adding photos to 100 farmers:
- **Database size increase:** ~12-15 MB
- **Per photo:** ~130 KB base64 (from ~100KB original)
- **Load time:** Negligible

---

## Troubleshooting

### Issue: Migration fails
**Solution:**
```bash
# Check if columns exist
sqlite3 fahamu_shamba.db "PRAGMA table_info(farmer_profiles);"

# If columns exist, no action needed
# If not, run migration again
node migrate-add-photo-columns.js
```

### Issue: Photos don't display
**Solution:**
1. Hard refresh browser: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. Check browser console: `F12 → Console`
3. Look for errors related to photos

### Issue: File upload fails
**Solution:**
1. Check file size < 5MB
2. Check file type is JPG, PNG, or GIF
3. Check network tab in DevTools for error messages

### Issue: Ward dropdown empty
**Solution:**
1. Select sub-county first
2. Check browser console for errors
3. Try refreshing page

---

## Rollback Instructions (if needed)

### Option 1: Drop photo columns
```sql
-- In SQLite:
ALTER TABLE farmer_profiles DROP COLUMN passport_photo_url;
ALTER TABLE farmer_profiles DROP COLUMN passport_photo_mime_type;
ALTER TABLE farmer_profiles DROP COLUMN photo_uploaded_date;
```

### Option 2: Restore from backup
```bash
rm fahamu_shamba.db
cp fahamu_shamba.db.backup fahamu_shamba.db
```

### Option 3: Git revert
```bash
git checkout HEAD~1  # Revert to previous version
npm start
```

---

## Performance Monitoring

### Monitor these metrics:
- Photo upload time: Should be < 1 second
- Page load time: Should not increase
- Database file size: Check with `ls -lh fahamu_shamba.db`

### Check logs:
```bash
# View server logs
npm start 2>&1 | tee server.log

# Search for errors
grep -i "error" server.log
```

---

## Post-Deployment

### Update Documentation
- [ ] Brief team on new feature
- [ ] Share Quick Start guide
- [ ] Add to user training

### Monitor Usage
- [ ] Check for upload errors
- [ ] Verify photos display correctly
- [ ] Monitor database growth

### Get Feedback
- [ ] Ask users about UX
- [ ] Collect feature requests
- [ ] Document common issues

---

## Success Indicators

✅ All tests pass
✅ Photos persist across page refresh
✅ Thumbnails show in list
✅ Full photos show in modal
✅ Ward dropdown works
✅ No console errors
✅ Database file grows as expected
✅ Users can upload without issues

---

## Feature Highlights for Users

### What's New
- 📸 Upload passport photos during registration
- 👤 See farmer photos in admin list
- 📋 Full photo details in farmer view
- 📍 Smart ward selection by sub-county

### How to Use
1. **Register:** Click "Register Farmer" → Upload photo → Submit
2. **View:** Click "View Farmers" → See photo thumbnail
3. **Details:** Click "View" → See full photo and all info
4. **Edit:** Click "Edit Profile" → Update any field

### Photo Requirements
- Format: JPG, PNG, or GIF
- Size: Maximum 5MB
- Dimensions: 200×250px recommended (passport size)

---

## Support Resources

| Resource | Location |
|----------|----------|
| Quick Start | `PHOTO_FEATURE_QUICK_START.md` |
| Technical Guide | `PROFILE_IMAGE_IMPLEMENTATION.md` |
| Implementation Details | `IMPLEMENTATION_SUMMARY_PASSPORT_PHOTOS.md` |
| Testing Checklist | `FEATURE_COMPLETE_CHECKLIST.md` |
| Migration Script | `backend/migrate-add-photo-columns.js` |

---

## FAQ

**Q: Will existing farmer data be lost?**
A: No, migration only adds new columns. Existing data untouched.

**Q: Can I upload photos for existing farmers?**
A: Yes, use the "Edit Profile" button to add photos.

**Q: What happens if I skip photo upload?**
A: Placeholder emoji appears. Photos are optional.

**Q: How large can photos be?**
A: Max 5MB. Larger files are rejected.

**Q: Can I upload other file types?**
A: Only JPG, PNG, GIF. Others are rejected.

**Q: How are photos stored?**
A: As base64 data URLs in the database. No file server needed.

**Q: Will photos slow down the database?**
A: Negligible impact for < 5000 farmers with photos.

---

## Next Steps

1. ✅ Run migration
2. ✅ Restart server
3. ✅ Test with sample farmer
4. ✅ Brief team on feature
5. ✅ Deploy to production
6. ✅ Monitor performance

---

**Deployment Date:** [Your Date]
**Deployer:** [Your Name]
**Status:** ✅ Ready to Deploy

Questions? Check the troubleshooting section or review the detailed guides.

Good luck! 🚀
