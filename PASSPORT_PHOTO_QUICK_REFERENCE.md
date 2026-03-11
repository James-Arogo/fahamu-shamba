# Passport Photo Feature - Quick Reference

## Feature Summary
Farmers can upload passport photos during registration. Photos are displayed in farmer profile details in the admin dashboard.

## Frontend Files Modified
- `/backend/public/farmer-profile-dashboard.html`

## Changes Made

### 1. CSS Styles Added
```css
.photo-upload-section      /* Container for photo upload */
.photo-preview             /* Photo preview box (120x150px) */
.photo-upload-btn          /* Upload button styling */
.farmer-avatar             /* Photo display in profile (150x150px) */
.profile-photo-section     /* Photo section in profile details */
```

### 2. HTML Added
```html
<!-- In registration form (after language/contact fields) -->
<div class="photo-upload-section">
    <h3>📸 Passport Photo</h3>
    <div class="photo-preview-container">
        <div class="photo-preview" id="photoPreview">
            <!-- Photo preview displays here -->
        </div>
        <button onclick="document.getElementById('photoInput').click()">
            Choose Photo
        </button>
        <input type="file" id="photoInput" name="passportPhoto" 
               accept="image/*" onchange="previewPhoto(event)">
    </div>
</div>
```

### 3. JavaScript Functions

#### previewPhoto(event)
- **Purpose:** Display photo preview before upload
- **Triggered:** When user selects a file
- **Action:** Updates preview box with image

```javascript
function previewPhoto(event) {
    const file = event.target.files[0];
    // Displays image in preview box
}
```

#### handleRegisterFarmer(event) [UPDATED]
- **Changed from:** JSON body to FormData
- **Added validation:** File type, file size checks
- **Supports:** Photo upload with form

```javascript
// Before: JSON
body: JSON.stringify(data)

// After: FormData (supports files)
body: formData
```

#### viewFarmerDetails(farmerId) [UPDATED]
- **Added:** Photo display in profile modal
- **Shows:** Upload date and photo

```html
${farmer.passport_photo_url ? `
<div class="profile-photo-section">
    <img src="${farmer.passport_photo_url}" alt="Passport Photo">
    <!-- Photo details -->
</div>
` : ''}
```

## File Upload Flow

```
User clicks "Choose Photo"
    ↓
File input opens → User selects image
    ↓
previewPhoto() triggers
    ↓
Image preview displays (120x150px)
    ↓
User fills rest of form
    ↓
User clicks "Register Farmer"
    ↓
handleRegisterFarmer() validates:
    - Required fields
    - File type (JPG, PNG, GIF)
    - File size (max 5MB)
    ↓
FormData sent to /api/farmer-profile/register
    ↓
Backend saves photo and farmer data
    ↓
Success message with Farmer ID
    ↓
Form resets, preview resets
```

## Validation Rules

### Client-side (Frontend)
| Rule | Details |
|------|---------|
| File Type | JPG, PNG, GIF only |
| File Size | Max 5MB |
| Preview | Real-time before submit |

### Server-side (Backend) - TODO
| Rule | Details |
|------|---------|
| File Type | Validate MIME type |
| File Size | Enforce 5MB limit |
| Storage | Save to disk or cloud |
| Access | Serve via HTTP |

## Database Changes Needed

```sql
ALTER TABLE farmer_profiles ADD COLUMN (
    passport_photo_url VARCHAR(500),
    passport_photo_filename VARCHAR(255),
    photo_uploaded_date TIMESTAMP,
    photo_file_size INT,
    photo_mime_type VARCHAR(50)
);
```

## API Changes Needed

### Register Endpoint
- **Route:** `POST /api/farmer-profile/register`
- **Current:** Accepts JSON
- **Update:** Accept multipart/form-data
- **Field:** `passportPhoto` (file input)

### Retrieve Endpoint
- **Route:** `GET /api/farmer-profile/{farmerId}`
- **Update:** Return `passport_photo_url` and `photo_uploaded_date`

