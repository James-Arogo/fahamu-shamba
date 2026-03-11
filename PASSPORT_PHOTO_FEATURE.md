# Passport Photo Upload Feature - Farmer Profile Dashboard

## Overview
Farmers can now upload their passport photos during profile registration and view them in their profile details. This feature enhances farmer identification and verification processes within the Fahamu Shamba system.

## Features Implemented

### 1. Photo Upload UI in Registration Form
**Location:** Farmer Profile Dashboard - Register Farmer Tab

**Components:**
- Visual photo preview area (120x150px)
- "Choose Photo" button for file selection
- Supported formats information (JPG, PNG, GIF)
- File size limit information (5MB max)
- Recommended dimensions (200x250 pixels - passport size)

**Visual Feedback:**
- Default placeholder showing "📷 No photo"
- Real-time preview of selected photo
- File input hidden from view (triggered via button click)

### 2. Photo Validation
**Client-side validations:**
- File type: Only JPG, PNG, GIF accepted
- File size: Maximum 5MB
- Required field validation for registration
- Error messages for invalid files

**Validation Flow:**
```
User selects file 
  → previewPhoto() displays preview
  → handleRegisterFarmer() validates:
    - File type check
    - File size check (5MB limit)
    - Required field validation
  → Submit with FormData (multipart/form-data)
```

### 3. Photo Storage
**Backend Integration:**
- Photos sent as multipart/form-data
- Endpoint: `/api/farmer-profile/register`
- Method: POST with FormData
- Field name: `passportPhoto`

**Data Structure:**
```javascript
{
  // ... other farmer data
  passportPhoto: File object,
  phoneNumber: "254712345678",
  firstName: "John",
  lastName: "Doe",
  // ... other fields
}
```

### 4. Photo Display in Profile Details
**Location:** Farmer Detail Modal

**Display Features:**
- Full photo preview (150x150px with 3px border)
- Upload date information
- Professional styling with light background
- Responsive layout for mobile devices

**Photo Section HTML:**
```html
<div class="profile-photo-section">
  <img src="[passport_photo_url]" alt="Passport Photo" class="farmer-avatar">
  <div>
    <h3>📸 Passport Photo</h3>
    <p>Photo uploaded on [date]</p>
    <p>Passport identification photo for farmer verification purposes</p>
  </div>
</div>
```

## Frontend Changes

### CSS Styles Added
```css
/* Photo upload section styling */
.photo-upload-section {}
.photo-upload-section h3 {}
.photo-preview-container {}
.photo-preview {}
.photo-preview img {}
.photo-preview-placeholder {}
.photo-upload-btn {}
.photo-upload-btn:hover {}
.photo-info {}
.farmer-avatar {}
.profile-photo-section {}
```

### JavaScript Functions

#### 1. previewPhoto(event)
**Purpose:** Display photo preview before upload
```javascript
function previewPhoto(event) {
    const file = event.target.files[0];
    const preview = document.getElementById('photoPreview');
    
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            preview.innerHTML = `<img src="${e.target.result}" alt="Passport Photo">`;
        };
        reader.readAsDataURL(file);
    }
}
```

**Triggers:** On file input change
**Action:** Updates preview div with image

#### 2. handleRegisterFarmer(event)
**Updated to:**
- Use FormData instead of JSON for file support
- Validate photo file (type, size)
- Send multipart/form-data request
- Reset photo preview on success

**Validation Logic:**
```javascript
// Validate file size (5MB)
if (photoFile.size > 5 * 1024 * 1024) {
    showAlert('Photo file size must be less than 5MB');
    return;
}

// Validate file type
if (!['image/jpeg', 'image/png', 'image/gif'].includes(photoFile.type)) {
    showAlert('Only JPG, PNG, and GIF images are allowed');
    return;
}
```

#### 3. viewFarmerDetails(farmerId)
**Updated to:**
- Display passport photo if available
- Show upload date
- Responsive photo section layout

## HTML Structure

### Registration Form Photo Section
```html
<div class="photo-upload-section">
    <h3>📸 Passport Photo</h3>
    <div class="photo-preview-container">
        <div class="photo-preview" id="photoPreview">
            <div class="photo-preview-placeholder">
                <p>📷</p>
                <p>No photo</p>
            </div>
        </div>
        <div style="flex: 1;">
            <button type="button" class="photo-upload-btn" 
                    onclick="document.getElementById('photoInput').click()">
                Choose Photo
            </button>
            <input type="file" id="photoInput" name="passportPhoto" 
                   class="photo-upload-input" accept="image/*" 
                   onchange="previewPhoto(event)">
            <div class="photo-info">
                <p>✓ Supported formats: JPG, PNG, GIF</p>
                <p>✓ Max file size: 5MB</p>
                <p>✓ Recommended: 200x250 pixels (passport size)</p>
            </div>
        </div>
    </div>
</div>
```

## Backend Requirements

### API Endpoint Updates
**Endpoint:** `/api/farmer-profile/register`

**Request:**
- Method: POST
- Content-Type: multipart/form-data
- Body: FormData with photo file

**Required Database Fields:**
```sql
ALTER TABLE farmer_profiles ADD COLUMN (
    passport_photo_url VARCHAR(500),
    photo_uploaded_date TIMESTAMP
);
```

