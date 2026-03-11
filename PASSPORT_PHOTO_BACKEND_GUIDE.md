# Passport Photo Feature - Backend Implementation Guide

## Overview
This guide covers the backend changes needed to support passport photo uploads in the farmer profile registration system.

## Database Schema Updates

### Add Photo Columns to farmer_profiles Table

```sql
-- Add passport photo columns
ALTER TABLE farmer_profiles ADD COLUMN (
    passport_photo_url VARCHAR(500),
    passport_photo_filename VARCHAR(255),
    photo_uploaded_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    photo_file_size INT,
    photo_mime_type VARCHAR(50)
);

-- Optional: Add photo storage metadata
ALTER TABLE farmer_profiles ADD COLUMN (
    photo_storage_type ENUM('local', 's3', 'gcs', 'cloudinary') DEFAULT 'local',
    photo_storage_bucket VARCHAR(255),
    photo_storage_path VARCHAR(500)
);
```

### Create Photo Upload Audit Table (Optional)

```sql
CREATE TABLE photo_uploads (
    id INT PRIMARY KEY AUTO_INCREMENT,
    farmer_id VARCHAR(50) NOT NULL,
    original_filename VARCHAR(255),
    storage_filename VARCHAR(255),
    file_size INT,
    mime_type VARCHAR(50),
    ip_address VARCHAR(45),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    deleted_reason VARCHAR(500),
    FOREIGN KEY (farmer_id) REFERENCES farmer_profiles(farmer_id),
    INDEX idx_farmer_id (farmer_id),
    INDEX idx_uploaded_at (uploaded_at)
);
```

## API Endpoint Updates

### Register Farmer Endpoint
**Route:** `POST /api/farmer-profile/register`

**Current:** Expects JSON
**Updated:** Expects multipart/form-data

### Implementation Steps

#### 1. Update Middleware Configuration

```javascript
// Express configuration for multipart file uploads
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, '../../uploads/farmer-photos');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Generate unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const filename = `passport-${uniqueSuffix}${ext}`;
        cb(null, filename);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    },
    fileFilter: (req, file, cb) => {
        // Accept only image files
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed (JPG, PNG, GIF)'));
        }
    }
});

// Export for use in routes
module.exports = { upload };
```

#### 2. Update Route Handler

```javascript
// In your farmer profile routes file
const express = require('express');
const router = express.Router();
const { upload } = require('../middleware/upload');
const FarmerProfile = require('../models/FarmerProfile');

// Register farmer with photo
router.post('/register', upload.single('passportPhoto'), async (req, res) => {
    try {
        // Validate required fields
        const requiredFields = ['phoneNumber', 'firstName', 'lastName', 'farmSize', 'subCounty'];
        for (const field of requiredFields) {
            if (!req.body[field]) {
                return res.status(400).json({
                    success: false,
                    message: `Missing required field: ${field}`
                });
            }
        }

        // Generate farmer ID
        const farmerId = `FRM${Date.now()}`;

        // Prepare farmer data
        const farmerData = {
            farmer_id: farmerId,
            phone_number: req.body.phoneNumber,
            first_name: req.body.firstName,
            last_name: req.body.lastName,
            email: req.body.email || null,
            date_of_birth: req.body.dateOfBirth || null,
            gender: req.body.gender || null,
            id_number: req.body.idNumber || null,
            sub_county: req.body.subCounty,
            ward: req.body.ward || null,
            soil_type: req.body.soilType || null,
            farm_size: parseFloat(req.body.farmSize),
            farm_size_unit: 'acres',
            water_source: req.body.waterSource || null,
            crops_grown: req.body.cropsGrown || null,
            livestock_kept: req.body.livestockKept || null,
            annual_income: parseFloat(req.body.annualIncome) || 0,
            budget: parseFloat(req.body.budget) || 0,
            preferred_language: req.body.preferredLanguage || 'english',
            contact_method: req.body.contactMethod || 'sms',
            profile_completion_percentage: calculateCompletion(req.body),
            profile_verified: false,
            created_at: new Date()
        };

        // Handle passport photo if uploaded
        if (req.file) {
            farmerData.passport_photo_filename = req.file.filename;
            farmerData.passport_photo_url = `/uploads/farmer-photos/${req.file.filename}`;
            farmerData.photo_file_size = req.file.size;
            farmerData.photo_mime_type = req.file.mimetype;
            farmerData.photo_uploaded_date = new Date();
            farmerData.photo_storage_type = 'local';
        }

        // Save to database
        const result = await FarmerProfile.create(farmerData);

        // Log to audit table if using one
        if (req.file) {
            await logPhotoUpload(farmerId, req.file, req.ip);
        }

        res.status(201).json({
            success: true,
            message: 'Farmer registered successfully',
            data: {
                farmer_id: farmerId,
                first_name: farmerData.first_name,
                last_name: farmerData.last_name,
                phone_number: farmerData.phone_number,
                passport_photo_url: farmerData.passport_photo_url,
                photo_uploaded_date: farmerData.photo_uploaded_date
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        
        // Clean up uploaded file if error occurs
        if (req.file) {
            fs.unlinkSync(req.file.path);
        }

        res.status(500).json({
            success: false,
            message: error.message || 'Registration failed'
        });
    }
});

module.exports = router;
```

