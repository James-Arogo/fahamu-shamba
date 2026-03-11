# Farmer Profile Module - Quick Start Guide

## What's New?

A comprehensive **Farmer Profile Management Module** has been added to your Fahamu Shamba dashboard. This allows you to:

✅ **Register farmers** with complete profile information
✅ **Manage farmer profiles** including personal and farm details
✅ **Track profile completion** with percentage indicators
✅ **Verify profiles** for quality assurance
✅ **Search and filter** farmers by various criteria
✅ **View statistics** and analytics about your farmer base
✅ **Activity logging** for audit trails

## Files Added

### Backend
- `backend/farmer-profile-dashboard.js` - Core database operations and functions
- `backend/farmer-profile-routes.js` - Express API routes
- `backend/public/farmer-profile-dashboard.html` - Web interface

### Documentation
- `FARMER_PROFILE_INTEGRATION_GUIDE.md` - Complete technical integration guide
- `FARMER_PROFILE_QUICKSTART.md` - This file

## Installation

### Option 1: Automatic Integration (Recommended)

```bash
cd /home/james-arogo/Documents/fahamu-shamba
bash FARMER_PROFILE_SETUP.sh
```

The setup script will:
- Add necessary imports to `server.js`
- Register the farmer profile database tables
- Add API routes
- Create a backup of `server.js` before changes

### Option 2: Manual Integration

1. **Update imports in `backend/server.js`:**
   ```javascript
   import farmerProfileRoutes from './farmer-profile-routes.js';
   import * as farmerProfileDB from './farmer-profile-dashboard.js';
   ```

2. **Add database initialization in `initializeDatabase()` function:**
   ```javascript
   farmerProfileDB.initializeEnhancedFarmerDatabase(db);
   ```

3. **Register routes:**
   ```javascript
   app.use('/api', (req, res, next) => {
     req.dbAsync = dbAsync;
     next();
   }, farmerProfileRoutes);
   ```

4. **Add dashboard route:**
   ```javascript
   app.get('/farmer-profile-dashboard', (req, res) => {
       res.sendFile(path.join(__dirname, 'public', 'farmer-profile-dashboard.html'));
   });
   ```

## Verify Installation

1. **Restart your server:**
   ```bash
   cd backend
   node server.js
   ```

2. **Check for success messages:**
   ```
   ✅ Enhanced farmer_profiles table ready
   ✅ farmer_activity_logs table ready
   ✅ farmer_farms table ready
   ```

3. **Test the API:**
   ```bash
   curl http://localhost:5000/api/test
   ```

4. **Access the dashboard:**
   Open your browser and go to:
   ```
   http://localhost:5000/farmer-profile-dashboard
   ```

## Dashboard Features

### 1. Register Farmer Tab
Register a new farmer with:
- Basic information (name, phone, email)
- Personal details (DOB, gender, ID)
- Location (sub-county, ward)
- Farm information (size, soil type, water source)
- Agricultural details (crops, livestock)
- Economic information (income, budget)

### 2. View Farmers Tab
Browse all registered farmers with:
- Pagination (50 farmers per page)
- Filter by sub-county, soil type, verification status
- Profile completion percentage
- Quick access to full profiles
- View farmer activity history

### 3. Search Farmer Tab
Search farmers by:
- Name (first or last)
- Phone number
- Email address
- Farmer ID

### 4. Statistics Tab
View dashboard analytics:
- Total number of farmers
- Verification rate
- Profile completion average
- Distribution by sub-county
- Distribution by soil type
- Farm size statistics
- Budget statistics

## API Endpoints

### Register a Farmer
```bash
curl -X POST http://localhost:5000/api/farmer-profile/register \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "254712345678",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "subCounty": "Muranga South",
    "farmSize": 2.5
  }'
```

### Get Farmer Profile
```bash
curl http://localhost:5000/api/farmer-profile/FR-xxx-xxx
```

