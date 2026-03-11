# Passport Photo Implementation Guide

## Overview
Farmers can now upload passport photos during registration and in profile edits. These photos appear as thumbnails in the admin dashboard and full-size in detailed farmer profiles.

## What Changed

### 1. Database Schema Updates
**File:** `backend/farmer-profile-dashboard.js` (Lines 36-39)

Added three new columns to `farmer_profiles` table:
```sql
passport_photo_url TEXT              -- Base64 encoded photo as data URL
passport_photo_mime_type TEXT        -- Photo MIME type (e.g., image/jpeg)
photo_uploaded_date DATETIME         -- Upload timestamp
```

### 2. Migration Script
**File:** `backend/migrate-add-photo-columns.js`

Automatically adds the photo columns to existing databases:
```bash
node migrate-add-photo-columns.js
```

### 3. Backend Updates

#### Routes (farmer-profile-routes.js)
- **POST /api/farmer-profile/register** (Lines 16-107)
  - Accepts optional `passportPhotoUrl` and `passportPhotoMimeType` in JSON body
  - Passes photo data to registration function

#### Database Functions (farmer-profile-dashboard.js)
- **registerFarmerProfile()** (Lines 147-234)
  - Stores passport photo URL and MIME type
  - Records `photo_uploaded_date` automatically
  - Returns `passportPhotoUrl` in response

### 4. Frontend Updates

#### Registration Form
**File:** `backend/public/farmer-profile-dashboard.html`

**Photo Upload Section (Lines 1132-1163)**
- Drag-and-drop support
- File type validation (JPG, PNG, GIF)
- File size validation (5MB max)
- Live preview while uploading

**Registration Handler (Lines 1532-1638)**
- Reads photo file as base64 data URL using FileReader API
- Sends JSON request with base64 photo data
- Displays success message with farmer ID
- Refreshes farmer list on success

#### Farmer List Display (Lines 1680-1715)
- Added "Photo" column as first column
- Shows 40×50px thumbnail of passport photo
- Placeholder emoji (📷) if no photo uploaded
- Actual image with rounded corners if photo exists

#### Farmer Detail Modal (Lines 1759-1768)
- Displays full-size passport photo
- Shows photo upload date
- Photo section only appears if photo exists

#### Edit Profile Modal (Lines 1311)
- Ward dropdown now required (matching registration)
- Same dynamic ward selection based on sub-county

## Data Format

### Photo Data URL Format
Photos are stored as base64-encoded data URLs:
```
data:image/jpeg;base64,/9j/4AAQSkZJRgABA...
```

This allows:
- Direct display in HTML without file server
- Searchable in database
- Works with all modern browsers
- No separate file system needed

## Usage Flow

### Registration with Photo
1. User fills registration form
2. Selects sub-county → ward dropdown auto-populates
3. Uploads passport photo (drag-drop or click)
4. Preview shows in real-time
5. Submits form
6. Backend receives base64 photo URL
7. Photo stored in database
8. Farmer listed with thumbnail

### Viewing Farmer Profile
1. Click "View" button on farmer in list
2. Detail modal opens
3. Full-size passport photo displayed
4. Photo upload date shown
5. Can click "Edit Profile" to update details

### Editing Profile
1. Click "Edit Profile" button
2. All fields pre-fill from database
3. Can update any field
4. Changes saved to database

## File Size Limits

- **Frontend validation:** 5MB max
- **Backend body size:** 50MB limit (via body-parser)
- **Recommended photo size:** ~200×250 pixels (passport ID format)

## Image Formats Supported

- JPEG (.jpg, .jpeg)
- PNG (.png)
- GIF (.gif)

## Database Size Considerations

Base64 encoding increases file size by ~33%. Example:
- Original photo: 100KB
- Base64 encoded: ~133KB

For 1000 farmers with photos: ~130MB storage.

## Troubleshooting

### Photos not displaying
1. Check browser console for CORS errors
2. Verify base64 data starts with `data:image/`
3. Check if `passport_photo_url` field has data in database

### Upload fails silently
1. Check network tab in browser DevTools
2. Verify file size < 5MB
3. Check backend logs: `node server.js` output

### Ward dropdown not populating
1. Ensure sub-county is selected first
2. Check browser console for JavaScript errors
3. Verify `siayaWardsData` object in script section

## API Response Examples

### Registration Success (with photo)
```json
{
  "success": true,
  "message": "Farmer profile registered successfully",
  "data": {
    "farmerId": "FS001234567890",
    "phoneNumber": "+254712345678",
    "firstName": "John",
    "lastName": "Doe",
    "profileCompletion": 85,
    "passportPhotoUrl": "data:image/jpeg;base64,..."
  }
}
```

### Get Farmer Profile Response
```json
{
  "success": true,
  "data": {
    "farmer_id": "FS001234567890",
    "first_name": "John",
    "last_name": "Doe",
    "passport_photo_url": "data:image/jpeg;base64,...",
    "passport_photo_mime_type": "image/jpeg",
    "photo_uploaded_date": "2025-12-05T10:30:00.000Z",
    ...
  }
}
```

## Testing Checklist

- [ ] Register farmer WITH passport photo
- [ ] Verify photo appears in farmer list thumbnail
- [ ] Verify photo appears in farmer detail view
- [ ] Register farmer WITHOUT photo
- [ ] Verify placeholder emoji appears instead
- [ ] Edit farmer profile
- [ ] Verify photo still displays after edit
- [ ] Try uploading wrong file type
- [ ] Try uploading file > 5MB
- [ ] Ward dropdown updates based on sub-county

## Future Enhancements

1. **Photo cropping tool** - Allow users to crop before upload
2. **Multiple photos** - Store multiple farm/produce photos
3. **Photo verification** - Admin approval workflow
4. **Compression** - Auto-compress before storage
5. **Cloud storage** - Move from base64 to S3/Google Cloud
6. **Thumbnail caching** - Pre-generate optimized thumbnails

## Files Modified

- `backend/farmer-profile-dashboard.js` - Schema + registration function
- `backend/farmer-profile-routes.js` - Registration route
- `backend/public/farmer-profile-dashboard.html` - UI + JavaScript
- `backend/migrate-add-photo-columns.js` - Migration script (NEW)

## Setup Instructions

1. **Run migration** (if updating existing database):
   ```bash
   cd backend
   node migrate-add-photo-columns.js
   ```

2. **Restart server**:
   ```bash
   npm start
   # or
   node server.js
   ```

3. **Test the feature**:
   - Open http://localhost:5000/farmer-profile-dashboard
   - Register a new farmer with a photo
   - View the farmer in the list to see thumbnail
   - Click "View" to see full details

## Notes

- Photos are stored as base64 in SQLite database
- Each photo increases database file size (use for ~1000s of farmers)
- For larger deployments, consider using dedicated photo storage service
- Base64 approach is browser-friendly and requires no file server setup