#### 3. Update Farmer Profile Retrieval

```javascript
// Get farmer profile with photo
router.get('/:farmerId', async (req, res) => {
    try {
        const farmer = await FarmerProfile.findById(req.params.farmerId);

        if (!farmer) {
            return res.status(404).json({
                success: false,
                message: 'Farmer not found'
            });
        }

        // Return farmer data with photo URL
        res.json({
            success: true,
            data: {
                farmer_id: farmer.farmer_id,
                first_name: farmer.first_name,
                last_name: farmer.last_name,
                email: farmer.email,
                phone_number: farmer.phone_number,
                date_of_birth: farmer.date_of_birth,
                gender: farmer.gender,
                id_number: farmer.id_number,
                sub_county: farmer.sub_county,
                ward: farmer.ward,
                soil_type: farmer.soil_type,
                farm_size: farmer.farm_size,
                farm_size_unit: farmer.farm_size_unit,
                water_source: farmer.water_source,
                budget: farmer.budget,
                profile_verified: farmer.profile_verified,
                profile_completion_percentage: farmer.profile_completion_percentage,
                passport_photo_url: farmer.passport_photo_url,
                photo_uploaded_date: farmer.photo_uploaded_date,
                created_at: farmer.created_at,
                recentActivity: farmer.recentActivity || []
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error retrieving farmer profile'
        });
    }
});

module.exports = router;
```

## Helper Functions

### Calculate Profile Completion

```javascript
function calculateCompletion(data) {
    const fields = [
        'phoneNumber', 'firstName', 'lastName', 'farmSize', 'subCounty',
        'email', 'dateOfBirth', 'gender', 'idNumber', 'ward',
        'soilType', 'waterSource', 'cropsGrown', 'livestockKept'
    ];

    let completed = 0;
    for (const field of fields) {
        if (data[field]) completed++;
    }

    // Bonus for photo upload
    if (data.passportPhoto) completed += 0.5;

    const percentage = Math.round((completed / fields.length) * 100);
    return Math.min(percentage, 100);
}

module.exports = calculateCompletion;
```

### Log Photo Upload

```javascript
async function logPhotoUpload(farmerId, file, ipAddress) {
    const photoLog = {
        farmer_id: farmerId,
        original_filename: file.originalname,
        storage_filename: file.filename,
        file_size: file.size,
        mime_type: file.mimetype,
        ip_address: ipAddress,
        uploaded_at: new Date()
    };

    // Insert into photo_uploads table
    await db.query('INSERT INTO photo_uploads SET ?', photoLog);
}

module.exports = logPhotoUpload;
```

## Static File Serving

### Configure Express to Serve Photos

```javascript
// In main app.js
const express = require('express');
const path = require('path');

const app = express();

// Serve uploaded files as static
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Alternative: Serve with cache headers
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
    maxAge: '1d',
    etag: false
}));

module.exports = app;
```