**Expected Response:**
```json
{
    "success": true,
    "data": {
        "farmer_id": "FRM001",
        "first_name": "John",
        "last_name": "Doe",
        "passport_photo_url": "/uploads/photos/john_doe_1234.jpg",
        "photo_uploaded_date": "2025-01-20T10:30:00Z"
    }
}
```

### Storage Options
1. **File System Storage**
   - Save to `/backend/uploads/farmer-photos/`
   - Return relative URL: `/uploads/farmer-photos/[filename]`

2. **Cloud Storage** (Recommended)
   - AWS S3
   - Google Cloud Storage
   - Cloudinary

3. **Database Storage** (BLOB)
   - For small deployments
   - Less efficient for large files

## Responsive Design

### Desktop (1200px+)
- Large photo preview (150x150px)
- Side-by-side layout
- Full file info display

### Tablet (768px - 1199px)
- Medium photo preview
- Adjusted spacing
- Responsive button sizing

### Mobile (< 768px)
- Smaller preview (100x120px)
- Stacked layout
- Touch-friendly buttons
- Adjusted font sizes

## Security Considerations

✅ **File Type Validation**
- Client-side: Accept only image MIME types
- Server-side: Validate MIME type and file signature

✅ **File Size Limits**
- 5MB maximum per image
- Prevents storage overflow

✅ **File Naming**
- Hash filenames to prevent directory traversal
- Example: `uuid_timestamp.jpg`

✅ **Access Control**
- Only registered farmers can upload
- Only admins can view all farmer photos
- Farmers can only see their own photo

✅ **Virus Scanning** (Optional)
- Scan uploaded files for malware
- Use services like ClamAV

## Usage Guide

### For Farmers (During Registration)

1. **Fill Registration Form**
   - Enter all required information
   - Complete personal details

2. **Upload Passport Photo**
   - Click "Choose Photo" button
   - Select photo from device
   - Preview appears instantly

3. **Verify Photo**
   - Check preview matches passport
   - Max file size: 5MB
   - Recommended: 200x250 pixels

4. **Submit Registration**
   - Click "Register Farmer" button
   - Photo uploads with registration
   - Confirmation message appears

### For Admins (Viewing Farmer Profile)

1. **Access Farmers Management**
   - Navigate to Admin Dashboard
   - Click "👥 Farmers" menu

2. **View Farmer Details**
   - Click "View" button on farmer row
   - Modal opens with full profile

3. **Check Passport Photo**
   - Photo displays in profile section
   - See upload date
   - Verify farmer identity

## Error Handling

| Error | Message | Solution |
|-------|---------|----------|
| No file selected | "Please select a photo" | Select an image file |
| File too large | "Photo file size must be less than 5MB" | Compress or resize photo |
| Invalid format | "Only JPG, PNG, and GIF images are allowed" | Use supported format |
| Missing required fields | "Please fill in all required fields" | Complete all fields |
| Upload failed | "Error: [error message]" | Check connection, retry |

## Performance Optimization

**Frontend:**
- FileReader API for instant preview
- No server request until form submission
- Lazy load photos in list views

**Backend Recommendations:**
- Image compression before storage
- CDN for photo delivery
- Caching headers for images
- Thumbnail generation (100x120px)

## Browser Compatibility

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome 90+ | ✅ Full | All features supported |
| Firefox 88+ | ✅ Full | All features supported |
| Safari 14+ | ✅ Full | All features supported |
| Edge 90+ | ✅ Full | All features supported |
| IE 11 | ❌ No | FileReader not supported |
| Mobile Safari | ✅ Good | Camera access available |
| Chrome Mobile | ✅ Good | Camera access available |

## Future Enhancements

1. **Photo Editing**
   - Crop/rotate functionality
   - Filters and adjustments
   - Brightness/contrast controls

2. **Photo Verification**
   - Face detection
   - Quality scoring
   - ID document validation

3. **Multiple Photos**
   - Store original + thumbnail
   - Before/after photos
   - Document scans (ID, land title)

4. **Advanced Features**
   - Blockchain storage
   - Digital signatures
   - IPFS integration

## Testing Checklist

### Unit Tests
- [ ] Photo preview function
- [ ] File validation logic
- [ ] Form submission with photo

### Integration Tests
- [ ] Upload photo via API
- [ ] Retrieve photo from profile
- [ ] Photo display in modal

### UI Tests
- [ ] Preview updates on file select
- [ ] Error messages display
- [ ] Success messages appear
- [ ] Mobile responsiveness

### Security Tests
- [ ] File type validation (server-side)
- [ ] File size enforcement
- [ ] Access control verification
- [ ] SQL injection prevention

## Files Modified

1. `/backend/public/farmer-profile-dashboard.html`
   - Added photo upload UI
   - Added CSS styles
   - Added JavaScript functions
   - Updated form handling

## Files to Create

1. Backend file upload handler
2. Photo storage configuration
3. API endpoint updates
4. Database migration

## Troubleshooting

### Photo not showing in preview
- Check file format (JPG, PNG, GIF only)
- Clear browser cache
- Try different browser

### Upload fails silently
- Check file size (max 5MB)
- Verify network connection
- Check browser console for errors

### Photo not appearing in profile
- Ensure backend stores and returns URL
- Check database fields exist
- Verify photo file exists on server

---

**Status**: ✅ Frontend Implementation Complete
**Last Updated**: 2025-01-20
**Version**: 1.0