### Get Farmer by Phone
```bash
curl http://localhost:5000/api/farmer-profile/phone/254712345678
```

### List All Farmers
```bash
curl "http://localhost:5000/api/farmer-profile?limit=20&offset=0"
```

### Search Farmers
```bash
curl "http://localhost:5000/api/farmer-profile/search/John"
```

### Update Farmer Profile
```bash
curl -X PUT http://localhost:5000/api/farmer-profile/FR-xxx-xxx \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newemail@example.com",
    "farmSize": 3.0
  }'
```

### Get Statistics
```bash
curl http://localhost:5000/api/farmer-profile/statistics
```

## Required Fields for Registration

These fields are required when registering a farmer:

1. **Phone Number** - Unique identifier (e.g., 254712345678)
2. **First Name** - Farmer's first name
3. **Last Name** - Farmer's last name
4. **Sub-County** - Location (e.g., Muranga South)
5. **Farm Size** - In acres (e.g., 2.5)

All other fields are optional but help with profile completion.

## Profile Completion

The profile completion percentage is calculated as:

- **60% - Required fields:** First name, Last name, Email, Sub-county, Farm size
- **40% - Optional fields:** DOB, Gender, ID, Ward, Soil type, Water source, Crops, Livestock, Income, Budget

A farmer with all required fields will have 60% completion.
A farmer with all fields filled will have 100% completion.

## Activity Logging

All actions on farmer profiles are logged automatically:

- **PROFILE_CREATED** - When farmer registers
- **PROFILE_UPDATED** - When profile is modified
- **PROFILE_VERIFIED** - When admin verifies profile
- **PROFILE_DEACTIVATED** - When profile is disabled
- **PROFILE_REACTIVATED** - When profile is re-enabled

## Database Structures

### farmer_profiles Table
Main table storing farmer information with fields for personal, location, farm, and economic data.

### farmer_activity_logs Table
Audit log of all actions performed on farmer profiles.

### farmer_farms Table
Extended table for managing multiple farms per farmer (for future use).

## Troubleshooting

### Dashboard Not Loading
1. Verify server is running: `node backend/server.js`
2. Check port 5000 is accessible
3. Check browser console for errors
4. Verify HTML file exists: `backend/public/farmer-profile-dashboard.html`

### Registration Fails
1. Check all required fields are filled
2. Ensure phone number is unique
3. Check server logs for specific error
4. Verify email format if provided

### Profile Not Showing
1. Verify farmer ID is correct
2. Check database connectivity
3. Look for error messages in API response

### Statistics Not Loading
1. Ensure there are farmers in database
2. Check API endpoint: `/api/farmer-profile/statistics`
3. Verify database has data

## Next Steps

1. **Deploy Dashboard** - Make farmer profiles accessible to field staff
2. **Migrate Existing Farmers** - If you have existing farmer data, import it via the API
3. **Customize Fields** - Add organization-specific fields as needed
4. **Integrate SMS** - Connect with SMS system for farmer notifications
5. **Add Photo Upload** - Allow farmers to upload profile pictures
6. **Bulk Operations** - Implement batch import/export features

## Support

For detailed technical information, see:
- `FARMER_PROFILE_INTEGRATION_GUIDE.md` - Full integration documentation
- `backend/farmer-profile-dashboard.js` - Source code documentation
- `backend/farmer-profile-routes.js` - API route documentation

## Summary

Your Fahamu Shamba system now has a complete farmer profile management solution that:

✅ Stores comprehensive farmer data in SQLite database
✅ Provides user-friendly web dashboard for profile management
✅ Includes REST API for programmatic access
✅ Tracks all changes via activity logs
✅ Calculates and displays profile completion
✅ Provides search and filtering capabilities
✅ Generates statistics and analytics
✅ Ensures data integrity with validation

Get started by accessing: `http://localhost:5000/farmer-profile-dashboard`