## Error Handling

### File Upload Error Responses

```javascript
// In your error handling middleware
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'FILE_TOO_LARGE') {
            return res.status(400).json({
                success: false,
                message: 'File size exceeds 5MB limit'
            });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                success: false,
                message: 'Only one file can be uploaded'
            });
        }
    }

    if (err.message && err.message.includes('Only image files')) {
        return res.status(400).json({
            success: false,
            message: err.message
        });
    }

    next(err);
});
```

## File Cleanup

### Delete Photo When Farmer is Deleted

```javascript
router.delete('/:farmerId', async (req, res) => {
    try {
        const farmer = await FarmerProfile.findById(req.params.farmerId);

        if (!farmer) {
            return res.status(404).json({
                success: false,
                message: 'Farmer not found'
            });
        }

        // Delete photo file if exists
        if (farmer.passport_photo_filename) {
            const filePath = path.join(__dirname, '../../uploads/farmer-photos', farmer.passport_photo_filename);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        // Delete farmer from database
        await FarmerProfile.delete(req.params.farmerId);

        res.json({
            success: true,
            message: 'Farmer deleted successfully'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting farmer'
        });
    }
});
```

## Testing

### cURL Example

```bash
# Test photo upload
curl -X POST \
  -F "phoneNumber=254712345678" \
  -F "firstName=John" \
  -F "lastName=Doe" \
  -F "farmSize=2.5" \
  -F "subCounty=Bondo" \
  -F "passportPhoto=@/path/to/photo.jpg" \
  http://localhost:5000/api/farmer-profile/register
```

### Node.js Test Example

```javascript
const FormData = require('form-data');
const fs = require('fs');
const axios = require('axios');

async function testPhotoUpload() {
    const form = new FormData();
    form.append('phoneNumber', '254712345678');
    form.append('firstName', 'John');
    form.append('lastName', 'Doe');
    form.append('farmSize', '2.5');
    form.append('subCounty', 'Bondo');
    form.append('passportPhoto', fs.createReadStream('./test-photo.jpg'));

    try {
        const response = await axios.post(
            'http://localhost:5000/api/farmer-profile/register',
            form,
            {
                headers: form.getHeaders()
            }
        );
        console.log('Success:', response.data);
    } catch (error) {
        console.error('Error:', error.response.data);
    }
}

testPhotoUpload();
```

## Dependencies to Install

```bash
npm install multer
npm install uuid  # For generating unique filenames
```

## Environment Variables

```env
# .env
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5242880  # 5MB in bytes
ALLOWED_IMAGE_TYPES=image/jpeg,image/png,image/gif
PHOTO_STORAGE_TYPE=local  # or 's3', 'gcs', 'cloudinary'
```

## Cloud Storage Integration (Optional)

### AWS S3 Example

```javascript
const AWS = require('aws-sdk');

const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

async function uploadToS3(file, farmerId) {
    const params = {
        Bucket: process.env.AWS_S3_BUCKET,
        Key: `farmer-photos/${farmerId}-${Date.now()}.jpg`,
        Body: fs.readFileSync(file.path),
        ContentType: file.mimetype,
        ACL: 'public-read'
    };

    const result = await s3.upload(params).promise();
    
    // Delete local file after upload
    fs.unlinkSync(file.path);
    
    return result.Location; // S3 URL
}
```

## Checklist for Implementation

- [ ] Update database schema
- [ ] Create photo uploads table
- [ ] Install multer dependency
- [ ] Configure file upload middleware
- [ ] Update registration endpoint
- [ ] Update farmer retrieval endpoint
- [ ] Configure static file serving
- [ ] Implement error handling
- [ ] Add file cleanup logic
- [ ] Test with sample files
- [ ] Document file storage location
- [ ] Set up backup strategy
- [ ] Configure permissions (644 for files)
- [ ] Add virus scanning (optional)
- [ ] Set up monitoring/logging

---

**Status**: 📋 Implementation Guide Complete
**Last Updated**: 2025-01-20
**Version**: 1.0