## Backend Implementation Steps

1. **Install multer**
   ```bash
   npm install multer
   ```

2. **Configure file upload**
   - Set upload directory
   - Configure file size limits
   - Set file type filters

3. **Update registration endpoint**
   - Accept multipart/form-data
   - Handle file upload
   - Save to file system or cloud
   - Store URL in database

4. **Update retrieval endpoint**
   - Return photo URL
   - Return upload date

5. **Serve static files**
   ```javascript
   app.use('/uploads', express.static(__dirname + '/uploads'));
   ```

## File Structure

```
project-root/
├── backend/
│   ├── public/
│   │   └── farmer-profile-dashboard.html [MODIFIED]
│   ├── uploads/                          [NEW]
│   │   └── farmer-photos/                [NEW]
│   │       └── passport-*.jpg
│   └── routes/
│       └── farmer-profile.js             [TO UPDATE]
└── ...
```

## Testing Checklist

- [ ] Select photo → preview displays
- [ ] Invalid format → error message
- [ ] File too large (>5MB) → error message
- [ ] Valid photo → uploads successfully
- [ ] Farmer details → photo displays
- [ ] Different browsers → works correctly
- [ ] Mobile device → responsive layout
- [ ] No photo → shows placeholder

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Preview not showing | Check file is valid JPG/PNG/GIF |
| Upload fails | Check file size < 5MB, network connection |
| Photo not in profile | Backend needs photo URL in response |
| Mobile layout broken | Check responsive CSS media queries |

## API Request Example

```javascript
// Frontend sends FormData
const formData = new FormData();
formData.append('phoneNumber', '254712345678');
formData.append('firstName', 'John');
formData.append('lastName', 'Doe');
formData.append('passportPhoto', fileInput.files[0]);
// ... other fields

fetch('/api/farmer-profile/register', {
    method: 'POST',
    body: formData  // No Content-Type header needed
});
```

## API Response Example

```json
{
    "success": true,
    "data": {
        "farmer_id": "FRM1234567890",
        "first_name": "John",
        "last_name": "Doe",
        "passport_photo_url": "/uploads/farmer-photos/passport-1234567890.jpg",
        "photo_uploaded_date": "2025-01-20T10:30:00Z"
    }
}
```

## Features Implemented ✅

- [x] Photo upload UI in registration form
- [x] Real-time photo preview
- [x] Client-side validation (type, size)
- [x] Display photo in farmer details modal
- [x] Responsive design (mobile, tablet, desktop)
- [x] Error messages
- [x] Success confirmation

## Features To Implement 📋

- [ ] Backend file upload handler
- [ ] Database schema updates
- [ ] File storage configuration
- [ ] Photo URL in API responses
- [ ] File cleanup on deletion
- [ ] Photo size optimization
- [ ] Thumbnail generation
- [ ] CDN integration (optional)

## Key Components

### Registration Form
- Location: "Register Farmer" tab
- Section: Below "Contact Method" field
- Size: Full width, integrated seamlessly

### Profile Details Modal
- Location: Farmer list → View button
- Section: Top of modal (after header)
- Display: Photo with upload date

### Mobile Responsive
- Stacks vertically on < 768px
- Smaller preview on mobile
- Touch-friendly buttons

## Support & Documentation

📄 **Full Documentation:** `PASSPORT_PHOTO_FEATURE.md`
📋 **Backend Guide:** `PASSPORT_PHOTO_BACKEND_GUIDE.md`
💻 **Implementation:** `farmer-profile-dashboard.html`

## Summary

Frontend implementation is **100% complete**. Backend needs:
1. File upload handling (multer)
2. Database column updates
3. API endpoint modifications
4. Static file serving configuration

**Estimated Backend Time:** 2-3 hours

---
**Last Updated:** 2025-01-20
**Status:** ✅ Frontend Complete | 📋 Backend TODO
