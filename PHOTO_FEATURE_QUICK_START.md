# Passport Photo Feature - Quick Start

## What Works Now

✅ Upload passport photos during farmer registration  
✅ Photos display as thumbnails in farmer list  
✅ Full-size photos in farmer detail view  
✅ Photos stored in database (base64 format)  
✅ Dynamic ward selection based on sub-county  
✅ Photo validation (type, size)  

## Getting Started

### 1. Migrate Database (if you have existing data)
```bash
cd backend
node migrate-add-photo-columns.js
```

### 2. Start Server
```bash
npm start
```

### 3. Register a Farmer with Photo
1. Go to: http://localhost:5000/farmer-profile-dashboard
2. Click "Register Farmer" tab
3. Fill in required fields
4. **Select Sub-County** → Ward dropdown auto-fills
5. **Upload Photo**:
   - Click the photo area OR
   - Drag-drop a photo
6. Click "Register Farmer"
7. Success! Photo is stored

### 4. View Farmer with Photo
1. Click "View Farmers" tab
2. See photo thumbnail (40×50px) in first column
3. Click "View" button to see full details
4. Full-size photo displays in modal

## File Requirements

- **Format:** JPG, PNG, GIF
- **Size:** Max 5MB
- **Dimensions:** Preferably 200×250px (passport size)

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Ward dropdown is empty | Select sub-county first |
| Photo won't upload | Check file size < 5MB, format is JPG/PNG/GIF |
| Photo not showing in list | Refresh page, check browser console |
| Database error | Run migration script |

## What's New in Files

| File | Change |
|------|--------|
| `farmer-profile-dashboard.js` | Added 3 photo columns to schema |
| `farmer-profile-routes.js` | Registration route accepts photo data |
| `farmer-profile-dashboard.html` | Photo UI + base64 conversion |
| `migrate-add-photo-columns.js` | NEW - Migration script |

## Database Columns Added

```sql
passport_photo_url TEXT              -- Base64 data URL
passport_photo_mime_type TEXT        -- Image MIME type
photo_uploaded_date DATETIME         -- When uploaded
```

## Photo Storage Format

Photos stored as base64 data URLs:
```
data:image/jpeg;base64,[base64-encoded-image-data]
```

No separate file server needed - embedded in database!

## API Changes

### Registration Request (with photo)
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "+254712345678",
  "subCounty": "Bondo",
  "ward": "Bondo Town",
  "farmSize": 2.5,
  "passportPhotoUrl": "data:image/jpeg;base64,/9j/4AAQ...",
  "passportPhotoMimeType": "image/jpeg"
}
```

### Registration Response
```json
{
  "success": true,
  "data": {
    "farmerId": "FS001234567890",
    "firstName": "John",
    "lastName": "Doe",
    "passportPhotoUrl": "data:image/jpeg;base64,..."
  }
}
```

## Performance Notes

- Photos stored as base64 in SQLite
- ~33% size increase due to encoding
- 1000 farmers with photos ≈ 130MB database
- Consider cloud storage for larger deployments

## Testing Checklist

- [ ] Ward dropdown updates on sub-county change
- [ ] Can upload photo via click
- [ ] Can upload photo via drag-drop
- [ ] Photo preview shows before submit
- [ ] Photo thumbnail appears in farmer list
- [ ] Full photo appears in detail view
- [ ] Can register without photo (placeholder shows)
- [ ] File validation works (rejects files > 5MB)
- [ ] File type validation works (only JPG/PNG/GIF)

## Next Steps

1. ✅ Migration complete
2. ✅ Register test farmer with photo
3. ✅ Verify photo displays correctly
4. ✅ Test with multiple farmers
5. Consider: Cloud storage integration?
6. Consider: Photo cropping tool?

## Support

Check logs for issues:
```bash
# Backend logs
tail -f backend/server.log

# Browser console
F12 → Console tab
```

Photos should work immediately after running the migration!
